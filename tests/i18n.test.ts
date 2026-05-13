import { describe, expect, it } from "vitest";
import {
  createTranslator,
  defaultLocale,
  detectLocaleFromAcceptLanguage,
  ensureSupportedLocale,
  isSupportedLocale,
  mapLocaleTagToSupportedLocale,
  resolveTranslation,
  resolveLocalePreference,
  messages,
  supportedLocales,
  translate,
  type MessageTree,
  type TranslationResources
} from "../lib/i18n";

describe("i18n foundation", () => {
  it("defines the supported UI locales", () => {
    expect(defaultLocale).toBe("en");
    expect(supportedLocales).toEqual(["en", "th"]);
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("th")).toBe(true);
    expect(isSupportedLocale("th-TH")).toBe(false);
  });

  it("falls back to English for unsupported explicit locale values", () => {
    expect(ensureSupportedLocale("th")).toBe("th");
    expect(ensureSupportedLocale("fr")).toBe("en");
    expect(ensureSupportedLocale(null)).toBe("en");
  });

  it("resolves strings from English and Thai dictionaries", () => {
    expect(translate("en", "navigation.login")).toBe("Log in");
    expect(translate("th", "navigation.login")).toBe("เข้าสู่ระบบ");
  });

  it("creates a locale-scoped translator", () => {
    const t = createTranslator("th");

    expect(t("common.actions.save")).toBe("บันทึก");
  });

  it("falls back to English when a locale is missing a translation", () => {
    const resources: TranslationResources = {
      en: {
        sample: {
          label: "English fallback"
        }
      },
      th: {
        sample: {}
      }
    };

    expect(resolveTranslation(resources, "th", "sample.label")).toBe("English fallback");
  });

  it("returns the key when no locale has the requested message", () => {
    const resources: TranslationResources = {
      en: {
        sample: {}
      },
      th: {
        sample: {}
      }
    };

    expect(resolveTranslation(resources, "th", "sample.missing")).toBe("sample.missing");
  });

  it("interpolates simple values after fallback resolution", () => {
    const resources: TranslationResources = {
      en: {
        upload: {
          selected: "{count} files selected"
        }
      },
      th: {
        upload: {}
      }
    };

    expect(resolveTranslation(resources, "th", "upload.selected", { count: 3 })).toBe("3 files selected");
  });

  it("maps browser locale tags to supported locales", () => {
    expect(mapLocaleTagToSupportedLocale("th")).toBe("th");
    expect(mapLocaleTagToSupportedLocale("th-TH")).toBe("th");
    expect(mapLocaleTagToSupportedLocale("en-US")).toBe("en");
    expect(mapLocaleTagToSupportedLocale("fr-FR")).toBeNull();
  });

  it("detects the first supported accept-language candidate by quality", () => {
    expect(detectLocaleFromAcceptLanguage("fr-FR, th-TH;q=0.9, en-US;q=0.8")).toBe("th");
    expect(detectLocaleFromAcceptLanguage("fr-FR, en-US;q=0.7, th-TH;q=0.9")).toBe("th");
    expect(detectLocaleFromAcceptLanguage("fr-FR, de-DE;q=0.9")).toBeNull();
  });

  it("resolves locale precedence deterministically", () => {
    expect(
      resolveLocalePreference({
        explicitLocale: "en",
        savedLocale: "th",
        acceptLanguage: "th-TH"
      })
    ).toEqual({ locale: "en", source: "explicit" });
    expect(resolveLocalePreference({ savedLocale: "th", acceptLanguage: "en-US" })).toEqual({
      locale: "th",
      source: "saved"
    });
    expect(resolveLocalePreference({ savedLocale: "fr", acceptLanguage: "th-TH" })).toEqual({
      locale: "th",
      source: "detected"
    });
    expect(resolveLocalePreference({ acceptLanguage: "fr-FR" })).toEqual({ locale: "en", source: "fallback" });
  });

  it("has Thai public/auth translations for each English public/auth key", () => {
    const publicKeys = collectLeafKeys(messages.en.public, "public");

    expect(publicKeys.length).toBeGreaterThan(0);

    for (const key of publicKeys) {
      expect(resolveTranslation(messages, "th", key)).not.toBe(resolveTranslation(messages, "en", key));
    }
  });
});

function collectLeafKeys(tree: MessageTree, prefix: string): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const nextKey = `${prefix}.${key}`;

    return typeof value === "string" ? [nextKey] : collectLeafKeys(value, nextKey);
  });
}
