import "server-only";
import { cookies, headers } from "next/headers";
import { localePreferenceCookieName, resolveLocalePreference } from "@/lib/i18n";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  return resolveLocalePreference({
    savedLocale: cookieStore.get(localePreferenceCookieName)?.value,
    acceptLanguage: headerStore.get("accept-language")
  }).locale;
}
