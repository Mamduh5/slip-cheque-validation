import { describe, expect, it } from "vitest";
import {
  dashboardPresetHref,
  dashboardPresets,
  resolveActiveDashboardPreset,
  resolveActiveReviewPreset,
  reviewPresetHref,
  reviewPresets
} from "../lib/workflow-presets";

describe("dashboard workflow presets", () => {
  it("maps built-in presets to stable dashboard URLs", () => {
    const byId = Object.fromEntries(dashboardPresets.map((preset) => [preset.id, preset]));

    expect(dashboardPresetHref(byId["recent"])).toBe("/dashboard");
    expect(dashboardPresetHref(byId["needs-review"])).toBe("/dashboard?review=pending");
    expect(dashboardPresetHref(byId["exact-duplicates"])).toBe("/dashboard?duplicateStatus=EXACT_DUPLICATE");
    expect(dashboardPresetHref(byId["new-uploads"])).toBe("/dashboard?decision=NEW_UPLOAD");
    expect(dashboardPresetHref(byId["suppressed-near-duplicates"])).toBe(
      "/dashboard?decision=SUPPRESSED_NEAR_DUPLICATE"
    );
  });

  it("preserves manual search and document type when opening dashboard presets", () => {
    const exact = dashboardPresets.find((preset) => preset.id === "exact-duplicates");

    expect(dashboardPresetHref(exact!, { q: "500", documentType: "BANK_TRANSFER_SLIP" })).toBe(
      "/dashboard?duplicateStatus=EXACT_DUPLICATE&documentType=BANK_TRANSFER_SLIP&q=500"
    );
  });

  it("resolves active dashboard presets from real query state", () => {
    expect(resolveActiveDashboardPreset({ review: "pending" })).toBe("needs-review");
    expect(resolveActiveDashboardPreset({ duplicateStatus: "EXACT_DUPLICATE" })).toBe("exact-duplicates");
    expect(resolveActiveDashboardPreset({ duplicateDecisionType: "NEW_UPLOAD" })).toBe("new-uploads");
    expect(resolveActiveDashboardPreset({ duplicateDecisionType: "SUPPRESSED_NEAR_DUPLICATE" })).toBe(
      "suppressed-near-duplicates"
    );
    expect(resolveActiveDashboardPreset({ review: "all" })).toBe("recent");
  });

  it("does not mark a preset active for mixed states that do not match a preset", () => {
    expect(
      resolveActiveDashboardPreset({
        review: "pending",
        duplicateStatus: "EXACT_DUPLICATE"
      })
    ).toBeNull();
  });
});

describe("review queue workflow presets", () => {
  it("maps built-in presets to stable review URLs", () => {
    const byId = Object.fromEntries(reviewPresets.map((preset) => [preset.id, preset]));

    expect(reviewPresetHref(byId["needs-review"])).toBe("/review");
    expect(reviewPresetHref(byId["strongest-matches"])).toBe("/review?sort=highest-similarity");
    expect(reviewPresetHref(byId["hardest-cases"])).toBe("/review?sort=lowest-similarity");
    expect(reviewPresetHref(byId["oldest-first"])).toBe("/review?sort=oldest");
  });

  it("preserves search while switching review presets and resets pagination", () => {
    const strongest = reviewPresets.find((preset) => preset.id === "strongest-matches");

    expect(reviewPresetHref(strongest!, { q: "receiver" })).toBe("/review?q=receiver&sort=highest-similarity");
  });

  it("resolves active review presets from sort state", () => {
    expect(resolveActiveReviewPreset("newest")).toBe("needs-review");
    expect(resolveActiveReviewPreset("highest-similarity")).toBe("strongest-matches");
    expect(resolveActiveReviewPreset("lowest-similarity")).toBe("hardest-cases");
    expect(resolveActiveReviewPreset("oldest")).toBe("oldest-first");
  });
});

