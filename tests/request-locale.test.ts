import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRequestLocale } from "../lib/i18n/server";

const testState = vi.hoisted(() => ({
  cookieLocale: undefined as string | undefined,
  acceptLanguage: undefined as string | undefined
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "ui_locale" && testState.cookieLocale
        ? { value: testState.cookieLocale }
        : undefined
  })),
  headers: vi.fn(async () => ({
    get: (name: string) => (name.toLowerCase() === "accept-language" ? testState.acceptLanguage ?? null : null)
  }))
}));

describe("getRequestLocale", () => {
  beforeEach(() => {
    testState.cookieLocale = undefined;
    testState.acceptLanguage = undefined;
  });

  it("uses the saved locale preference before request language detection", async () => {
    testState.cookieLocale = "th";
    testState.acceptLanguage = "en-US,en;q=0.9";

    await expect(getRequestLocale()).resolves.toBe("th");
  });

  it("detects Thai from request language when no saved preference exists", async () => {
    testState.acceptLanguage = "fr-FR, th-TH;q=0.9, en-US;q=0.8";

    await expect(getRequestLocale()).resolves.toBe("th");
  });

  it("falls back to English when saved and detected locales are unsupported", async () => {
    testState.cookieLocale = "fr";
    testState.acceptLanguage = "de-DE, fr-FR;q=0.8";

    await expect(getRequestLocale()).resolves.toBe("en");
  });
});
