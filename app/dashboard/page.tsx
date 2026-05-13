import Link from "next/link";
import { DocumentStatusPill } from "@/components/document-status-pill";
import { ReviewStatusPill } from "@/components/review-status-pill";
import { DashboardFilters } from "@/components/dashboard-filters";
import { WorkflowPresetRow } from "@/components/workflow-preset-row";
import { formatDocumentType } from "@/lib/document-types";
import { duplicateDecisionTypes, duplicateStatuses, documentTypes } from "@/lib/models";
import { getRecentDocumentsForUser, getReviewQueueForUser } from "@/lib/documents";
import { type DocumentReviewFilter } from "@/lib/formatters";
import { parseSuppressionReasons } from "@/lib/document-result-summary";
import {
  dashboardPresetHref,
  dashboardPresets,
  resolveActiveDashboardPreset
} from "@/lib/workflow-presets";
import { requireUser } from "@/lib/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function dashboardDuplicateSublabel(document: {
  duplicateStatus: string;
  duplicateDecisionType?: string | null;
  duplicateDecisionReasons?: string[];
  notes?: string | null | undefined;
}): string | null {
  if (document.duplicateStatus !== "NEW") return null;

  // Prefer structured fields for new records
  if (document.duplicateDecisionType === "SUPPRESSED_NEAR_DUPLICATE") {
    const reasons = document.duplicateDecisionReasons ?? [];
    if (reasons.length === 0) return "Suppressed near-duplicate";

    // Map reason codes to short labels
    const labels = reasons.map((r) => {
      switch (r) {
        case "AMOUNT_MISMATCH":
          return "amount differed";
        case "RECIPIENT_MISMATCH":
          return "recipient differed";
        case "REFERENCE_MISMATCH":
          return "reference differed";
        case "QR_PAYLOAD_MISMATCH":
          return "QR payload differed";
        case "TRANSFER_METADATA_PAYLOAD_MISMATCH":
          return "metadata payload differed";
        default:
          return r.toLowerCase().replace(/_/g, " ");
      }
    });

    if (labels.length === 1) return `Suppressed: ${labels[0]}`;
    return `Suppressed: ${labels[0]}, ${labels[1]}${labels.length > 2 ? "+" : ""}`;
  }

  // Legacy fallback for older records without structured decision type
  if (!document.notes || !document.notes.startsWith("Suppressed near-duplicate")) return null;

  const reasons = parseSuppressionReasons(document.notes);
  if (reasons.length === 0) return "Suppressed near-duplicate";
  if (reasons.length === 1) return `Suppressed: ${reasons[0]}`;
  return `Suppressed: ${reasons[0]}, ${reasons[1]}${reasons.length > 2 ? "+" : ""}`;
}

const reviewFilters: Array<{ label: string; value: DocumentReviewFilter }> = [
  { label: "all", value: "all" },
  { label: "pending", value: "pending" },
  { label: "confirmed-duplicate", value: "confirmed-duplicate" },
  { label: "confirmed-distinct", value: "confirmed-distinct" }
];

function parseReviewFilter(value: string | undefined): DocumentReviewFilter {
  return reviewFilters.some((filter) => filter.value === value) ? (value as DocumentReviewFilter) : "all";
}

function parseDocumentTypeFilter(value: string | undefined): typeof documentTypes[number] | undefined {
  if (value && documentTypes.includes(value as any)) {
    return value as typeof documentTypes[number];
  }
  return undefined;
}

function parseDuplicateStatusFilter(value: string | undefined): typeof duplicateStatuses[number] | undefined {
  if (value && duplicateStatuses.includes(value as any)) {
    return value as typeof duplicateStatuses[number];
  }
  return undefined;
}

function parseDuplicateDecisionTypeFilter(value: string | undefined): typeof duplicateDecisionTypes[number] | undefined {
  if (value && duplicateDecisionTypes.includes(value as any)) {
    return value as typeof duplicateDecisionTypes[number];
  }
  return undefined;
}

function hasActiveFilters(params: {
  review: DocumentReviewFilter;
  documentType?: typeof documentTypes[number];
  duplicateStatus?: typeof duplicateStatuses[number];
  duplicateDecisionType?: typeof duplicateDecisionTypes[number];
  searchQuery?: string;
}): boolean {
  return (
    params.review !== "all" ||
    !!params.documentType ||
    !!params.duplicateStatus ||
    !!params.duplicateDecisionType ||
    !!params.searchQuery
  );
}

function buildDashboardExportUrl(input: {
  review: DocumentReviewFilter;
  documentType?: typeof documentTypes[number];
  duplicateStatus?: typeof duplicateStatuses[number];
  duplicateDecisionType?: typeof duplicateDecisionTypes[number];
  searchQuery: string;
}) {
  const searchParams = new URLSearchParams();
  if (input.review !== "all") searchParams.set("review", input.review);
  if (input.documentType) searchParams.set("documentType", input.documentType);
  if (input.duplicateStatus) searchParams.set("duplicateStatus", input.duplicateStatus);
  if (input.duplicateDecisionType) searchParams.set("decision", input.duplicateDecisionType);
  if (input.searchQuery) searchParams.set("q", input.searchQuery);
  const query = searchParams.toString();
  return query ? `/api/exports/dashboard?${query}` : "/api/exports/dashboard";
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{
    review?: string;
    documentType?: string;
    duplicateStatus?: string;
    decision?: string;
    q?: string;
  }>;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const reviewFilter = parseReviewFilter(resolvedSearchParams?.review);
  const documentTypeFilter = parseDocumentTypeFilter(resolvedSearchParams?.documentType);
  const duplicateStatusFilter = parseDuplicateStatusFilter(resolvedSearchParams?.duplicateStatus);
  const duplicateDecisionTypeFilter = parseDuplicateDecisionTypeFilter(resolvedSearchParams?.decision);
  const searchQuery = (resolvedSearchParams?.q ?? "").trim();
  const [documents, reviewQueue] = await Promise.all([
    getRecentDocumentsForUser(user.id, {
      reviewFilter,
      documentType: documentTypeFilter,
      duplicateStatus: duplicateStatusFilter,
      duplicateDecisionType: duplicateDecisionTypeFilter,
      searchQuery
    }),
    getReviewQueueForUser(user.id)
  ]);
  const pendingCount = reviewQueue.total;
  const activePresetId = resolveActiveDashboardPreset({
    review: reviewFilter,
    duplicateStatus: duplicateStatusFilter,
    duplicateDecisionType: duplicateDecisionTypeFilter
  });
  const exportHref = buildDashboardExportUrl({
    review: reviewFilter,
    documentType: documentTypeFilter,
    duplicateStatus: duplicateStatusFilter,
    duplicateDecisionType: duplicateDecisionTypeFilter,
    searchQuery
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Recent uploads, machine duplicate status, and review decisions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-line bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:border-slate-400"
            href={exportHref}
          >
            Export CSV
          </Link>
          <Link
            className="rounded-md bg-accent px-4 py-2 text-center font-medium text-white hover:bg-accent-dark"
            href="/upload"
          >
            Upload document
          </Link>
        </div>
      </div>

      {pendingCount > 0 && (
        <Link
          href="/review"
          className="mb-5 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm hover:bg-orange-100"
        >
          <span className="text-orange-900">
            <strong>{pendingCount}</strong> item{pendingCount === 1 ? "" : "s"} pending review
          </span>
          <span className="font-medium text-accent hover:text-accent-dark">Open review queue →</span>
        </Link>
      )}

      <WorkflowPresetRow
        label="Quick views"
        activePresetId={activePresetId}
        presets={dashboardPresets.map((preset) => ({
          id: preset.id,
          label: preset.label,
          description: preset.description,
          href: dashboardPresetHref(preset, { q: searchQuery, documentType: documentTypeFilter })
        }))}
      />

      <DashboardFilters
        reviewFilter={reviewFilter}
        documentTypeFilter={documentTypeFilter}
        duplicateStatusFilter={duplicateStatusFilter}
        duplicateDecisionTypeFilter={duplicateDecisionTypeFilter}
        searchQuery={searchQuery}
      />
      <p className="-mt-2 mb-4 text-xs text-slate-500">
        Export CSV downloads the full filtered result set, not just the visible rows.
      </p>

      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">No documents found</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            {hasActiveFilters({
              review: reviewFilter,
              documentType: documentTypeFilter,
              duplicateStatus: duplicateStatusFilter,
              duplicateDecisionType: duplicateDecisionTypeFilter,
              searchQuery
            })
              ? "No documents match the current filters or search."
              : "Upload a paper financial document image to create the first registry record."}
          </p>
          <Link
            className="mt-5 inline-flex rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark"
            href="/upload"
          >
            Start upload
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-line px-4 py-3 text-sm font-medium text-slate-600 sm:grid-cols-[1.2fr_0.55fr_0.6fr_0.65fr_0.65fr_auto]">
            <span>Document</span>
            <span className="hidden sm:block">Type</span>
            <span className="hidden sm:block">Uploaded</span>
            <span className="hidden sm:block">Review</span>
            <span className="hidden sm:block">Machine</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-line">
            {documents.map((document) => {
              const documentId = String(document._id);
              const canReview = document.duplicateStatus === "LIKELY_DUPLICATE" && document.reviewStatus === "PENDING";

              return (
                <div
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-4 sm:grid-cols-[1.2fr_0.55fr_0.6fr_0.65fr_0.65fr_auto]"
                  key={documentId}
                >
                  <div className="min-w-0">
                    <Link
                      className="block truncate font-medium text-accent hover:text-accent-dark"
                      href={`/documents/${documentId}`}
                    >
                      {document.originalFilename}
                    </Link>
                    <span className="block text-xs text-slate-500">{document.mimeType}</span>
                    {(() => {
                      const sublabel = dashboardDuplicateSublabel(document);
                      if (!sublabel) return null;
                      return (
                        <span className="mt-1 inline-block rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800">
                          {sublabel}
                        </span>
                      );
                    })()}
                    <span className="block text-xs text-slate-500 sm:hidden">
                      {document.documentType === "CHEQUE" ? "Paper check" : formatDocumentType(document.documentType)}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-2 sm:hidden">
                      <ReviewStatusPill status={document.reviewStatus} />
                      <DocumentStatusPill status={document.duplicateStatus} />
                    </span>
                  </div>
                  <span className="hidden text-sm text-slate-600 sm:block">
                    {formatDocumentType(document.documentType)}
                  </span>
                  <span className="hidden text-sm text-slate-600 sm:block">{formatDate(document.createdAt)}</span>
                  <span className="hidden sm:block">
                    <ReviewStatusPill status={document.reviewStatus} />
                  </span>
                  <span className="hidden sm:block">
                    <DocumentStatusPill status={document.duplicateStatus} />
                  </span>
                  <span className="flex flex-col items-end gap-2 text-xs sm:flex-row sm:items-start">
                    <Link
                      className="rounded-md border border-line bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:border-slate-400"
                      href={`/documents/${documentId}`}
                    >
                      View
                    </Link>
                    {canReview ? (
                      <Link
                        className="rounded-md bg-accent px-2.5 py-1.5 font-medium text-white hover:bg-accent-dark"
                        href={`/review/${documentId}`}
                      >
                        Review
                      </Link>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
