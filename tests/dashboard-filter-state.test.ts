import { describe, expect, it } from "vitest";
import { buildDashboardFilterHref, getActiveDashboardFilterChips } from "../lib/dashboard-filter-state";

describe("dashboard filter state", () => {
  it("builds compact dashboard URLs and removes individual filters", () => {
    const state = {
      review: "pending" as const,
      documentType: "BANK_TRANSFER_SLIP" as const,
      duplicateStatus: "LIKELY_DUPLICATE" as const,
      duplicateDecisionType: "LIKELY_DUPLICATE_REVIEW" as const,
      searchQuery: " REF-123 "
    };

    expect(buildDashboardFilterHref(state)).toBe(
      "/dashboard?review=pending&documentType=BANK_TRANSFER_SLIP&duplicateStatus=LIKELY_DUPLICATE&decision=LIKELY_DUPLICATE_REVIEW&q=REF-123"
    );
    expect(buildDashboardFilterHref(state, "search")).toBe(
      "/dashboard?review=pending&documentType=BANK_TRANSFER_SLIP&duplicateStatus=LIKELY_DUPLICATE&decision=LIKELY_DUPLICATE_REVIEW"
    );
  });

  it("returns active chips with clear links", () => {
    const chips = getActiveDashboardFilterChips({
      review: "confirmed-distinct",
      duplicateStatus: "NEW",
      searchQuery: "500"
    });

    expect(chips).toEqual([
      { key: "review", label: "Confirmed distinct", href: "/dashboard?duplicateStatus=NEW&q=500" },
      { key: "duplicateStatus", label: "New upload", href: "/dashboard?review=confirmed-distinct&q=500" },
      { key: "search", label: "Search: 500", href: "/dashboard?review=confirmed-distinct&duplicateStatus=NEW" }
    ]);
  });
});
