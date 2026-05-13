import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "../components/language-switcher";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

describe("LanguageSwitcher", () => {
  it("renders the supported language options", () => {
    const markup = renderToStaticMarkup(createElement(LanguageSwitcher, { locale: "en" }));

    expect(markup).toContain("Language");
    expect(markup).toContain("English");
    expect(markup).toContain("ไทย");
  });

  it("marks the resolved locale as selected", () => {
    const markup = renderToStaticMarkup(createElement(LanguageSwitcher, { locale: "th" }));

    expect(markup).toContain('<option value="th" selected="">ไทย</option>');
  });
});
