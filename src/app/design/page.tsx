import Dropdown from "@/components/dropdown";
import { getTranslator } from "@/i18n/server";
import { notFound } from "next/navigation";
import { Brand, Badge, Empty } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function Design() {
  const t = await getTranslator();
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main
      id="main-content"
      className="public-container stack"
      style={{ paddingTop: "2rem", paddingBottom: "3rem" }}
    >
      <Brand />
      <div>
        <div className="eyebrow">{t("Internal design reference")}</div>
        <h1 className="serif" style={{ fontSize: "3rem" }}>
          {t("A calmer kind of journey.")}
        </h1>
        <p className="muted">
          {t(
            "Original tokens and reusable primitives for the public and operations experiences.",
          )}
        </p>
      </div>
      <div className="card form-card stack">
        <h2>{t("Actions")}</h2>
        <div className="row wrap">
          <button className="button">{t("Primary action")}</button>
          <button className="button secondary">{t("Secondary action")}</button>
          <button className="button lime">{t("Highlight action")}</button>
          <button className="button danger">{t("Cancel request")}</button>
          <button className="button" disabled>
            {t("Saving\u2026")}
          </button>
        </div>
        <h2>{t("Status")}</h2>
        <div className="row wrap">
          {[
            "requested",
            "awaiting_payment",
            "confirmed",
            "completed",
            "cancelled",
            "active",
            "pending",
            "suspended",
            "archived",
          ].map((s) => (
            <Badge key={s} status={s} />
          ))}
        </div>
        <div className="field-grid">
          <label>
            {t("Name")}
            <input placeholder={t("Your full name")} />
          </label>
          <Dropdown label={<>{t("Destination")}</>}>
            <option value="Marrakech">{t("Marrakech")}</option>
            <option value="Agadir">{t("Agadir")}</option>
          </Dropdown>
          <label className="span-two">
            {t("Your message")}
            <textarea
              placeholder={t("A few details to make the journey yours.")}
            />
          </label>
        </div>
        <p className="error-note" role="alert">
          {t("Choose a future return date after pickup.")}
        </p>
        <p className="success-note">{t("Your request has been saved.")}</p>
      </div>
      <div className="card">
        <Empty
          title={t("The next chapter is yours")}
          description={t(
            "New reservation requests will appear here when travelers find your listing.",
          )}
        />
      </div>
    </main>
  );
}
