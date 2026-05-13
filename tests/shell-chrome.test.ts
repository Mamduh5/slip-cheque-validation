import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "../components/app-header";
import { translate } from "../lib/i18n";

const testState = vi.hoisted(() => ({
  pathname: "/login",
  user: null as { email?: string; name?: string } | null
}));

vi.mock("next/navigation", () => ({
  usePathname: () => testState.pathname,
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(async () => testState.user)
}));

describe("shared shell chrome", () => {
  beforeEach(() => {
    testState.pathname = "/login";
    testState.user = null;
  });

  it("renders public header chrome from the active locale", async () => {
    const markup = renderToStaticMarkup(await AppHeader({ locale: "th" }));

    expect(markup).toContain(translate("th", "common.productName"));
    expect(markup).toContain(translate("th", "navigation.public"));
    expect(markup).toContain(translate("th", "navigation.login"));
    expect(markup).toContain(translate("th", "navigation.register"));
    expect(markup).toContain(translate("th", "common.localeSwitcher.label"));
  });

  it("renders authenticated header chrome from the active locale", async () => {
    testState.pathname = "/review/document-1";
    testState.user = { email: "reviewer@example.test" };

    const markup = renderToStaticMarkup(await AppHeader({ locale: "th" }));

    expect(markup).toContain(translate("th", "navigation.main"));
    expect(markup).toContain(translate("th", "navigation.dashboard"));
    expect(markup).toContain(translate("th", "navigation.review"));
    expect(markup).toContain(translate("th", "navigation.upload"));
    expect(markup).toContain(translate("th", "navigation.signOut"));
    expect(markup).toContain('href="/review"');
    expect(markup).toContain('aria-current="page"');
  });
});
