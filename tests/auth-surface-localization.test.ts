import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "../components/login-form";
import { translate } from "../lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  }),
  useSearchParams: () => ({
    get: () => null
  })
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn()
}));

describe("public auth localization", () => {
  it("renders login form controls in English", () => {
    const markup = renderToStaticMarkup(createElement(LoginForm, { googleEnabled: false, locale: "en" }));

    expect(markup).toContain(translate("en", "public.login.fields.email"));
    expect(markup).toContain(translate("en", "public.login.fields.password"));
    expect(markup).toContain(translate("en", "public.login.title"));
    expect(markup).toContain(translate("en", "public.login.googleDisabled"));
  });

  it("renders login form controls in Thai", () => {
    const markup = renderToStaticMarkup(createElement(LoginForm, { googleEnabled: false, locale: "th" }));

    expect(markup).toContain(translate("th", "public.login.fields.email"));
    expect(markup).toContain(translate("th", "public.login.fields.password"));
    expect(markup).toContain(translate("th", "public.login.title"));
    expect(markup).toContain(translate("th", "public.login.googleDisabled"));
  });
});
