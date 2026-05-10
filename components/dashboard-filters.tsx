"use client";

import Link from "next/link";
import { duplicateStatuses, documentTypes } from "@/lib/models";
import { formatDocumentType } from "@/lib/document-types";
import { formatDuplicateStatus, type DocumentReviewFilter } from "@/lib/formatters";
import { useRouter, useSearchParams } from "next/navigation";

interface DashboardFiltersProps {
  reviewFilter: DocumentReviewFilter;
  documentTypeFilter?: typeof documentTypes[number];
  duplicateStatusFilter?: typeof duplicateStatuses[number];
}

const reviewFilters: Array<{ label: string; value: DocumentReviewFilter }> = [
  { label: "All reviews", value: "all" },
  { label: "Pending review", value: "pending" },
  { label: "Confirmed duplicate", value: "confirmed-duplicate" },
  { label: "Confirmed distinct", value: "confirmed-distinct" }
];

export function DashboardFilters({
  reviewFilter,
  documentTypeFilter,
  duplicateStatusFilter
}: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function buildSearchUrl(params: {
    review?: DocumentReviewFilter;
    documentType?: typeof documentTypes[number];
    duplicateStatus?: typeof duplicateStatuses[number];
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
    const queryString = newSearchParams.toString();
    return queryString ? `/dashboard?${queryString}` : "/dashboard";
  }

  function hasActiveFilters(): boolean {
    return reviewFilter !== "all" || !!documentTypeFilter || !!duplicateStatusFilter;
  }

  function handleReviewChange(value: DocumentReviewFilter) {
    router.push(buildSearchUrl({ review: value, documentType: documentTypeFilter, duplicateStatus: duplicateStatusFilter }));
  }

  function handleDocumentTypeChange(value: string) {
    router.push(
      buildSearchUrl({
        review: reviewFilter,
        documentType: value ? (value as typeof documentTypes[number]) : undefined,
        duplicateStatus: duplicateStatusFilter
      })
    );
  }

  function handleDuplicateStatusChange(value: string) {
    router.push(
      buildSearchUrl({
        review: reviewFilter,
        documentType: documentTypeFilter,
        duplicateStatus: value ? (value as typeof duplicateStatuses[number]) : undefined
      })
    );
  }

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav className="flex gap-2 overflow-x-auto pb-1 text-sm" aria-label="Review filters">
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
            >
              {filter.label}
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
          <option value="">All types</option>
          {documentTypes.map((type) => (
            <option key={type} value={type}>
              {formatDocumentType(type)}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border border-line bg-white px-3 py-2 text-slate-700"
          value={duplicateStatusFilter ?? ""}
          onChange={(e) => handleDuplicateStatusChange(e.target.value)}
        >
          <option value="">All statuses</option>
          {duplicateStatuses.map((status) => (
            <option key={status} value={status}>
              {formatDuplicateStatus(status)}
            </option>
          ))}
        </select>

        {hasActiveFilters() && (
          <Link
            className="rounded-md border border-line bg-white px-3 py-2 text-slate-700 hover:border-slate-400"
            href="/dashboard"
          >
            Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}
