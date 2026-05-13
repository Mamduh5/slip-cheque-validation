import Link from "next/link";
import { PublicTrustLinks } from "@/components/public-trust-links";
import { RegisterForm } from "@/components/register-form";
import { createTranslator } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export default async function RegisterPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">{t("public.register.title")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("public.register.intro")}</p>
      </div>
      <RegisterForm locale={locale} />
      <p className="mt-5 text-center text-sm text-slate-600">
        {t("public.register.alreadyRegistered")}{" "}
        <Link className="font-medium text-accent hover:text-accent-dark" href="/login">
          {t("navigation.login")}
        </Link>
      </p>
      <div className="mt-5">
        <PublicTrustLinks locale={locale} />
      </div>
    </section>
  );
}
