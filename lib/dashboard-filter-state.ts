import { formatDocumentType } from "@/lib/document-types";
import { formatDuplicateStatus, type DocumentReviewFilter } from "@/lib/formatters";
import { translate, type SupportedLocale } from "@/lib/i18n";
import type { DocumentType, DuplicateDecisionType, DuplicateStatus } from "@/lib/models";

export type DashboardFilterKey = "review" | "documentType" | "duplicateStatus" | "duplicateDecisionType" | "search";

export interface DashboardFilterState {
  review: DocumentReviewFilter;
  documentType?: DocumentType;
  duplicateStatus?: DuplicateStatus;
  duplicateDecisionType?: DuplicateDecisionType;
  searchQuery?: string;
}

function formatReviewFilterLabel(filter: DocumentReviewFilter, locale: SupportedLocale) {
  const keys: Record<DocumentReviewFilter, "reviewFilters.all" | "reviewFilters.pending" | "reviewFilters.confirmedDuplicate" | "reviewFilters.confirmedDistinct"> = {
    all: "reviewFilters.all",
    pending: "reviewFilters.pending",
    "confirmed-duplicate": "reviewFilters.confirmedDuplicate",
    "confirmed-distinct": "reviewFilters.confirmedDistinct"
  };

  return translate(locale, keys[filter]);
}

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

export function getActiveDashboardFilterChips(state: DashboardFilterState, locale: SupportedLocale = "en") {
  const chips: Array<{ key: DashboardFilterKey; label: string; href: string }> = [];

  if (state.review !== "all") {
    chips.push({
      key: "review",
      label: formatReviewFilterLabel(state.review, locale),
      href: buildDashboardFilterHref(state, "review")
    });
  }

  if (state.documentType) {
    chips.push({
      key: "documentType",
      label: formatDocumentType(state.documentType, locale),
      href: buildDashboardFilterHref(state, "documentType")
    });
  }

  if (state.duplicateStatus) {
    chips.push({
      key: "duplicateStatus",
      label: formatDuplicateStatus(state.duplicateStatus, locale),
      href: buildDashboardFilterHref(state, "duplicateStatus")
    });
  }

  if (state.duplicateDecisionType) {
    chips.push({
      key: "duplicateDecisionType",
      label: translate(locale, `statuses.duplicateDecision.${state.duplicateDecisionType}`),
      href: buildDashboardFilterHref(state, "duplicateDecisionType")
    });
  }

  if (state.searchQuery?.trim()) {
    chips.push({
      key: "search",
      label: translate(locale, "dashboard.filters.searchChip", { query: state.searchQuery.trim() }),
      href: buildDashboardFilterHref(state, "search")
    });
  }

  return chips;
}
