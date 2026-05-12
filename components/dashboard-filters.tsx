"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { duplicateDecisionTypes, duplicateStatuses, documentTypes } from "@/lib/models";
import { formatDocumentType } from "@/lib/document-types";
import { formatDuplicateStatus, type DocumentReviewFilter } from "@/lib/formatters";
import { useRouter, useSearchParams } from "next/navigation";

interface DashboardFiltersProps {
  reviewFilter: DocumentReviewFilter;
  documentTypeFilter?: typeof documentTypes[number];
  duplicateStatusFilter?: typeof duplicateStatuses[number];
  duplicateDecisionTypeFilter?: typeof duplicateDecisionTypes[number];
  searchQuery?: string;
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
  duplicateStatusFilter,
  duplicateDecisionTypeFilter,
  searchQuery = ""
}: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
      <form onSubmit={handleSearchSubmit} className="rounded-lg border border-line bg-white p-3">
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="dashboard-search">
          Search extracted fields
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            className="focus-ring min-w-0 flex-1 rounded-md border border-line px-3 py-2 text-sm"
            id="dashboard-search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Amount, reference, receiver, sender, date, bank, account tail"
          />
          <button
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
            type="submit"
          >
            Search
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Examples: amount, reference number, receiver name, sender name, date.</p>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                type="button"
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
    </div>
  );
}
