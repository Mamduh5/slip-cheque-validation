import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Document Registry Checker",
  description: "Document validation and duplicate review for slips, cheques, and financial documents"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale}>
      <body>
        <AppHeader locale={locale} />
        <main>{children}</main>
      </body>
    </html>
  );
}
