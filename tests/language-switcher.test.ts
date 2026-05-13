import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "../components/language-switcher";
import { translate } from "../lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

describe("LanguageSwitcher", () => {
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
});
