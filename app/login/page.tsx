import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { PublicTrustLinks } from "@/components/public-trust-links";
import { isGoogleAuthConfigured } from "@/lib/env";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export default async function LoginPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">{t("public.login.title")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("public.login.intro")}</p>
      </div>
      <Suspense
        fallback={<div className="rounded-lg border border-line bg-white p-5 shadow-sm">{t("common.actions.loading")}</div>}
      >
        <LoginForm googleEnabled={isGoogleAuthConfigured()} locale={locale} />
      </Suspense>
      <p className="mt-5 text-center text-sm text-slate-600">
        {t("public.login.noAccount")}{" "}
        <Link className="font-medium text-accent hover:text-accent-dark" href="/register">
          {t("navigation.register")}
        </Link>
      </p>
      <div className="mt-5">
        <PublicTrustLinks locale={locale} />
      </div>
    </section>
  );
}
