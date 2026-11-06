import { NextResponse } from "next/server";
import { z } from "zod";
import { coreDb } from "@/lib/kracar/db";
import { quoteCar } from "@/lib/kracar/service";
import { fail } from "@/lib/api";
export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const data = z
      .object({
        city: z.string().max(100).optional(),
        category: z.string().max(40).optional(),
        transmission: z.string().max(40).optional(),
        fuel: z.string().max(40).optional(),
        agency: z.string().max(100).optional(),
        features: z.string().max(300).optional(),
        min: z.coerce.number().min(0).default(0),
        max: z.coerce.number().min(0).default(10000000),
        seats: z.coerce.number().int().min(1).max(9).default(1),
        page: z.coerce.number().int().min(1).max(10000).default(1),
        start: z.iso.datetime({ offset: true }).optional(),
        end: z.iso.datetime({ offset: true }).optional(),
        id: z.string().max(100).optional(),
        quote: z.string().optional(),
      })
      .parse(Object.fromEntries(p));
    if (data.quote && data.id && data.start && data.end) {
      const extras = JSON.parse(p.get("extras") || "{}");
      return NextResponse.json(
        await quoteCar(
          data.id,
          new Date(data.start),
          new Date(data.end),
          z.record(z.string(), z.number().int().min(0).max(10)).parse(extras),
        ),
      );
    }
    const where = {
      status: "published",
      agency: { status: "active" },
      ...(data.id ? { id: data.id } : {}),
      ...(data.city ? { city: data.city } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.transmission ? { transmission: data.transmission } : {}),
      ...(data.fuel ? { fuel: data.fuel } : {}),
      ...(data.agency ? { agencyId: data.agency } : {}),
      dailyRate: { gte: data.min, lte: data.max },
      seats: { gte: data.seats },
      ...(data.features
        ? { features: { hasEvery: data.features.split(",") } }
        : {}),
      ...(data.start && data.end
        ? {
            allocations: {
              none: {
                start: { lt: new Date(data.end) },
                end: { gt: new Date(data.start) },
              },
            },
          }
        : {}),
    };
    const db = coreDb();
    const [cars, total, agencies] = await Promise.all([
      db.vehicle.findMany({
        where,
        skip: (data.page - 1) * 9,
        take: 9,
        include: {
          agency: {
            select: {
              id: true,
              name: true,
              city: true,
              business: true,
              terms: true,
            },
          },
          rules: true,
        },
        orderBy: { dailyRate: "asc" },
      }),
      db.vehicle.count({ where }),
      db.agency.findMany({
        where: {
          status: "active",
          vehicles: { some: { status: "published" } },
        },
        select: { id: true, name: true },
      }),
    ]);
    const reviews = data.id
      ? await db.review.findMany({
          where: { vehicleId: data.id },
          select: { id: true, rating: true, comment: true, createdAt: true },
          take: 50,
        })
      : [];
    return NextResponse.json({
      cars,
      total,
      page: data.page,
      pages: Math.ceil(total / 9),
      agencies,
      reviews,
    });
  } catch {
    return fail(
      "The car catalogue is temporarily unavailable. Please retry.",
      503,
    );
  }
}
