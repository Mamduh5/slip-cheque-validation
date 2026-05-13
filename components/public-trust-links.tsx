import Link from "next/link";
import { createTranslator, type SupportedLocale } from "@/lib/i18n";

export function PublicTrustLinks({ locale }: { locale: SupportedLocale }) {
  const t = createTranslator(locale);

  return (
    <nav
      aria-label={t("public.trustLinks.ariaLabel")}
      className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-500"
    >
      <Link className="font-medium text-accent hover:text-accent-dark" href="/support">
        {t("public.trustLinks.support")}
      </Link>
      <Link className="font-medium text-accent hover:text-accent-dark" href="/privacy">
        {t("public.trustLinks.privacy")}
      </Link>
      <Link className="font-medium text-accent hover:text-accent-dark" href="/retention">
        {t("public.trustLinks.retention")}
      </Link>
    </nav>
  );
}
