import "server-only";
import { coreDb } from "./db";
import { requirePermission, type Actor } from "./auth";
import { mad } from "./time";
import { readFile } from "node:fs/promises";
import path from "node:path";
const escape = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
type Snapshot = {
  booking?: {
    reference: string;
    customer: {
      name: string;
      email: string;
      phone: string;
      licence: string;
      address: string;
      ICE?: string;
      driverName?: string;
      billingName?: string;
    };
    start: string;
    end: string;
    pickup: string;
    dropoff: string;
    quote: Quote;
  };
  quote?: Quote;
  clauses?: string;
  payment?: {
    amount: number;
    method: string;
    verification: string;
    reference: string;
    createdAt: string;
  };
  invoiceNumber?: string;
  original?: string;
  reason?: string;
  issuer?: string;
  taxAmount?: number;
  taxBps?: number;
  contractReference?: string;
  lineItems?: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
};
type Quote = {
  subtotal: number;
  extras: number;
  discount: number;
  taxes: number;
  serviceFee: number;
  total: number;
  prepayment: number;
  balance: number;
  deposit: number;
  days: number;
  advance?: number;
  partnerTotal?: number;
  vehicle: { name: string; plate: string; conditions: Record<string, string> };
  agency: { name: string; business: Record<string, string> };
};
export async function rentalDocument(
  actor: Actor,
  id: string,
  kind: string,
  language: string,
) {
  const db = coreDb(),
    ar = language === "ar";
  const labels = ar
    ? {
        contract: "عقد إيجار سيارة",
        invoice: "فاتورة إيجار",
        quotation: "عرض سعر",
        proforma: "فاتورة أولية غير نهائية",
        credit: "إشعار دائن",
        receipt: "إيصال أداء",
        customer: "العميل",
        agency: "وكالة الإيجار",
        vehicle: "السيارة",
        dates: "مدة الإيجار",
        total: "المجموع",
        deposit: "مبلغ الضمان المسترد — مستقل عن ثمن الإيجار",
        subtotal: "ثمن الإيجار",
        extras: "الإضافات",
        discount: "التخفيض",
        taxes: "الضرائب المهيأة",
        fee: "رسوم خدمة KraCar",
        paid: "المبلغ المدفوع",
        balance: "المبلغ المتبقي",
        version: "الإصدار",
        signatures: "التوقيعات المسجلة",
        notice:
          "نموذج قابل للتعديل يتطلب مراجعة مهنية. التوقيعات المسجلة ليست توقيعات إلكترونية مؤهلة.",
        draft: "مسودة — غير صادرة",
        date: "التاريخ",
        terms: "شروط الوكالة",
        simulation: "معاملة محاكاة — لا يتم تحريك أموال حقيقية",
        manual: "أداء مسجل يدويا وليس تأكيدا من مزود خدمة",
        reference: "المرجع",
      }
    : {
        contract: "Contrat de location",
        invoice: "Facture de location",
        quotation: "Devis",
        proforma: "Pro forma — non fiscale",
        credit: "Avoir",
        receipt: "Reçu de paiement",
        customer: "Client",
        agency: "Agence de location",
        vehicle: "Véhicule",
        dates: "Période de location",
        total: "Total",
        deposit:
          "Dépôt de garantie remboursable — distinct du prix de location",
        subtotal: "Location",
        extras: "Options",
        discount: "Remise",
        taxes: "Taxes configurées",
        fee: "Frais de service KraCar",
        paid: "Paiements reçus",
        balance: "Solde",
        version: "Version",
        signatures: "Signatures enregistrées",
        notice:
          "Modèle configurable soumis à revue professionnelle. Les signatures capturées ne sont pas des signatures électroniques qualifiées.",
        draft: "BROUILLON — NON ÉMIS",
        date: "Date",
        terms: "Clauses de l’agence",
        simulation: "TRANSACTION SIMULÉE — aucun mouvement d’argent réel",
        manual:
          "Paiement enregistré manuellement — non vérifié par un prestataire",
        reference: "Référence",
      };
  let snapshot: Snapshot,
    title: string,
    reference: string,
    status: string,
    total = 0,
    paid = 0,
    credited = 0,
    signatureHtml = "",
    agencyId: string,
    customerId: string | null;
  if (kind === "contract") {
    const version = await db.contractVersion.findUniqueOrThrow({
      where: { id },
      include: { contract: true, signatures: true },
    });
    const booking = await db.booking.findUniqueOrThrow({
      where: { id: version.contract.bookingId },
    });
    agencyId = booking.agencyId;
    customerId = booking.customerId;
    snapshot = version.snapshot as unknown as Snapshot;
    title = labels.contract;
    reference = `${version.contract.number} · ${labels.version} ${version.version}`;
    status = version.signatures.length === 2 ? "signed" : "draft";
    signatureHtml = `<h2>${labels.signatures}</h2>${version.signatures.map((s) => `<section class="signature"><strong>${escape(s.party)} — ${escape(s.signer)}</strong><p>${escape(s.evidence)}</p><small>${escape(s.signedAt.toISOString())}</small></section>`).join("")}<p>${escape(labels.notice)}</p>`;
  } else {
    const doc = await db.financialDocument.findUniqueOrThrow({ where: { id } });
    agencyId = doc.agencyId;
    customerId = doc.customerId;
    snapshot = doc.snapshot as unknown as Snapshot;
    title = labels[doc.kind as keyof typeof labels] || doc.kind;
    reference = doc.number || labels.draft;
    status = doc.status;
    total = doc.total;
    paid = doc.paid;
    credited = doc.credited;
    if (doc.issuer === "platform" && !snapshot.quote?.agency)
      snapshot = {
        ...snapshot,
        quote: snapshot.quote
          ? { ...snapshot.quote, agency: { name: "KraCar", business: {} } }
          : undefined,
      };
    if (doc.kind === "receipt" && doc.bookingId) {
      const b = await db.booking.findUniqueOrThrow({
        where: { id: doc.bookingId },
      });
      snapshot = { ...snapshot, booking: b as unknown as Snapshot["booking"] };
    }
  }
  if (actor.role === "customer") {
    if (customerId !== actor.id) throw new Error("ACCESS_DENIED");
  } else
    requirePermission(
      actor,
      agencyId,
      kind === "contract" ? "contracts" : "finance",
    );
  const b = snapshot.booking,
    q = snapshot.quote || b?.quote,
    agency = await db.agency.findUniqueOrThrow({ where: { id: agencyId } });
  const date = (s: string) =>
    new Intl.DateTimeFormat(ar ? "ar-MA" : "fr-MA", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Casablanca",
    }).format(new Date(s));
  const row = (label: string, value: unknown) =>
    `<tr><th>${escape(label)}</th><td>${escape(value)}</td></tr>`;
  let font = "";
  try {
    const bytes = await readFile(
      path.join(process.cwd(), "public/fonts/NotoNaskhArabic.ttf"),
    );
    font = `@font-face{font-family:KraArabic;src:url(data:font/ttf;base64,${bytes.toString("base64")}) format('truetype');}`;
  } catch {}
  const financial =
    kind === "contract"
      ? null
      : await db.financialDocument.findUnique({ where: { id } });
  const paymentRows =
    kind === "contract"
      ? []
      : await db.paymentAllocation.findMany({
          where: { invoiceId: id },
          include: { payment: true },
        });
  const taxAmount = snapshot.taxAmount ?? q?.taxes ?? 0;
  const billingDetails = [
    financial?.issuedAt
      ? row(labels.date, date(financial.issuedAt.toISOString()))
      : "",
    financial?.dueAt
      ? row(
          ar ? "تاريخ الاستحقاق" : "Échéance",
          date(financial.dueAt.toISOString()),
        )
      : "",
    b?.customer.ICE ? row("ICE", b.customer.ICE) : "",
    b?.customer.billingName
      ? row(
          ar ? "مستلم الفاتورة" : "Destinataire de la facture",
          b.customer.billingName,
        )
      : "",
    b?.customer.driverName
      ? row(ar ? "السائق" : "Conducteur", b.customer.driverName)
      : "",
  ]
    .filter(Boolean)
    .join("");
  const paymentDetails = paymentRows
    .map((a) =>
      row(
        a.payment.method +
          " · " +
          a.payment.reference +
          " · " +
          date(a.payment.createdAt.toISOString()),
        mad(a.amount, ar ? "ar-MA" : "fr-MA"),
      ),
    )
    .join("");
  const lineDetails =
    snapshot.lineItems
      ?.map(
        (line) =>
          "<tr><td>" +
          escape(line.description) +
          "</td><td>" +
          escape(line.quantity) +
          "</td><td>" +
          escape(mad(line.unitPrice, ar ? "ar-MA" : "fr-MA")) +
          "</td><td>" +
          escape(mad(line.total, ar ? "ar-MA" : "fr-MA")) +
          "</td></tr>",
      )
      .join("") || "";
  const lineTable = lineDetails
    ? "<table><thead><tr><th>" +
      (ar ? "الخدمة" : "Prestation") +
      "</th><th>" +
      (ar ? "الكمية" : "Quantité") +
      "</th><th>" +
      (ar ? "ثمن الوحدة شامل الضريبة" : "Prix unitaire TTC") +
      "</th><th>" +
      (ar ? "المجموع" : "Total TTC") +
      "</th></tr></thead><tbody>" +
      lineDetails +
      "</tbody></table>"
    : "";
  const amounts =
    kind === "contract" && q
      ? [
          [labels.subtotal, q.subtotal],
          [labels.extras, q.extras],
          [labels.discount, -q.discount],
          [labels.taxes, q.taxes],
          [labels.fee + " — 5%", q.serviceFee],
          [labels.total, q.total],
          [
            ar ? "التسبيق — 10٪" : "Avance sur la prestation — 10 %",
            q.advance ?? 0,
          ],
          [ar ? "المطلوب للتأكيد" : "À payer pour confirmer", q.prepayment],
          [labels.balance, q.balance],
          [labels.deposit, q.deposit],
        ]
      : snapshot.payment
        ? [[labels.total, total]]
        : snapshot.original
          ? [[labels.total, total]]
          : q
            ? [
                [ar ? "المبلغ دون الضريبة" : "Total HT", total - taxAmount],
                [
                  ar
                    ? "الضريبة على القيمة المضافة"
                    : `TVA (${(snapshot.taxBps ?? 0) / 100} %)`,
                  taxAmount,
                ],
                [labels.total, total],
                [labels.paid, paid],
                [labels.balance, Math.max(0, total - paid - credited)],
              ]
            : [[labels.total, total]];
  const html = `<!doctype html><html lang="${ar ? "ar" : "fr"}" dir="${ar ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${escape(reference)} · KraCar</title><style>${font}
  @page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:${ar ? "KraArabic," : ""}Arial,sans-serif;color:#101e38;font-size:${ar ? "13" : "11"}pt;line-height:1.6;margin:0}main{max-width:180mm;margin:auto}header{border-bottom:2px solid #007d7a;padding-bottom:12px;display:flex;justify-content:space-between;gap:12px}h1{font-size:21pt;margin:0}h2{font-size:14pt;margin-top:20px;break-after:avoid}p{margin:7px 0}table{border-collapse:collapse;width:100%;margin:15px 0}td,th{border-bottom:1px solid #dfe7e9;padding:7px;text-align:start;vertical-align:top}th{width:57%;font-weight:normal}tr{break-inside:avoid}.terms{white-space:pre-wrap;overflow-wrap:anywhere}.signature{border:1px solid #dfe7e9;padding:10px;margin-block:8px;break-inside:avoid}.note{background:#e9f6f6;padding:10px;margin-block:12px}footer{border-top:1px solid #dfe7e9;margin-top:25px;font-size:9pt;color:#526575}.print{margin:15px 0;padding:8px 15px}@media print{.print{display:none}}</style></head><body><main><button class="print" onclick="window.print()">${ar ? "طباعة / حفظ PDF" : "Imprimer / enregistrer PDF"}</button><header><div><strong>KraCar</strong><h1>${escape(title)}</h1><p>${escape(reference)}</p></div><div><strong>${escape(q?.agency?.business?.legalName || q?.agency?.name || agency.name)}</strong><p>${escape(q?.agency?.business?.address || (agency.business as Record<string, string>).address || agency.city)}</p>${Object.entries(
    q?.agency?.business || (agency.business as Record<string, string>),
  )
    .filter(([k]) =>
      ["ICE", "IF", "RC", "TP", "legalForm", "capital", "taxRegime"].includes(
        k,
      ),
    )
    .map(([k, v]) => `<p>${escape(k)}: ${escape(v)}</p>`)
    .join(
      "",
    )}</div></header>${status === "draft" ? `<p class="note">${escape(labels.draft)}</p>` : ""}${
    b
      ? `<h2>${labels.customer}</h2><p><strong>${escape(b.customer.name)}</strong> · ${escape(b.customer.email)} · ${escape(b.customer.phone)}</p><p>${escape(b.customer.address)}</p><h2>${labels.vehicle}</h2><p>${escape(q?.vehicle?.name)} · ${escape(q?.vehicle?.plate)}</p><table>${row(labels.reference, b.reference)}${row(labels.dates, `${date(b.start)} — ${date(b.end)} (Africa/Casablanca)`)}${row(ar ? "مكان التسليم والإرجاع" : "Lieux de remise et retour", `${b.pickup} → ${b.dropoff}`)}${
          kind === "contract"
            ? Object.entries(q?.vehicle?.conditions || {})
                .filter(([key]) => key !== "taxBps")
                .map(([k, v]) => row(k, v))
                .join("")
            : ""
        }</table>`
      : ""
  }<table>${billingDetails}${snapshot.contractReference ? row(labels.contract, snapshot.contractReference) : ""}</table>${lineTable}<table>${amounts.map(([label, value]) => row(String(label), mad(Number(value), ar ? "ar-MA" : "fr-MA"))).join("")}</table>${kind !== "contract" && q && !snapshot.payment ? `<p class="note">${escape(labels.deposit)}: ${escape(mad(q.deposit, ar ? "ar-MA" : "fr-MA"))}</p>` : ""}${snapshot.clauses ? `<h2>${labels.terms}</h2><div class="terms">${escape(snapshot.clauses)}</div>` : ""}${snapshot.reason ? `<p>${escape(snapshot.original)} — ${escape(snapshot.reason)}</p>` : ""}${snapshot.payment ? `<p class="note">${escape(snapshot.payment.verification === "simulated" ? labels.simulation : labels.manual)}</p><p>${escape(snapshot.payment.method)} · ${escape(snapshot.payment.reference)}</p>` : ""}${paymentDetails ? `<h2>${ar ? "الأداءات" : "Règlements"}</h2><table>${paymentDetails}</table>` : ""}${signatureHtml}<footer>${escape(reference)} · MAD · ${ar ? "وثيقة تشغيلية لا تمثل نظام محاسبة قانونية معتمدا" : "Document opérationnel — ne constitue pas une comptabilité statutaire certifiée"}</footer></main></body></html>`;
  return { html, reference };
}
