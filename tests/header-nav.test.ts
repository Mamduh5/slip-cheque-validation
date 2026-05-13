import { describe, expect, it } from "vitest";
import { isHeaderNavItemActive } from "../lib/header-nav";

describe("header nav active state", () => {
  it("marks authenticated top-level sections active", () => {
    expect(isHeaderNavItemActive("dashboard", "/dashboard")).toBe(true);
    expect(isHeaderNavItemActive("review", "/review")).toBe(true);
    expect(isHeaderNavItemActive("upload", "/upload")).toBe(true);
  });

  it("maps detail pages to their predictable parent section", () => {
    expect(isHeaderNavItemActive("dashboard", "/documents/document-1")).toBe(true);
    expect(isHeaderNavItemActive("review", "/review/document-1")).toBe(true);
    expect(isHeaderNavItemActive("upload", "/documents/document-1")).toBe(false);
  });

  it("keeps public auth links coherent", () => {
    expect(isHeaderNavItemActive("login", "/login")).toBe(true);
    expect(isHeaderNavItemActive("login", "/forgot-password")).toBe(true);
    expect(isHeaderNavItemActive("register", "/register")).toBe(true);
  });
});
