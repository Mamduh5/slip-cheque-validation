import Link from "next/link";
import { PublicTrustLinks } from "@/components/public-trust-links";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export default async function HomePage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const steps = [
    ["public.home.steps.upload.title", "public.home.steps.upload.body"],
    ["public.home.steps.check.title", "public.home.steps.check.body"],
    ["public.home.steps.decide.title", "public.home.steps.decide.body"]
  ] as const;

  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-20">
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">
          {t("public.home.eyebrow")}
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
          {t("public.home.title")}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">{t("public.home.intro")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className="rounded-md bg-accent px-5 py-3 text-center font-medium text-white hover:bg-accent-dark"
            href="/register"
          >
            {t("common.actions.createAccount")}
          </Link>
          <Link
            className="rounded-md border border-line bg-white px-5 py-3 text-center font-medium hover:border-slate-400"
            href="/login"
          >
            {t("common.actions.login")}
          </Link>
        </div>
      </div>
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="space-y-4">
          {steps.map(([titleKey, bodyKey]) => (
            <div className="rounded-md border border-line p-4" key={titleKey}>
              <h2 className="font-semibold">{t(titleKey)}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="md:col-span-2">
        <PublicTrustLinks locale={locale} />
      </div>
    </section>
  );
}
