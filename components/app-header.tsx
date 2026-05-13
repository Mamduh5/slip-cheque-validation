import Link from "next/link";
import { AuthNav } from "@/components/auth-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { SupportedLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/session";

export async function AppHeader({ locale }: { locale: SupportedLocale }) {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link className="flex min-w-0 items-center gap-3" href={user ? "/dashboard" : "/"}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-ink text-sm font-bold text-white">
            DR
          </span>
          <span className="truncate font-semibold">Document Registry Checker</span>
        </Link>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <LanguageSwitcher locale={locale} />
          <AuthNav isSignedIn={Boolean(user)} userName={user?.name ?? user?.email} />
        </div>
      </div>
    </header>
  );
}
