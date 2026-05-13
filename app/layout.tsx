import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { localePreferenceCookieName, resolveLocalePreference } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Document Registry Checker",
  description: "Document validation and duplicate review for slips, cheques, and financial documents"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const { locale } = resolveLocalePreference({
    savedLocale: cookieStore.get(localePreferenceCookieName)?.value,
    acceptLanguage: headerStore.get("accept-language")
  });

  return (
    <html lang={locale}>
      <body>
        <AppHeader locale={locale} />
        <main>{children}</main>
      </body>
    </html>
  );
}
