import { describe, expect, it } from "vitest";
import { POST } from "../app/api/locale/route";
import { localePreferenceCookieName } from "../lib/i18n";

function createLocaleRequest(body: unknown) {
  return new Request("http://localhost/api/locale", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

describe("locale preference route", () => {
  it("persists a supported explicit locale preference", async () => {
    const response = await POST(createLocaleRequest({ locale: "th" }));
    const body = (await response.json()) as { locale: string };

    expect(response.status).toBe(200);
    expect(body.locale).toBe("th");
    expect(response.headers.get("set-cookie")).toContain(`${localePreferenceCookieName}=th`);
    expect(response.headers.get("set-cookie")).toContain("Path=/");
  });

  it("rejects unsupported locale preferences", async () => {
    const response = await POST(createLocaleRequest({ locale: "fr" }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Unsupported locale.");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
