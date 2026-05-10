import Link from "next/link";
import { DocumentStatusPill } from "@/components/document-status-pill";
import { ReviewStatusPill } from "@/components/review-status-pill";
import { DashboardFilters } from "@/components/dashboard-filters";
import { formatDocumentType } from "@/lib/document-types";
import { duplicateStatuses, documentTypes } from "@/lib/models";
import { getRecentDocumentsForUser } from "@/lib/documents";
import { type DocumentReviewFilter } from "@/lib/formatters";
import { requireUser } from "@/lib/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
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

function hasActiveFilters(params: {
  review: DocumentReviewFilter;
  documentType?: typeof documentTypes[number];
  duplicateStatus?: typeof duplicateStatuses[number];
}): boolean {
  return params.review !== "all" || !!params.documentType || !!params.duplicateStatus;
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ review?: string; documentType?: string; duplicateStatus?: string }>;
}) {
  const user = await requireUser();
  const resolvedSearchParams = await searchParams;
  const reviewFilter = parseReviewFilter(resolvedSearchParams?.review);
  const documentTypeFilter = parseDocumentTypeFilter(resolvedSearchParams?.documentType);
  const duplicateStatusFilter = parseDuplicateStatusFilter(resolvedSearchParams?.duplicateStatus);
  const documents = await getRecentDocumentsForUser(user.id, {
    reviewFilter,
    documentType: documentTypeFilter,
    duplicateStatus: duplicateStatusFilter
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
        <Link
          className="rounded-md bg-accent px-4 py-2 text-center font-medium text-white hover:bg-accent-dark"
          href="/upload"
        >
          Upload document
        </Link>
      </div>

      <DashboardFilters
        reviewFilter={reviewFilter}
        documentTypeFilter={documentTypeFilter}
        duplicateStatusFilter={duplicateStatusFilter}
      />

      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">No documents found</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            {hasActiveFilters({ review: reviewFilter, documentType: documentTypeFilter, duplicateStatus: duplicateStatusFilter })
              ? "No documents match the current filters."
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
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-line px-4 py-3 text-sm font-medium text-slate-600 sm:grid-cols-[1.2fr_0.6fr_0.6fr_0.7fr_auto]">
            <span>Document</span>
            <span className="hidden sm:block">Type</span>
            <span className="hidden sm:block">Uploaded</span>
            <span className="hidden sm:block">Review</span>
            <span>Machine</span>
          </div>
          <div className="divide-y divide-line">
            {documents.map((document) => (
              <Link
                className="grid grid-cols-[1fr_auto] gap-3 px-4 py-4 hover:bg-slate-50 sm:grid-cols-[1.2fr_0.6fr_0.6fr_0.7fr_auto]"
                href={`/documents/${String(document._id)}`}
                key={String(document._id)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{document.originalFilename}</span>
                  <span className="block text-xs text-slate-500">{document.mimeType}</span>
                  <span className="block text-xs text-slate-500 sm:hidden">
                    {formatDocumentType(document.documentType)}
                  </span>
                </span>
                <span className="hidden text-sm text-slate-600 sm:block">
                  {formatDocumentType(document.documentType)}
                </span>
                <span className="hidden text-sm text-slate-600 sm:block">{formatDate(document.createdAt)}</span>
                <span className="hidden sm:block">
                  <ReviewStatusPill status={document.reviewStatus} />
                </span>
                <DocumentStatusPill status={document.duplicateStatus} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
