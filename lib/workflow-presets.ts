import type { DuplicateDecisionType, DuplicateStatus } from "@/lib/models";
import type { ReviewQueueSort } from "@/lib/documents";
import type { DocumentReviewFilter } from "@/lib/formatters";

export type DashboardPresetId =
  | "recent"
  | "needs-review"
  | "exact-duplicates"
  | "new-uploads"
  | "suppressed-near-duplicates";

export type ReviewPresetId = "needs-review" | "strongest-matches" | "hardest-cases" | "oldest-first";

export interface DashboardPresetState {
  review?: DocumentReviewFilter;
  duplicateStatus?: DuplicateStatus;
  duplicateDecisionType?: DuplicateDecisionType;
}

export interface DashboardPreset {
  id: DashboardPresetId;
  label: string;
  description: string;
  params: DashboardPresetState;
}

export interface ReviewPreset {
  id: ReviewPresetId;
  label: string;
  description: string;
  params: {
    sort?: ReviewQueueSort;
  };
}

export const dashboardPresets: DashboardPreset[] = [
  {
    id: "recent",
    label: "Recent uploads",
    description: "Latest documents",
    params: {}
  },
  {
    id: "needs-review",
    label: "Needs review",
    description: "Pending likely duplicates",
    params: { review: "pending" }
  },
  {
    id: "exact-duplicates",
    label: "Exact duplicates",
    description: "Byte-level matches",
    params: { duplicateStatus: "EXACT_DUPLICATE" }
  },
  {
    id: "new-uploads",
    label: "New uploads",
    description: "No review required",
    params: { duplicateDecisionType: "NEW_UPLOAD" }
  },
  {
    id: "suppressed-near-duplicates",
    label: "Suppressed near-duplicates",
    description: "Visual matches treated as distinct",
    params: { duplicateDecisionType: "SUPPRESSED_NEAR_DUPLICATE" }
  }
];

export const reviewPresets: ReviewPreset[] = [
  {
    id: "needs-review",
    label: "Needs review",
    description: "Newest pending items",
    params: {}
  },
  {
    id: "strongest-matches",
    label: "Strongest matches",
    description: "Highest similarity",
    params: { sort: "highest-similarity" }
  },
  {
    id: "hardest-cases",
    label: "Hardest cases",
    description: "Lowest similarity",
    params: { sort: "lowest-similarity" }
  },
  {
    id: "oldest-first",
    label: "Oldest first",
    description: "Clear backlog",
    params: { sort: "oldest" }
  }
];

export function dashboardPresetHref(
  preset: DashboardPreset,
  options: { q?: string; documentType?: string } = {}
): string {
  const searchParams = new URLSearchParams();
  if (preset.params.review && preset.params.review !== "all") searchParams.set("review", preset.params.review);
  if (preset.params.duplicateStatus) searchParams.set("duplicateStatus", preset.params.duplicateStatus);
  if (preset.params.duplicateDecisionType) searchParams.set("decision", preset.params.duplicateDecisionType);
  if (options.documentType) searchParams.set("documentType", options.documentType);
  if (options.q?.trim()) searchParams.set("q", options.q.trim());

  const query = searchParams.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

export function reviewPresetHref(preset: ReviewPreset, options: { q?: string } = {}): string {
  const searchParams = new URLSearchParams();
  if (options.q?.trim()) searchParams.set("q", options.q.trim());
  if (preset.params.sort && preset.params.sort !== "newest") searchParams.set("sort", preset.params.sort);

  const query = searchParams.toString();
  return query ? `/review?${query}` : "/review";
}

export function resolveActiveDashboardPreset(state: DashboardPresetState): DashboardPresetId | null {
  const normalized = {
    review: state.review ?? "all",
    duplicateStatus: state.duplicateStatus ?? null,
    duplicateDecisionType: state.duplicateDecisionType ?? null
  };

  if (normalized.review === "pending" && !normalized.duplicateStatus && !normalized.duplicateDecisionType) {
    return "needs-review";
  }

  if (
    normalized.review === "all" &&
    normalized.duplicateStatus === "EXACT_DUPLICATE" &&
    !normalized.duplicateDecisionType
  ) {
    return "exact-duplicates";
  }

  if (normalized.review === "all" && !normalized.duplicateStatus && normalized.duplicateDecisionType === "NEW_UPLOAD") {
    return "new-uploads";
  }

  if (
    normalized.review === "all" &&
    !normalized.duplicateStatus &&
    normalized.duplicateDecisionType === "SUPPRESSED_NEAR_DUPLICATE"
  ) {
    return "suppressed-near-duplicates";
  }

  if (normalized.review === "all" && !normalized.duplicateStatus && !normalized.duplicateDecisionType) {
    return "recent";
  }

  return null;
}

export function resolveActiveReviewPreset(sort: ReviewQueueSort): ReviewPresetId {
  if (sort === "highest-similarity") return "strongest-matches";
  if (sort === "lowest-similarity") return "hardest-cases";
  if (sort === "oldest") return "oldest-first";
  return "needs-review";
}

