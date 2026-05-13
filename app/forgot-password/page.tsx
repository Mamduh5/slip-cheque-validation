import Link from "next/link";
import { PublicTrustLinks } from "@/components/public-trust-links";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export default async function ForgotPasswordPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h1 className="text-3xl font-semibold">{t("public.forgotPassword.title")}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{t("public.forgotPassword.body")}</p>
        <Link
          className="mt-5 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
          href="/support"
        >
          {t("public.forgotPassword.supportLink")}
        </Link>
      </div>
      <div className="mt-5">
        <PublicTrustLinks locale={locale} />
      </div>
    </section>
  );
}
