import { localizeMetadata } from "@/i18n/server";
import { getTranslator } from "@/i18n/server";
import Image from "next/image";
import { Brand } from "@/components/ui";
import LoginForm from "@/components/login-form";
import { demoMode } from "@/lib/db";
export async function generateMetadata() {
  return localizeMetadata({ title: "Welcome to your workspace" });
}
export const dynamic = "force-dynamic";
export default async function Login() {
  const t = await getTranslator();
  return (
    <main tabIndex={-1} id="main-content" className="login-page">
      <section className="login-visual">
        <Image
          src="/images/marrakech.jpg"
          alt={t("Marrakech architecture in warm afternoon light")}
          fill
          priority
          sizes="50vw"
        />
        <Brand />
        <div>
          <div
            className="eyebrow"
            style={{ color: "var(--color-lime)", marginBottom: "1rem" }}
          >
            {t("For the people behind the journeys")}
          </div>
          <h2>
            {t("Local expertise.")}
            <br />
            {t("Limitless possibilities.")}
          </h2>
          <p>
            {t(
              "One calm workspace for your listings, your travelers, and everything that comes next.",
            )}
          </p>
        </div>
        <small>{t("Built for the way Morocco moves.")}</small>
      </section>
      <div className="login-content">
        <LoginForm demo={demoMode()} />
      </div>
    </main>
  );
}
