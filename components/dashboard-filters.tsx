"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { getActiveDashboardFilterChips } from "@/lib/dashboard-filter-state";
import { duplicateDecisionTypes, duplicateStatuses, documentTypes } from "@/lib/models";
import { formatDocumentType } from "@/lib/document-types";
import { formatDuplicateStatus, type DocumentReviewFilter } from "@/lib/formatters";
import { createTranslator, type SupportedLocale } from "@/lib/i18n";
import { useRouter, useSearchParams } from "next/navigation";

interface DashboardFiltersProps {
  reviewFilter: DocumentReviewFilter;
  documentTypeFilter?: typeof documentTypes[number];
  duplicateStatusFilter?: typeof duplicateStatuses[number];
  duplicateDecisionTypeFilter?: typeof duplicateDecisionTypes[number];
  searchQuery?: string;
  locale: SupportedLocale;
}

const reviewFilters: Array<{ labelKey: "reviewFilters.all" | "reviewFilters.pending" | "reviewFilters.confirmedDuplicate" | "reviewFilters.confirmedDistinct"; value: DocumentReviewFilter }> = [
  { labelKey: "reviewFilters.all", value: "all" },
  { labelKey: "reviewFilters.pending", value: "pending" },
  { labelKey: "reviewFilters.confirmedDuplicate", value: "confirmed-duplicate" },
  { labelKey: "reviewFilters.confirmedDistinct", value: "confirmed-distinct" }
];

export function DashboardFilters({
  reviewFilter,
  documentTypeFilter,
  duplicateStatusFilter,
  duplicateDecisionTypeFilter,
  searchQuery = "",
  locale
}: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = createTranslator(locale);
  const activeFilterChips = getActiveDashboardFilterChips({
    review: reviewFilter,
    documentType: documentTypeFilter,
    duplicateStatus: duplicateStatusFilter,
    duplicateDecisionType: duplicateDecisionTypeFilter,
    searchQuery
  }, locale);

  function buildSearchUrl(params: {
    review?: DocumentReviewFilter;
    documentType?: typeof documentTypes[number];
    duplicateStatus?: typeof duplicateStatuses[number];
    duplicateDecisionType?: typeof duplicateDecisionTypes[number];
    q?: string;
  }): string {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (params.review && params.review !== "all") {
      newSearchParams.set("review", params.review);
    } else {
      newSearchParams.delete("review");
    }
    if (params.documentType) {
      newSearchParams.set("documentType", params.documentType);
    } else {
      newSearchParams.delete("documentType");
    }
    if (params.duplicateStatus) {
      newSearchParams.set("duplicateStatus", params.duplicateStatus);
    } else {
      newSearchParams.delete("duplicateStatus");
    }
    if (params.duplicateDecisionType) {
      newSearchParams.set("decision", params.duplicateDecisionType);
    } else {
      newSearchParams.delete("decision");
    }
    if (params.q?.trim()) {
      newSearchParams.set("q", params.q.trim());
    } else if (params.q !== undefined) {
      newSearchParams.delete("q");
    }
    const queryString = newSearchParams.toString();
    return queryString ? `/dashboard?${queryString}` : "/dashboard";
  }

  function hasActiveFilters(): boolean {
    return (
      reviewFilter !== "all" ||
      !!documentTypeFilter ||
      !!duplicateStatusFilter ||
      !!duplicateDecisionTypeFilter ||
      !!searchQuery
    );
  }

  function handleReviewChange(value: DocumentReviewFilter) {
    router.push(
      buildSearchUrl({
        review: value,
        documentType: documentTypeFilter,
        duplicateStatus: duplicateStatusFilter,
        duplicateDecisionType: duplicateDecisionTypeFilter,
        q: searchQuery
      })
    );
  }

  function handleDocumentTypeChange(value: string) {
    router.push(
      buildSearchUrl({
        review: reviewFilter,
        documentType: value ? (value as typeof documentTypes[number]) : undefined,
        duplicateStatus: duplicateStatusFilter,
        duplicateDecisionType: duplicateDecisionTypeFilter,
        q: searchQuery
      })
    );
  }

  function handleDuplicateStatusChange(value: string) {
    router.push(
      buildSearchUrl({
        review: reviewFilter,
        documentType: documentTypeFilter,
        duplicateStatus: value ? (value as typeof duplicateStatuses[number]) : undefined,
        duplicateDecisionType: duplicateDecisionTypeFilter,
        q: searchQuery
      })
    );
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    router.push(
      buildSearchUrl({
        review: reviewFilter,
        documentType: documentTypeFilter,
        duplicateStatus: duplicateStatusFilter,
        duplicateDecisionType: duplicateDecisionTypeFilter,
        q: String(formData.get("q") ?? "")
      })
    );
  }

  return (
    <div className="mb-5 space-y-3">
      {activeFilterChips.length > 0 ? (
        <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("dashboard.filters.active")}</span>
              {activeFilterChips.map((chip) => (
                <Link
                  className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
                  href={chip.href}
                  key={chip.key}
                >
                  {chip.label} <span aria-hidden="true">x</span>
                  <span className="sr-only">{t("dashboard.filters.remove", { label: chip.label })}</span>
                </Link>
              ))}
            </div>
            <Link
              className="text-xs font-medium text-accent hover:text-accent-dark"
              href="/dashboard"
            >
              {t("dashboard.filters.clearAll")}
            </Link>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSearchSubmit} className="rounded-lg border border-line bg-white p-3">
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="dashboard-search">
          {t("dashboard.filters.searchLabel")}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            className="focus-ring min-w-0 flex-1 rounded-md border border-line px-3 py-2 text-sm"
            id="dashboard-search"
            name="q"
            defaultValue={searchQuery}
            placeholder={t("dashboard.filters.searchPlaceholder")}
          />
          <button
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
            type="submit"
          >
            {t("dashboard.filters.searchButton")}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t("dashboard.filters.searchExamples")}</p>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-2 overflow-x-auto pb-1 text-sm" aria-label={t("dashboard.filters.reviewAria")}>
          {reviewFilters.map((filter) => {
            const active = filter.value === reviewFilter;

            return (
              <button
                className={`shrink-0 rounded-md border px-3 py-2 ${
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-white text-slate-700 hover:border-slate-400"
                }`}
                onClick={() => handleReviewChange(filter.value)}
                key={filter.value}
                type="button"
              >
                {t(filter.labelKey)}
              </button>
            );
          })}
        </nav>

        <div className="flex flex-wrap gap-2 text-sm">
          <select
            className="rounded-md border border-line bg-white px-3 py-2 text-slate-700"
            value={documentTypeFilter ?? ""}
            onChange={(e) => handleDocumentTypeChange(e.target.value)}
          >
            <option value="">{t("dashboard.filters.allTypes")}</option>
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type === "CHEQUE" ? t("documentTypes.CHEQUE_PAPER_DOCUMENTS") : formatDocumentType(type, locale)}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-line bg-white px-3 py-2 text-slate-700"
            value={duplicateStatusFilter ?? ""}
            onChange={(e) => handleDuplicateStatusChange(e.target.value)}
          >
            <option value="">{t("dashboard.filters.allStatuses")}</option>
            {duplicateStatuses.map((status) => (
              <option key={status} value={status}>
                {formatDuplicateStatus(status, locale)}
              </option>
            ))}
          </select>

          {hasActiveFilters() && (
            <Link
              className="rounded-md border border-line bg-white px-3 py-2 text-slate-700 hover:border-slate-400"
              href="/dashboard"
            >
              {t("dashboard.filters.clearFilters")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
