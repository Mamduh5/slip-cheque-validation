import { describe, expect, it } from "vitest";
import {
  createTranslator,
  defaultLocale,
  ensureSupportedLocale,
  isSupportedLocale,
  resolveTranslation,
  supportedLocales,
  translate,
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
});
