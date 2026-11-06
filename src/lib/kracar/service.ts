import "server-only";
import {
  contractualFields,
  contractualVersion,
  platformPolicyVersion,
} from "./terms";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { coreDb, coreTransaction } from "./db";
import { requirePermission, type Actor } from "./auth";
import {
  assertBalanced,
  canTransition,
  defaultFees,
  rentalQuote,
  type FeeConfig,
  type RentalQuote,
} from "./pricing";
type Tx = Prisma.TransactionClient;
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const text = z.string().trim().min(1).max(500);
const amount = z.number().int().min(0).max(1000000000);
const positive = amount.refine((n) => n > 0);
const dates = {
  start: z.iso.datetime({ offset: true }).transform((s) => new Date(s)),
  end: z.iso.datetime({ offset: true }).transform((s) => new Date(s)),
};
const customer = z.object({
  name: text,
  email: z.email(),
  phone: text,
  address: z.string().max(1000).default(""),
  licence: z.string().max(100).default(""),
  ICE: z.string().max(30).default(""),
  driverName: z.string().max(160).default(""),
  billingName: z.string().max(160).default(""),
});
async function audit(
  tx: Tx,
  actor: Actor,
  action: string,
  recordId: string,
  agencyId?: string,
) {
  const event = await tx.auditEvent.create({
    data: { actorId: actor.id, action, recordId, agencyId },
  });
  await tx.backgroundJob.create({
    data: {
      id: event.id,
      kind: "notification",
      payload: json({ actorId: actor.id, agencyId, action, recordId }),
    },
  });
}
async function sequence(tx: Tx, agencyId: string, kind: string) {
  const year = new Date().getUTCFullYear();
  const counter = await tx.documentSequence.upsert({
    where: { id: `${agencyId}:${kind}:${year}` },
    create: { id: `${agencyId}:${kind}:${year}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${kind.toUpperCase()}-${year}-${String(counter.value).padStart(6, "0")}`;
}
async function ledger(
  tx: Tx,
  eventKey: string,
  agencyId: string,
  lines: { account: string; amount: number }[],
) {
  assertBalanced(lines);
  await tx.ledgerEntry.createMany({
    data: lines.map((l) => ({ ...l, eventKey, agencyId })),
  });
}
async function lock(tx: Tx, id: string) {
  await tx.documentSequence.upsert({
    where: { id: `lock:${id}` },
    create: { id: `lock:${id}`, value: 1 },
    update: { value: { increment: 1 } },
  });
}
async function assertAvailable(
  tx: Tx,
  vehicleId: string,
  start: Date,
  end: Date,
) {
  if (end <= start) throw new Error("Invalid dates.");
  if (
    await tx.availabilityBlock.findFirst({
      where: { vehicleId, start: { lt: end }, end: { gt: start } },
    })
  ) {
    throw Object.assign(
      new Error("This vehicle is unavailable for these dates."),
      { code: "AVAILABILITY_CONFLICT" },
    );
  }
}
async function fees(tx: Tx) {
  const config = await tx.platformConfig.findUnique({ where: { id: "fees" } });
  return config
    ? { ...defaultFees, ...(config.value as unknown as FeeConfig) }
    : defaultFees;
}
async function visibleBooking(tx: Tx, actor: Actor, id: string) {
  const b = await tx.booking.findUniqueOrThrow({ where: { id } });
  if (
    actor.role !== "platform" &&
    b.customerId !== actor.id &&
    b.agencyId !== actor.agencyId &&
    b.requestingAgencyId !== actor.agencyId
  )
    throw new Error("ACCESS_DENIED");
  return b;
}
async function ownedBooking(
  tx: Tx,
  actor: Actor,
  id: string,
  permission = "bookings",
) {
  const b = await tx.booking.findUniqueOrThrow({ where: { id } });
  requirePermission(actor, b.agencyId, permission);
  return b;
}
async function reserve(
  tx: Tx,
  b: {
    id: string;
    vehicleId: string;
    agencyId: string;
    start: Date;
    end: Date;
    source: string;
  },
) {
  await lock(tx, `vehicle:${b.vehicleId}`);
  await assertAvailable(tx, b.vehicleId, b.start, b.end);
  await tx.availabilityBlock.create({
    data: {
      vehicleId: b.vehicleId,
      agencyId: b.agencyId,
      bookingId: b.id,
      start: b.start,
      end: b.end,
      reason: b.source,
    },
  });
}
export async function quoteCar(
  vehicleId: string,
  start: Date,
  end: Date,
  extras: Record<string, number> = {},
) {
  const db = coreDb();
  const v = await db.vehicle.findFirstOrThrow({
    where: { id: vehicleId, status: "published", agency: { status: "active" } },
    include: { rules: true },
  });
  return rentalQuote(v, start, end, extras, {
    ...(await fees(db)),
    taxBps: Number((v.conditions as Record<string, string>).taxBps || 0),
  });
}
export async function command(actor: Actor, raw: unknown) {
  const input = z.object({ action: text }).passthrough().parse(raw);
  return coreTransaction(async (tx) => {
    const action = input.action;
    if (action === "agency.register") {
      const d = z
        .object({
          name: text,
          city: text,
          email: z.email(),
          business: z.record(z.string(), z.string().max(1000)),
        })
        .parse(input);
      if (actor.role !== "customer") throw new Error("ACCESS_DENIED");
      if (await tx.agencyMember.findFirst({ where: { userId: actor.id } }))
        throw new Error("An agency membership already exists.");
      const a = await tx.agency.create({
        data: {
          ...d,
          business: json(d.business),
          members: {
            create: { userId: actor.id, role: "admin", permissions: ["*"] },
          },
        },
      });
      await audit(tx, actor, action, a.id, a.id);
      return a;
    }
    if (action === "agency.profile") {
      const d = z
        .object({
          id: text,
          name: text,
          city: text,
          email: z.email(),
          business: z.record(z.string(), z.string().max(1000)),
          terms: z.record(z.string(), z.string().max(12000)),
        })
        .parse(input);
      requirePermission(actor, d.id, "settings");
      const previous = await tx.agency.findUniqueOrThrow({
        where: { id: d.id },
      });
      const previousTerms = previous.terms as Record<string, string>;
      const changedTerms =
        contractualVersion(previousTerms, {}) !==
        contractualVersion(d.terms, {});
      const a = await tx.agency.update({
        where: { id: d.id },
        data: {
          name: d.name,
          city: d.city,
          email: d.email,
          business: json(d.business),
          terms: json({
            ...d.terms,
            _status: changedTerms
              ? "pending"
              : previousTerms._status || "pending",
            _submittedAt: changedTerms
              ? new Date().toISOString()
              : previousTerms._submittedAt || "",
          }),
        },
      });
      if (changedTerms)
        await tx.vehicle.updateMany({
          where: { agencyId: d.id, status: "published" },
          data: { status: "draft" },
        });
      await audit(tx, actor, action, a.id, a.id);
      return a;
    }
    if (action === "terms.review") {
      if (actor.role !== "platform") throw new Error("ACCESS_DENIED");
      const d = z.object({ id: text, approved: z.boolean() }).parse(input);
      const agency = await tx.agency.findUniqueOrThrow({
        where: { id: d.id },
      });
      if (
        d.approved &&
        !Object.entries(agency.terms as Record<string, string>).some(
          ([key, value]) => !key.startsWith("_") && value.trim().length >= 20,
        )
      )
        throw new Error("Complete partner conditions before approval.");
      const result = await tx.agency.update({
        where: { id: d.id },
        data: {
          terms: json({
            ...(agency.terms as Record<string, string>),
            _status: d.approved ? "approved" : "rejected",
            _reviewedAt: new Date().toISOString(),
            _reviewedBy: actor.id,
          }),
        },
      });
      await audit(tx, actor, action, d.id, d.id);
      return result;
    }
    if (action === "agency.verify") {
      const d = z
        .object({
          id: text,
          status: z.enum(["active", "rejected", "suspended"]),
          reason: text,
        })
        .parse(input);
      if (actor.role !== "platform") throw new Error("ACCESS_DENIED");
      if (
        d.status === "active" &&
        !(await tx.verificationDocument.findFirst({
          where: { agencyId: d.id, status: "approved" },
        }))
      )
        throw new Error(
          "Approve a verification document before activating this agency.",
        );
      const a = await tx.agency.update({
        where: { id: d.id },
        data: { status: d.status },
      });
      await audit(tx, actor, `${action}:${d.reason}`, a.id, a.id);
      return a;
    }
    if (action === "verification.review") {
      if (actor.role !== "platform") throw new Error("ACCESS_DENIED");
      const d = z
        .object({
          id: text,
          status: z.enum(["approved", "rejected"]),
          reason: text,
        })
        .parse(input);
      const doc = await tx.verificationDocument.update({
        where: { id: d.id },
        data: { status: d.status, reason: d.reason },
      });
      await audit(tx, actor, action, doc.id, doc.agencyId);
      return doc;
    }
    if (action === "member.save") {
      if (actor.role !== "platform" && !actor.permissions.includes("*"))
        throw new Error("ACCESS_DENIED");
      const d = z
        .object({
          email: z.email(),
          permissions: z.array(
            z.enum([
              "vehicles",
              "bookings",
              "contracts",
              "finance",
              "settings",
            ]),
          ),
          active: z.boolean().default(true),
        })
        .parse(input);
      requirePermission(actor, actor.agencyId || "", "settings");
      const user = await tx.user.findUniqueOrThrow({
        where: { email: d.email.toLowerCase() },
      });
      const m = await tx.agencyMember.upsert({
        where: {
          agencyId_userId: { agencyId: actor.agencyId!, userId: user.id },
        },
        create: {
          agencyId: actor.agencyId!,
          userId: user.id,
          permissions: d.permissions,
        },
        update: { permissions: d.permissions, active: d.active },
      });
      await audit(tx, actor, action, m.id, actor.agencyId);
      return m;
    }
    if (action === "vehicle.save") {
      const extra = z.object({
        id: text,
        name: text,
        price: amount,
        perDay: z.boolean(),
        max: z.number().int().min(1).max(10),
      });
      const d = z
        .object({
          id: text.optional(),
          agencyId: text.optional(),
          name: text,
          plate: text,
          city: text,
          category: z.enum(["economy", "compact", "suv", "premium", "van"]),
          transmission: z.enum(["manual", "automatic"]),
          fuel: z.enum(["diesel", "petrol", "hybrid", "electric"]),
          seats: z.number().int().min(2).max(9),
          features: z.array(text).max(20),
          dailyRate: positive,
          deposit: amount,
          weeklyDiscount: z.number().int().min(0).max(5000),
          monthlyRate: positive.nullable(),
          extras: z.array(extra).max(20),
          conditions: z.record(z.string(), z.string().max(4000)),
          images: z
            .array(
              z.object({
                src: z.string().max(200),
                description: z.string().max(160),
              }),
            )
            .max(6),
          status: z.enum(["published", "draft", "archived"]),
        })
        .parse(input);
      const agencyId = actor.role === "platform" ? d.agencyId : actor.agencyId;
      if (!agencyId) throw new Error("ACCESS_DENIED");
      requirePermission(actor, agencyId, "vehicles");
      const agency = await tx.agency.findUniqueOrThrow({
        where: { id: agencyId },
      });
      if (agency.status !== "active")
        throw new Error("Agency verification is required.");
      if (
        d.status === "published" &&
        (agency.terms as Record<string, string>)._status !== "approved"
      )
        throw new Error(
          "Contractual conditions must be approved before publishing an offer.",
        );
      for (const image of d.images) {
        if (image.src.startsWith("/api/rental-media/")) {
          const object = await tx.storageObject.findFirst({
            where: {
              id: image.src.split("/").pop(),
              agencyId,
              public: true,
              mime: { startsWith: "image/" },
            },
          });
          if (!object) throw new Error("ACCESS_DENIED");
        } else if (
          !/^\/images\/(duster|clio|fiat|tiguan)\.jpg$/.test(image.src)
        )
          throw new Error("Upload a vehicle photo first.");
      }
      const { id, ...data } = d;
      if (id) {
        const old = await tx.vehicle.findUniqueOrThrow({ where: { id } });
        requirePermission(actor, old.agencyId, "vehicles");
        if (old.agencyId !== agencyId)
          throw new Error("Agency reassignment is not allowed.");
      }
      const v = id
        ? await tx.vehicle.update({
            where: { id },
            data: {
              ...data,
              agencyId,
              images: json(d.images),
              extras: json(d.extras),
              conditions: json(d.conditions),
            },
          })
        : await tx.vehicle.create({
            data: {
              ...data,
              agencyId,
              images: json(d.images),
              extras: json(d.extras),
              conditions: json(d.conditions),
            },
          });
      await audit(tx, actor, action, v.id, agencyId);
      return v;
    }
    if (action === "pricing.rule") {
      const d = z
        .object({
          vehicleId: text,
          ...dates,
          dailyRate: positive,
          priority: z.number().int().min(0).max(100),
        })
        .parse(input);
      const v = await tx.vehicle.findUniqueOrThrow({
        where: { id: d.vehicleId },
      });
      requirePermission(actor, v.agencyId, "vehicles");
      if (d.end <= d.start) throw new Error("Invalid dates.");
      const rule = await tx.pricingRule.create({ data: d });
      await audit(tx, actor, action, rule.id, v.agencyId);
      return rule;
    }
    if (action === "booking.create") {
      const d = z
        .object({
          vehicleId: text,
          ...dates,
          customer,
          pickup: text,
          dropoff: text,
          source: z
            .enum(["marketplace", "direct", "b2b"])
            .default("marketplace"),
          extras: z.record(z.string(), z.number().int()).default({}),
          idempotencyKey: z.uuid(),
          recordedAmount: amount.optional(),
          acceptedTerms: z.literal(true).optional(),
          termsVersion: z.string().max(100000).optional(),
          quotedTotal: amount.optional(),
        })
        .parse(input);
      const previous = await tx.booking.findUnique({
        where: { idempotencyKey: d.idempotencyKey },
      });
      if (previous) {
        if (
          previous.customerId !== actor.id &&
          previous.agencyId !== actor.agencyId &&
          previous.requestingAgencyId !== actor.agencyId
        )
          throw new Error("ACCESS_DENIED");
        return previous;
      }
      const v = await tx.vehicle.findFirstOrThrow({
        where: {
          id: d.vehicleId,
          status: "published",
          agency: { status: "active" },
        },
        include: { rules: true, agency: true },
      });
      if (d.start.getTime() < Date.now() - 60000)
        throw new Error("Choose a future pickup time.");
      if (d.source === "marketplace" && actor.role !== "customer")
        throw new Error("Use a customer account for marketplace requests.");
      if (d.source === "direct")
        requirePermission(actor, v.agencyId, "bookings");
      if (d.source === "b2b") {
        if (
          actor.role !== "agency" ||
          !actor.agencyId ||
          actor.agencyId === v.agencyId
        )
          throw new Error("Choose another agency’s car.");
        requirePermission(actor, actor.agencyId, "bookings");
        if (
          (
            await tx.agency.findUniqueOrThrow({
              where: { id: actor.agencyId },
            })
          ).status !== "active"
        )
          throw new Error("Agency verification is required.");
      }
      const agreedTerms = v.agency.terms as Record<string, string>;
      const termsVersion = contractualVersion(
        agreedTerms,
        v.conditions as Record<string, string>,
      );
      if (
        d.source === "marketplace" &&
        (!d.acceptedTerms || d.termsVersion !== termsVersion)
      )
        throw new Error(
          "Rental conditions have changed. Reload and accept the current conditions.",
        );
      if (d.source === "marketplace" && agreedTerms._status !== "approved")
        throw new Error("This partner’s conditions are awaiting review.");
      const q = rentalQuote(
        v,
        d.start,
        d.end,
        d.extras,
        d.source === "marketplace"
          ? {
              ...(await fees(tx)),
              taxBps: Number(
                (v.conditions as Record<string, string>).taxBps || 0,
              ),
            }
          : {
              ...defaultFees,
              marketplace: false,
              taxBps: Number(
                (v.conditions as Record<string, string>).taxBps || 0,
              ),
            },
      );
      if (d.source === "marketplace" && d.quotedTotal !== q.total)
        throw new Error(
          "The price has changed. Reload and accept the updated quote.",
        );
      if (d.source === "direct" && d.recordedAmount !== undefined) {
        q.subtotal = d.recordedAmount;
        q.discount = 0;
        q.extras = 0;
        q.taxes = 0;
        q.partnerTotal = d.recordedAmount;
        q.total = d.recordedAmount;
        q.balance = d.recordedAmount;
        q.selectedExtras = [];
      }
      const b = await tx.booking.create({
        data: {
          reference: `KC-${randomUUID().slice(0, 8).toUpperCase()}`,
          idempotencyKey: d.idempotencyKey,
          customerId: d.source === "marketplace" ? actor.id : null,
          agencyId: v.agencyId,
          requestingAgencyId: d.source === "b2b" ? actor.agencyId : null,
          vehicleId: v.id,
          source: d.source,
          status: d.source === "direct" ? "approved" : "requested",
          start: d.start,
          end: d.end,
          customer: json(d.customer),
          pickup: d.pickup,
          dropoff: d.dropoff,
          quote: json({
            ...q,
            acceptedConditions: {
              terms: agreedTerms,
              conditions: v.conditions,
              version: termsVersion,
              platformVersion: platformPolicyVersion,
              acceptedAt: new Date().toISOString(),
              acceptedBy: actor.id,
              consent: d.acceptedTerms === true,
            },
            vehicle: {
              name: v.name,
              plate: v.plate,
              conditions: v.conditions,
            },
            agency: { name: v.agency.name, business: v.agency.business },
            responsibility:
              d.source === "b2b"
                ? "Supplying agency issues the rental contract and rental invoice and receives payment; requesting agency coordinates the external client. No B2B commission is configured."
                : "Agency issues the rental invoice and contract; KraCar separately invoices any platform service fee.",
          }),
        },
      });
      if (d.source === "direct") await reserve(tx, b);
      await tx.securityDeposit.create({
        data: { agencyId: b.agencyId, bookingId: b.id, required: q.deposit },
      });
      await audit(tx, actor, action, b.id, b.agencyId);
      return b;
    }
    if (action === "booking.transition") {
      const d = z
        .object({
          id: text,
          status: z.enum([
            "approved",
            "declined",
            "in_progress",
            "completed",
            "cancelled",
          ]),
          version: z.number().int().positive(),
        })
        .parse(input);
      await lock(tx, `booking:${d.id}`);
      const b = await ownedBooking(tx, actor, d.id);
      if (b.version !== d.version || !canTransition(b.status, d.status))
        throw new Error("Booking transition conflicts with its current state.");
      if (d.status === "in_progress" && b.source === "marketplace") {
        const quote = b.quote as unknown as RentalQuote;
        const verified = await tx.payment.findMany({
          where: { bookingId: b.id, verification: "provider_verified" },
        });
        if (
          verified.reduce((sum, p) => sum + p.amount - p.refunded, 0) <
          quote.prepayment
        )
          throw new Error(
            "The advance and platform fee must be confirmed by the payment provider before starting the rental.",
          );
      }
      if (d.status === "approved") await reserve(tx, b);
      if (d.status === "cancelled")
        await tx.availabilityBlock.deleteMany({ where: { bookingId: b.id } });
      const updated = await tx.booking.update({
        where: { id: b.id },
        data: { status: d.status, version: { increment: 1 } },
      });
      if (b.customerId)
        await tx.notification.create({
          data: {
            userId: b.customerId,
            message: `${b.reference}: ${d.status}`,
          },
        });
      await audit(tx, actor, action, b.id, b.agencyId);
      return updated;
    }
    if (action === "booking.cancel-request") {
      const d = z.object({ id: text, reason: text }).parse(input);
      const b = await visibleBooking(tx, actor, d.id);
      if (
        actor.role !== "customer" ||
        b.customerId !== actor.id ||
        !["requested", "approved"].includes(b.status)
      )
        throw new Error("ACCESS_DENIED");
      await audit(tx, actor, action, b.id, b.agencyId);
      return tx.booking.update({
        where: { id: b.id },
        data: {
          cancellation: json({
            reason: d.reason,
            requestedAt: new Date().toISOString(),
            policy: (b.quote as unknown as RentalQuote).policyVersion,
          }),
          version: { increment: 1 },
        },
      });
    }
    if (action === "block.create") {
      const d = z
        .object({ vehicleId: text, ...dates, reason: text })
        .parse(input);
      const v = await tx.vehicle.findUniqueOrThrow({
        where: { id: d.vehicleId },
      });
      requirePermission(actor, v.agencyId, "bookings");
      if (d.end <= d.start) throw new Error("Invalid dates.");
      await lock(tx, `vehicle:${v.id}`);
      await assertAvailable(tx, v.id, d.start, d.end);
      const block = await tx.availabilityBlock.create({
        data: { ...d, agencyId: v.agencyId },
      });
      await audit(tx, actor, action, block.id, v.agencyId);
      return block;
    }
    if (action === "block.delete") {
      const d = z.object({ id: text }).parse(input);
      const b = await tx.availabilityBlock.findUniqueOrThrow({
        where: { id: d.id },
      });
      requirePermission(actor, b.agencyId, "bookings");
      if (b.bookingId)
        throw new Error("Change the rental status to release this interval.");
      await audit(tx, actor, action, b.id, b.agencyId);
      return tx.availabilityBlock.delete({ where: { id: b.id } });
    }
    if (action === "contract.prepare") {
      const d = z
        .object({
          bookingId: text,
          language: z.enum(["fr", "ar", "en"]),
          clauses: z.string().min(20).max(12000),
        })
        .parse(input);
      const b = await ownedBooking(tx, actor, d.bookingId, "contracts");
      if (!["approved", "in_progress", "completed"].includes(b.status))
        throw new Error("Approve the rental before preparing a contract.");
      await lock(tx, `contract:${b.id}`);
      const old = await tx.rentalContract.findUnique({
        where: {
          agencyId_bookingId: { agencyId: b.agencyId, bookingId: b.id },
        },
      });
      const c = old
        ? await tx.rentalContract.update({
            where: { id: old.id },
            data: { currentVersion: { increment: 1 }, status: "draft" },
          })
        : await tx.rentalContract.create({
            data: {
              agencyId: b.agencyId,
              bookingId: b.id,
              number: await sequence(tx, b.agencyId, "ctr"),
            },
          });
      await tx.contractVersion.create({
        data: {
          contractId: c.id,
          version: c.currentVersion,
          language: d.language,
          snapshot: json({
            booking: b,
            clauses: (() => {
              const accepted = (b.quote as Record<string, unknown>)
                .acceptedConditions as
                | { terms?: Record<string, string>; consent?: boolean }
                | undefined;
              if (!accepted?.consent) return d.clauses;
              const terms = accepted.terms || {};
              return [
                terms[d.language] || terms.fr || "",
                ...contractualFields
                  .filter(([key]) => terms[key])
                  .map(([key, label]) => label + ": " + terms[key]),
              ]
                .filter(Boolean)
                .join("\n\n");
            })(),
            reviewRequired: true,
            signatureNotice:
              "Captured acknowledgments are not qualified electronic signatures.",
          }),
        },
      });
      await audit(tx, actor, action, c.id, b.agencyId);
      return c;
    }
    if (action === "contract.sign") {
      const d = z
        .object({
          versionId: text,
          party: z.enum(["customer", "agency"]),
          signer: text,
          evidence: z.string().min(2).max(2000),
          consent: z.literal(true),
          captureMode: z.enum(["account", "in_person"]).default("account"),
        })
        .parse(input);
      const version = await tx.contractVersion.findUniqueOrThrow({
        where: { id: d.versionId },
        include: { contract: true },
      });
      const b = await visibleBooking(tx, actor, version.contract.bookingId);
      if (version.version !== version.contract.currentVersion)
        throw new Error("Sign the latest version.");
      if (d.party === "agency")
        requirePermission(actor, b.agencyId, "contracts");
      else if (actor.role !== "customer" || b.customerId !== actor.id) {
        if (b.customerId || d.captureMode !== "in_person")
          throw new Error(
            "Only the rental customer can sign their agreement here.",
          );
        requirePermission(actor, b.agencyId, "contracts");
      }
      const s = await tx.signature.create({
        data: {
          versionId: version.id,
          party: d.party,
          signer: d.signer,
          evidence: d.evidence,
          actorId: actor.id,
        },
      });
      if (
        (await tx.signature.count({ where: { versionId: version.id } })) === 2
      )
        await tx.rentalContract.update({
          where: { id: version.contractId },
          data: { status: "signed" },
        });
      await audit(tx, actor, action, s.id, b.agencyId);
      return s;
    }
    if (action === "handover.save") {
      const d = z
        .object({
          bookingId: text,
          kind: z.enum(["pickup", "return"]),
          mileage: amount,
          fuel: text,
          equipment: text,
          damage: z
            .array(
              z.object({
                area: text,
                note: text,
                photoId: z.string().optional(),
              }),
            )
            .max(30),
          notes: z.string().max(3000),
        })
        .parse(input);
      const b = await ownedBooking(tx, actor, d.bookingId, "contracts");
      if (!["approved", "in_progress", "completed"].includes(b.status))
        throw new Error("Rental is not approved.");
      for (const damage of d.damage) {
        if (
          damage.photoId &&
          !(await tx.storageObject.findFirst({
            where: {
              id: damage.photoId,
              agencyId: b.agencyId,
              public: false,
              mime: { startsWith: "image/" },
            },
          }))
        )
          throw new Error("ACCESS_DENIED");
      }
      if (d.kind === "return") {
        const pickup = await tx.handoverReport.findUnique({
          where: { bookingId_kind: { bookingId: b.id, kind: "pickup" } },
        });
        if (!pickup || d.mileage < pickup.mileage)
          throw new Error("Record pickup first and check return mileage.");
      }
      const r = await tx.handoverReport.create({
        data: {
          ...d,
          agencyId: b.agencyId,
          actorId: actor.id,
          damage: json(d.damage),
        },
      });
      await audit(tx, actor, action, r.id, b.agencyId);
      return r;
    }
    if (action === "template.save") {
      const d = z
        .object({
          name: text,
          language: z.enum(["fr", "ar", "en"]),
          clauses: z.string().min(20).max(12000),
        })
        .parse(input);
      requirePermission(actor, actor.agencyId || "", "contracts");
      const r = await tx.contractTemplate.create({
        data: { ...d, agencyId: actor.agencyId! },
      });
      await audit(tx, actor, action, r.id, actor.agencyId);
      return r;
    }
    if (action === "document.prepare") {
      const d = z
        .object({
          bookingId: text,
          kind: z.enum(["quotation", "invoice", "proforma"]),
          issuer: z.enum(["agency", "platform"]).default("agency"),
          dueAt: z.iso.datetime({ offset: true }).transform((s) => new Date(s)),
        })
        .parse(input);
      const b = await ownedBooking(tx, actor, d.bookingId, "finance");
      if (d.issuer === "platform" && actor.role !== "platform")
        throw new Error("ACCESS_DENIED");
      if (
        d.kind === "invoice" &&
        !["approved", "in_progress", "completed"].includes(b.status)
      )
        throw new Error("Approve the rental before invoicing it.");
      const q = b.quote as unknown as RentalQuote;
      const total =
        d.issuer === "platform" ? q.serviceFee : q.total - q.serviceFee;
      if (total <= 0)
        throw new Error("No billable amount is due from this issuer.");
      const issuerBusiness =
        d.issuer === "platform"
          ? (await tx.platformConfig.findUnique({ where: { id: "billing" } }))
              ?.value || {}
          : (await tx.agency.findUniqueOrThrow({ where: { id: b.agencyId } }))
              .business;
      const documentTaxBps =
        d.issuer === "platform"
          ? Number((issuerBusiness as Record<string, string>).taxBps || 0)
          : Number(
              (
                (b.quote as Record<string, unknown>).vehicle as {
                  conditions: Record<string, string>;
                }
              ).conditions.taxBps || 0,
            );
      const documentQuote = {
        ...q,
        agency: {
          name:
            d.issuer === "platform"
              ? "KraCar"
              : (
                  (b.quote as Record<string, unknown>).agency as {
                    name: string;
                  }
                ).name,
          business: issuerBusiness,
        },
      };
      const contractReference =
        (
          await tx.rentalContract.findUnique({
            where: {
              agencyId_bookingId: { agencyId: b.agencyId, bookingId: b.id },
            },
          })
        )?.number || "";
      const lineItems =
        d.issuer === "platform"
          ? [
              {
                description: "Service d’intermédiation KraCar — 5 %",
                quantity: 1,
                unitPrice: q.serviceFee,
                total: q.serviceFee,
              },
            ]
          : [
              ...q.dailyRates.map((rate, i) => ({
                description: "Location — jour " + (i + 1),
                quantity: 1,
                unitPrice: rate,
                total: rate,
              })),
              ...q.selectedExtras.map((extra) => ({
                description: extra.name,
                quantity: extra.quantity,
                unitPrice: extra.quantity ? extra.total / extra.quantity : 0,
                total: extra.total,
              })),
              ...(q.discount
                ? [
                    {
                      description: "Remise",
                      quantity: 1,
                      unitPrice: -q.discount,
                      total: -q.discount,
                    },
                  ]
                : []),
            ];
      const doc = await tx.financialDocument.create({
        data: {
          agencyId: b.agencyId,
          customerId: b.customerId,
          bookingId: b.id,
          kind: d.kind,
          issuer: d.issuer,
          total,
          dueAt: d.dueAt,
          snapshot: json({
            booking: b,
            quote: documentQuote,
            contractReference,
            lineItems,
            issuer: d.issuer,
            taxAmount: Math.round(
              (total * documentTaxBps) / (10000 + documentTaxBps),
            ),
            taxBps: documentTaxBps,
            professionalReviewRequired: true,
          }),
        },
      });
      await audit(tx, actor, action, doc.id, b.agencyId);
      return doc;
    }
    if (action === "document.issue") {
      const d = z.object({ id: text }).parse(input);
      await lock(tx, `document:${d.id}`);
      const doc = await tx.financialDocument.findUniqueOrThrow({
        where: { id: d.id },
      });
      requirePermission(actor, doc.agencyId, "finance");
      if (doc.issuer === "platform" && actor.role !== "platform")
        throw new Error("ACCESS_DENIED");
      if (doc.status !== "draft" || doc.kind === "proforma")
        throw new Error("Only a draft invoice or quotation can be issued.");
      if (doc.kind === "invoice") {
        const snapshot = doc.snapshot as {
          quote?: { agency?: { business?: Record<string, string> } };
          booking?: { customer?: { name?: string; address?: string } };
        };
        const business = snapshot.quote?.agency?.business;
        if (
          !business ||
          ["legalName", "address", "ICE", "IF", "TP", "taxRegime"].some(
            (key) => !business[key]?.trim(),
          )
        )
          throw new Error(
            "Complete issuer legal name, address, ICE, IF, professional tax and tax regime before issuing an invoice.",
          );
        if (
          !snapshot.booking?.customer?.name ||
          !snapshot.booking.customer.address
        )
          throw new Error(
            "Complete the client's identity and billing address before issuing an invoice.",
          );
      }
      const obligationKey =
        doc.kind === "invoice" ? `${doc.bookingId}:${doc.issuer}:rental` : null;
      const r = await tx.financialDocument.update({
        where: { id: doc.id },
        data: {
          status: "issued",
          number: await sequence(
            tx,
            doc.issuer === "platform" ? "platform" : doc.agencyId,
            doc.kind,
          ),
          issuedAt: new Date(),
          obligationKey,
        },
      });
      await audit(tx, actor, action, r.id, r.agencyId);
      return r;
    }
    if (action === "quotation.accept") {
      const d = z.object({ id: text }).parse(input);
      const doc = await tx.financialDocument.findUniqueOrThrow({
        where: { id: d.id },
      });
      if (
        actor.role !== "customer" ||
        doc.customerId !== actor.id ||
        doc.kind !== "quotation" ||
        doc.status !== "issued"
      )
        throw new Error("ACCESS_DENIED");
      const r = await tx.financialDocument.update({
        where: { id: doc.id },
        data: { status: "accepted" },
      });
      await audit(tx, actor, action, r.id, r.agencyId);
      return r;
    }
    if (action === "credit.issue") {
      const d = z
        .object({ invoiceId: text, amount: positive, reason: text })
        .parse(input);
      await lock(tx, `document:${d.invoiceId}`);
      const inv = await tx.financialDocument.findUniqueOrThrow({
        where: { id: d.invoiceId },
      });
      requirePermission(actor, inv.agencyId, "finance");
      if (inv.issuer === "platform" && actor.role !== "platform")
        throw new Error("ACCESS_DENIED");
      if (
        inv.kind !== "invoice" ||
        inv.status === "draft" ||
        d.amount > inv.total - inv.credited
      )
        throw new Error("Credit exceeds the remaining invoice amount.");
      const credit = await tx.financialDocument.create({
        data: {
          agencyId: inv.agencyId,
          customerId: inv.customerId,
          bookingId: inv.bookingId,
          kind: "credit",
          issuer: inv.issuer,
          status: "issued",
          number: await sequence(tx, inv.agencyId, "credit"),
          originalId: inv.id,
          total: d.amount,
          dueAt: new Date(),
          issuedAt: new Date(),
          snapshot: json({ original: inv.number, reason: d.reason }),
        },
      });
      await tx.financialDocument.update({
        where: { id: inv.id },
        data: { credited: { increment: d.amount } },
      });
      await audit(tx, actor, action, credit.id, inv.agencyId);
      return credit;
    }
    if (action === "payment.record" || action === "payment.demo") {
      const d = z
        .object({
          invoiceId: text,
          amount: positive,
          method: z
            .enum(["cash", "bank", "cashplus", "card", "wallet"])
            .default("cash"),
          reference: text,
          eventKey: z.uuid(),
        })
        .parse(input);
      const existing = await tx.payment.findUnique({
        where: { eventKey: d.eventKey },
        include: { allocations: true },
      });
      if (existing) {
        if (
          existing.recordedBy !== actor.id ||
          existing.amount !== d.amount ||
          !existing.allocations.some((a) => a.invoiceId === d.invoiceId)
        )
          throw new Error("ACCESS_DENIED");
        return existing;
      }
      await lock(tx, `document:${d.invoiceId}`);
      const inv = await tx.financialDocument.findUniqueOrThrow({
        where: { id: d.invoiceId },
      });
      const replay = await tx.payment.findUnique({
        where: { eventKey: d.eventKey },
        include: { allocations: true },
      });
      if (replay) {
        if (
          replay.recordedBy !== actor.id ||
          replay.amount !== d.amount ||
          !replay.allocations.some((a) => a.invoiceId === d.invoiceId)
        )
          throw new Error("ACCESS_DENIED");
        return replay;
      }
      const demo = action === "payment.demo";
      if (demo) {
        if (
          process.env.DEMO_MODE !== "true" ||
          process.env.NODE_ENV === "production"
        )
          throw new Error("Demo payments are disabled.");
        if (actor.role !== "customer" || inv.customerId !== actor.id)
          throw new Error("ACCESS_DENIED");
      } else requirePermission(actor, inv.agencyId, "finance");
      if (
        inv.status === "draft" ||
        inv.kind !== "invoice" ||
        d.amount > Math.max(0, inv.total - inv.credited - inv.paid)
      )
        throw new Error("Payment exceeds the invoice balance.");
      if (!demo && ["card", "cashplus"].includes(d.method) && !d.reference)
        throw new Error("Add a payment reference.");
      const p = await tx.payment.create({
        data: {
          agencyId: inv.agencyId,
          customerId: inv.customerId,
          bookingId: inv.bookingId,
          amount: d.amount,
          method: d.method,
          verification: demo ? "simulated" : "manually_recorded",
          reference: d.reference,
          recipient: inv.issuer,
          recordedBy: actor.id,
          eventKey: d.eventKey,
          allocations: { create: { invoiceId: inv.id, amount: d.amount } },
        },
      });
      await tx.financialDocument.update({
        where: { id: inv.id },
        data: { paid: { increment: d.amount } },
      });
      const receipt = await tx.financialDocument.create({
        data: {
          agencyId: inv.agencyId,
          customerId: inv.customerId,
          bookingId: inv.bookingId,
          kind: "receipt",
          issuer: inv.issuer,
          status: "issued",
          number: await sequence(tx, inv.agencyId, "receipt"),
          total: d.amount,
          dueAt: new Date(),
          issuedAt: new Date(),
          originalId: p.id,
          snapshot: json({ payment: p, invoiceNumber: inv.number }),
        },
      });
      await ledger(tx, `payment:${p.id}`, inv.agencyId, [
        { account: `${inv.issuer}:${d.method}`, amount: d.amount },
        { account: `${inv.issuer}:rental_collections`, amount: -d.amount },
      ]);
      await audit(tx, actor, action, p.id, inv.agencyId);
      return { payment: p, receipt };
    }
    if (action === "refund.request") {
      const d = z
        .object({
          paymentId: text,
          amount: positive,
          reason: text,
          eventKey: z.uuid(),
        })
        .parse(input);
      await lock(tx, `payment:${d.paymentId}`);
      const p = await tx.payment.findUniqueOrThrow({
        where: { id: d.paymentId },
      });
      if (actor.role === "customer") {
        if (p.customerId !== actor.id) throw new Error("ACCESS_DENIED");
      } else requirePermission(actor, p.agencyId, "finance");
      const pending = await tx.refund.aggregate({
        where: { paymentId: p.id, status: "requested" },
        _sum: { amount: true },
      });
      if (d.amount > p.amount - p.refunded - (pending._sum.amount || 0))
        throw new Error("Refund exceeds the refundable payment.");
      const r = await tx.refund.create({
        data: { ...d, agencyId: p.agencyId, requestedBy: actor.id },
      });
      await audit(tx, actor, action, r.id, p.agencyId);
      return r;
    }
    if (action === "refund.approve") {
      const d = z.object({ id: text, reference: text }).parse(input);
      const r = await tx.refund.findUniqueOrThrow({ where: { id: d.id } });
      requirePermission(actor, r.agencyId, "finance");
      await lock(tx, `payment:${r.paymentId}`);
      const p = await tx.payment.findUniqueOrThrow({
        where: { id: r.paymentId },
        include: { allocations: true },
      });
      if (r.status !== "requested" || r.amount > p.amount - p.refunded)
        throw new Error("Refund is no longer available.");
      await tx.payment.update({
        where: { id: p.id },
        data: { refunded: { increment: r.amount } },
      });
      for (const a of p.allocations) {
        await tx.financialDocument.update({
          where: { id: a.invoiceId },
          data: { paid: { decrement: r.amount } },
        });
      }
      const result = await tx.refund.update({
        where: { id: r.id },
        data: {
          status: "recorded",
          approvedBy: actor.id,
          reason: `${r.reason}\nRecorded refund reference: ${d.reference}`,
        },
      });
      await ledger(tx, `refund:${r.id}`, r.agencyId, [
        { account: `${p.recipient}:${p.method}`, amount: -r.amount },
        { account: `${p.recipient}:rental_collections`, amount: r.amount },
      ]);
      await audit(tx, actor, action, r.id, r.agencyId);
      return result;
    }
    if (action === "deposit.update") {
      const d = z
        .object({
          bookingId: text,
          operation: z.enum(["receive", "retain", "refund", "release"]),
          amount: amount,
          reason: text,
          evidenceId: z.string().optional(),
        })
        .parse(input);
      const b = await ownedBooking(tx, actor, d.bookingId, "finance");
      await lock(tx, `deposit:${b.id}`);
      const dep = await tx.securityDeposit.findUniqueOrThrow({
        where: { bookingId: b.id },
      });
      const data: {
        received?: number;
        retained?: number;
        refunded?: number;
        status: string;
        evidence?: Prisma.InputJsonValue;
      } = { status: dep.status };
      if (d.operation === "receive") {
        if (d.amount > dep.required - dep.received)
          throw new Error("Deposit exceeds required amount.");
        data.received = dep.received + d.amount;
        data.status = "received";
      }
      if (d.operation === "retain") {
        if (d.amount > dep.received - dep.retained - dep.refunded)
          throw new Error("Insufficient deposit.");
        if (
          !(await tx.rentalContract.findUnique({
            where: {
              agencyId_bookingId: { agencyId: b.agencyId, bookingId: b.id },
            },
          }))
        )
          throw new Error("Link deductions to a rental contract.");
        data.retained = dep.retained + d.amount;
        data.status = "partially_retained";
      }
      if (d.operation === "refund") {
        if (d.amount > dep.received - dep.retained - dep.refunded)
          throw new Error("Insufficient deposit.");
        data.refunded = dep.refunded + d.amount;
        data.status =
          data.refunded + dep.retained === dep.received
            ? "refunded"
            : "partially_refunded";
      }
      if (d.operation === "release") {
        if (dep.received - dep.retained - dep.refunded > 0)
          throw new Error("Record the deposit refund before releasing.");
        data.status = "released";
      }
      data.evidence = json([
        ...(Array.isArray(dep.evidence) ? dep.evidence : []),
        { ...d, actorId: actor.id, at: new Date().toISOString() },
      ]);
      const r = await tx.securityDeposit.update({
        where: { id: dep.id },
        data,
      });
      await audit(tx, actor, action, dep.id, b.agencyId);
      return r;
    }
    if (action === "review.create") {
      const d = z
        .object({
          bookingId: text,
          rating: z.number().int().min(1).max(5),
          comment: z.string().trim().min(5).max(2000),
        })
        .parse(input);
      const b = await visibleBooking(tx, actor, d.bookingId);
      if (
        actor.role !== "customer" ||
        b.customerId !== actor.id ||
        b.status !== "completed"
      )
        throw new Error(
          "Only completed rentals can be reviewed by their customer.",
        );
      return tx.review.create({
        data: { ...d, customerId: actor.id, vehicleId: b.vehicleId },
      });
    }
    if (action === "account.consent") {
      const d = z
        .object({
          accepted: z.literal(true),
          version: z.literal(platformPolicyVersion),
        })
        .parse(input);
      return tx.auditEvent.create({
        data: {
          actorId: actor.id,
          action,
          recordId: actor.id,
          details: json({
            ...d,
            acceptedAt: new Date().toISOString(),
            marketing: false,
          }),
        },
      });
    }
    if (action === "billing.save") {
      if (actor.role !== "platform") throw new Error("ACCESS_DENIED");
      const d = z
        .object({ business: z.record(z.string(), z.string().max(1000)) })
        .parse(input);
      const result = await tx.platformConfig.upsert({
        where: { id: "billing" },
        create: { id: "billing", value: json(d.business) },
        update: { value: json(d.business) },
      });
      await audit(tx, actor, action, "billing.save", "billing");
      return result;
    }
    if (action === "fees.save") {
      if (actor.role !== "platform") throw new Error("ACCESS_DENIED");
      const d = z
        .object({
          demoTierFee: z.boolean(),
          oneDayPrepayment: z.boolean(),
          taxBps: z.number().int().min(0).max(3000),
          policyVersion: text,
        })
        .parse(input);
      const r = await tx.platformConfig.upsert({
        where: { id: "fees" },
        create: { id: "fees", value: json(d) },
        update: { value: json(d) },
      });
      await audit(tx, actor, action, "fees");
      return r;
    }
    if (action === "wallet.deposit-request") {
      const d = z.object({ amount: positive, reference: text }).parse(input);
      requirePermission(actor, actor.agencyId || "", "finance");
      const r = await tx.walletRequest.create({
        data: {
          agencyId: actor.agencyId!,
          kind: "deposit",
          amount: d.amount,
          reference: d.reference,
          requestedBy: actor.id,
        },
      });
      await audit(tx, actor, action, r.id, actor.agencyId);
      return r;
    }
    if (action === "wallet.approve-deposit") {
      if (actor.role !== "platform") throw new Error("ACCESS_DENIED");
      const d = z.object({ id: text, reference: text }).parse(input);
      await lock(tx, `wallet-request:${d.id}`);
      const r = await tx.walletRequest.findUniqueOrThrow({
        where: { id: d.id },
      });
      if (
        r.status !== "requested" ||
        r.kind !== "deposit" ||
        r.requestedBy === actor.id
      )
        throw new Error("A separate administrator must approve this request.");
      await ledger(tx, `wallet-deposit:${r.id}`, r.agencyId, [
        { account: `${r.agencyId}:wallet_available`, amount: r.amount },
        { account: `${r.agencyId}:wallet_clearing`, amount: -r.amount },
      ]);
      const result = await tx.walletRequest.update({
        where: { id: r.id },
        data: {
          status: "recorded",
          approvedBy: actor.id,
          reference: d.reference,
        },
      });
      await audit(tx, actor, action, r.id, r.agencyId);
      return result;
    }
    if (action === "wallet.payout-request") {
      const d = z.object({ amount: positive, reference: text }).parse(input);
      requirePermission(actor, actor.agencyId || "", "finance");
      const agencyId = actor.agencyId!;
      await lock(tx, `wallet:${agencyId}`);
      const sum = await tx.ledgerEntry.aggregate({
        where: { agencyId, account: `${agencyId}:wallet_available` },
        _sum: { amount: true },
      });
      if (d.amount > (sum._sum.amount || 0))
        throw new Error("Insufficient available wallet balance.");
      const r = await tx.payout.create({
        data: {
          agencyId,
          amount: d.amount,
          reference: d.reference,
          recordedBy: actor.id,
        },
      });
      await ledger(tx, `payout-hold:${r.id}`, agencyId, [
        { account: `${agencyId}:wallet_available`, amount: -d.amount },
        { account: `${agencyId}:wallet_held`, amount: d.amount },
      ]);
      await audit(tx, actor, action, r.id, agencyId);
      return r;
    }
    if (action === "wallet.payout-record") {
      if (actor.role !== "platform") throw new Error("ACCESS_DENIED");
      const d = z
        .object({
          id: text,
          reference: text,
          cancel: z.boolean().default(false),
        })
        .parse(input);
      await lock(tx, `payout:${d.id}`);
      const r = await tx.payout.findUniqueOrThrow({ where: { id: d.id } });
      if (r.status !== "requested") throw new Error("Payout already handled.");
      await ledger(tx, `payout-result:${r.id}`, r.agencyId, [
        { account: `${r.agencyId}:wallet_held`, amount: -r.amount },
        {
          account: `${r.agencyId}:${d.cancel ? "wallet_available" : "wallet_clearing"}`,
          amount: r.amount,
        },
      ]);
      const result = await tx.payout.update({
        where: { id: r.id },
        data: {
          status: d.cancel ? "cancelled" : "recorded_external_transfer",
          reference: d.reference,
        },
      });
      await audit(tx, actor, action, r.id, r.agencyId);
      return result;
    }
    if (action === "wallet.transfer") {
      const d = z
        .object({
          agencyId: text,
          amount: positive,
          eventKey: z.uuid(),
          reference: text,
        })
        .parse(input);
      requirePermission(actor, actor.agencyId || "", "finance");
      const source = actor.agencyId!;
      if (source === d.agencyId) throw new Error("Choose a different agency.");
      await tx.agency.findFirstOrThrow({
        where: { id: d.agencyId, status: "active" },
      });
      for (const key of [source, d.agencyId].sort())
        await lock(tx, `wallet:${key}`);
      if (await tx.ledgerEntry.findFirst({ where: { eventKey: d.eventKey } }))
        return { ok: true };
      const sum = await tx.ledgerEntry.aggregate({
        where: { agencyId: source, account: `${source}:wallet_available` },
        _sum: { amount: true },
      });
      if (d.amount > (sum._sum.amount || 0))
        throw new Error("Insufficient available wallet balance.");
      const lines = [
        {
          agencyId: source,
          account: `${source}:wallet_available`,
          amount: -d.amount,
        },
        {
          agencyId: d.agencyId,
          account: `${d.agencyId}:wallet_available`,
          amount: d.amount,
        },
      ];
      assertBalanced(lines);
      await tx.ledgerEntry.createMany({
        data: lines.map((l) => ({ ...l, eventKey: d.eventKey })),
      });
      await audit(tx, actor, `${action}:${d.reference}`, d.eventKey, source);
      return { ok: true };
    }
    if (action === "notification.read") {
      const d = z.object({ id: text }).parse(input);
      return tx.notification.updateMany({
        where: { id: d.id, userId: actor.id },
        data: { readAt: new Date() },
      });
    }
    throw new Error("Unknown operation.");
  });
}
export async function workspace(actor: Actor) {
  const db = coreDb();
  const agencyWhere =
    actor.role === "platform"
      ? {}
      : actor.role === "agency"
        ? { agencyId: actor.agencyId! }
        : { customerId: actor.id };
  const bookingWhere =
    actor.role === "agency"
      ? {
          OR: [
            { agencyId: actor.agencyId },
            { requestingAgencyId: actor.agencyId },
          ],
        }
      : agencyWhere;
  const financial =
    actor.role === "customer" ||
    actor.role === "platform" ||
    actor.permissions.some((p) => ["*", "finance"].includes(p));
  const [
    bookings,
    vehicles,
    documents,
    payments,
    refunds,
    deposits,
    contracts,
    blocks,
    agencies,
    members,
    templates,
    notifications,
    auditEvents,
    ledgerEntries,
    handovers,
    walletRequests,
    payouts,
    verificationDocuments,
    emailPreviews,
  ] = await Promise.all([
    db.booking.findMany({
      where: bookingWhere,
      orderBy: { start: "desc" },
      take: 300,
      include: { vehicle: true },
    }),
    db.vehicle.findMany({
      where:
        actor.role === "agency"
          ? { agencyId: actor.agencyId }
          : actor.role === "platform"
            ? {}
            : { id: { in: [] } },
      include: { rules: true },
    }),
    financial
      ? db.financialDocument.findMany({
          where: agencyWhere,
          orderBy: { createdAt: "desc" },
          take: 300,
        })
      : [],
    financial
      ? db.payment.findMany({
          where: agencyWhere,
          orderBy: { createdAt: "desc" },
          take: 300,
        })
      : [],
    financial
      ? db.refund.findMany({
          where:
            actor.role === "customer" ? { requestedBy: actor.id } : agencyWhere,
          take: 300,
        })
      : [],
    financial
      ? db.securityDeposit.findMany({
          where:
            actor.role === "customer"
              ? {
                  bookingId: {
                    in: (
                      await db.booking.findMany({
                        where: { customerId: actor.id },
                        select: { id: true },
                      })
                    ).map((b) => b.id),
                  },
                }
              : agencyWhere,
        })
      : [],
    db.rentalContract.findMany({
      where:
        actor.role === "customer"
          ? {
              bookingId: {
                in: (
                  await db.booking.findMany({
                    where: { customerId: actor.id },
                    select: { id: true },
                  })
                ).map((b) => b.id),
              },
            }
          : actor.role === "agency"
            ? { agencyId: actor.agencyId }
            : {},
      include: {
        versions: {
          include: { signatures: true },
          orderBy: { version: "desc" },
        },
      },
    }),
    actor.role === "customer"
      ? []
      : db.availabilityBlock.findMany({
          where: actor.role === "platform" ? {} : { agencyId: actor.agencyId },
          orderBy: { start: "asc" },
          take: 300,
        }),
    actor.role === "platform"
      ? db.agency.findMany()
      : actor.agencyId
        ? db.agency.findMany({ where: { id: actor.agencyId } })
        : [],
    actor.role === "agency" && actor.permissions.includes("*")
      ? db.agencyMember.findMany({ where: { agencyId: actor.agencyId } })
      : [],
    actor.role === "customer"
      ? []
      : db.contractTemplate.findMany({
          where: actor.role === "platform" ? {} : { agencyId: actor.agencyId },
        }),
    db.notification.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    actor.role === "platform"
      ? db.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
      : [],
    financial && actor.role !== "customer"
      ? db.ledgerEntry.findMany({
          where: actor.role === "platform" ? {} : { agencyId: actor.agencyId },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : [],
    actor.role === "customer"
      ? []
      : db.handoverReport.findMany({
          where: actor.role === "platform" ? {} : { agencyId: actor.agencyId },
        }),
    financial && actor.role !== "customer"
      ? db.walletRequest.findMany({
          where: actor.role === "platform" ? {} : { agencyId: actor.agencyId },
        })
      : [],
    financial && actor.role !== "customer"
      ? db.payout.findMany({
          where: actor.role === "platform" ? {} : { agencyId: actor.agencyId },
        })
      : [],
    actor.role === "customer"
      ? []
      : db.verificationDocument.findMany({
          where: actor.role === "platform" ? {} : { agencyId: actor.agencyId },
        }),
    actor.role === "platform" && process.env.NODE_ENV !== "production"
      ? db.emailPreview.findMany({ orderBy: { createdAt: "desc" }, take: 50 })
      : [],
  ]);
  const read = (permission: string) =>
    actor.role !== "agency" ||
    actor.permissions.includes("*") ||
    actor.permissions.includes(permission);
  return {
    actor,
    bookings: read("bookings")
      ? bookings.map((b) =>
          b.source === "b2b" &&
          actor.agencyId === b.agencyId &&
          b.status === "requested"
            ? {
                ...b,
                customer: { name: "Client details available after approval" },
              }
            : b,
        )
      : [],
    vehicles: read("vehicles") ? vehicles : [],
    documents,
    payments,
    refunds,
    deposits,
    contracts: read("contracts") ? contracts : [],
    blocks: read("bookings") ? blocks : [],
    agencies: read("settings")
      ? agencies
      : agencies.map((a) => ({ ...a, business: {} })),
    members,
    templates: read("contracts") ? templates : [],
    notifications,
    auditEvents,
    ledgerEntries,
    handovers: read("contracts") ? handovers : [],
    walletRequests,
    payouts,
    verificationDocuments: read("settings") ? verificationDocuments : [],
    emailPreviews,
  };
}
