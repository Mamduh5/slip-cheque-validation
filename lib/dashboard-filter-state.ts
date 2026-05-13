import { formatDocumentType } from "@/lib/document-types";
import { formatDuplicateStatus, type DocumentReviewFilter } from "@/lib/formatters";
import type { DocumentType, DuplicateDecisionType, DuplicateStatus } from "@/lib/models";

export type DashboardFilterKey = "review" | "documentType" | "duplicateStatus" | "duplicateDecisionType" | "search";

export interface DashboardFilterState {
  review: DocumentReviewFilter;
  documentType?: DocumentType;
  duplicateStatus?: DuplicateStatus;
  duplicateDecisionType?: DuplicateDecisionType;
  searchQuery?: string;
}

const reviewFilterLabels: Record<DocumentReviewFilter, string> = {
  all: "All reviews",
  pending: "Pending review",
  "confirmed-duplicate": "Confirmed duplicate",
  "confirmed-distinct": "Confirmed distinct"
};

const duplicateDecisionLabels: Record<DuplicateDecisionType, string> = {
  EXACT_DUPLICATE: "Exact duplicate",
  LIKELY_DUPLICATE_REVIEW: "Likely duplicate review",
  NEW_UPLOAD: "New upload",
  SUPPRESSED_NEAR_DUPLICATE: "Suppressed near-duplicate"
};

export function buildDashboardFilterHref(state: DashboardFilterState, clearKey?: DashboardFilterKey) {
  const params = new URLSearchParams();

  if (state.review !== "all" && clearKey !== "review") {
    params.set("review", state.review);
  }

  if (state.documentType && clearKey !== "documentType") {
    params.set("documentType", state.documentType);
  }

  if (state.duplicateStatus && clearKey !== "duplicateStatus") {
    params.set("duplicateStatus", state.duplicateStatus);
  }

  if (state.duplicateDecisionType && clearKey !== "duplicateDecisionType") {
    params.set("decision", state.duplicateDecisionType);
  }

  if (state.searchQuery?.trim() && clearKey !== "search") {
    params.set("q", state.searchQuery.trim());
  }

  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

export function getActiveDashboardFilterChips(state: DashboardFilterState) {
  const chips: Array<{ key: DashboardFilterKey; label: string; href: string }> = [];

  if (state.review !== "all") {
    chips.push({
      key: "review",
      label: reviewFilterLabels[state.review],
      href: buildDashboardFilterHref(state, "review")
    });
  }

  if (state.documentType) {
    chips.push({
      key: "documentType",
      label: formatDocumentType(state.documentType),
      href: buildDashboardFilterHref(state, "documentType")
    });
  }

  if (state.duplicateStatus) {
    chips.push({
      key: "duplicateStatus",
      label: formatDuplicateStatus(state.duplicateStatus),
      href: buildDashboardFilterHref(state, "duplicateStatus")
    });
  }

  if (state.duplicateDecisionType) {
    chips.push({
      key: "duplicateDecisionType",
      label: duplicateDecisionLabels[state.duplicateDecisionType],
      href: buildDashboardFilterHref(state, "duplicateDecisionType")
    });
  }

  if (state.searchQuery?.trim()) {
    chips.push({
      key: "search",
      label: `Search: ${state.searchQuery.trim()}`,
      href: buildDashboardFilterHref(state, "search")
    });
  }

  return chips;
}
