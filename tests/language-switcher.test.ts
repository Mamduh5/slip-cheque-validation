import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitcher, persistLocalePreference } from "../components/language-switcher";
import { translate } from "../lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

describe("LanguageSwitcher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the supported language options", () => {
    const markup = renderToStaticMarkup(createElement(LanguageSwitcher, { locale: "en" }));

    expect(markup).toContain(translate("en", "common.localeSwitcher.label"));
    expect(markup).toContain(translate("en", "common.locales.en"));
    expect(markup).toContain(translate("en", "common.locales.th"));
  });

  it("marks the resolved locale as selected", () => {
    const markup = renderToStaticMarkup(createElement(LanguageSwitcher, { locale: "th" }));

    expect(markup).toContain(translate("th", "common.localeSwitcher.label"));
    expect(markup).toContain(`<option value="th" selected="">${translate("th", "common.locales.th")}</option>`);
  });

  it("persists selected language through the locale endpoint", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(persistLocalePreference("th")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/locale", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ locale: "th" })
    });
  });

  it("does not report persistence success when the route rejects the language", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 400 })));

    await expect(persistLocalePreference("en")).resolves.toBe(false);
  });
});
