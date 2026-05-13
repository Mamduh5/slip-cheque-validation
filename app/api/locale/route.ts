import { NextResponse } from "next/server";
import {
  isSupportedLocale,
  localePreferenceCookieMaxAge,
  localePreferenceCookieName,
  type SupportedLocale
} from "@/lib/i18n";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { locale?: unknown } | null;
  const locale = body?.locale;

  if (typeof locale !== "string" || !isSupportedLocale(locale)) {
    return NextResponse.json({ error: "Unsupported locale." }, { status: 400 });
  }

  const response = NextResponse.json({ locale: locale as SupportedLocale });

  response.cookies.set(localePreferenceCookieName, locale, {
    httpOnly: false,
    maxAge: localePreferenceCookieMaxAge,
    path: "/",
    sameSite: "lax"
  });

  return response;
}
