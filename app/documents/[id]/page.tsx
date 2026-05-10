import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentTypeCorrection } from "@/components/document-type-correction";
import { DocumentStatusPill } from "@/components/document-status-pill";
import { QualityStatusPill } from "@/components/quality-status-pill";
import { ReviewActions } from "@/components/review-actions";
import { ReviewStatusPill } from "@/components/review-status-pill";
import { formatDocumentType, getDocumentTypeGuidance } from "@/lib/document-types";
import { formatDuplicateStatus, formatQualityStatus, formatReviewStatus, getDocumentForUser } from "@/lib/documents";
import { formatQualityWarning } from "@/lib/image-quality";
import { requireUser } from "@/lib/session";

function formatBytes(bytes: number) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 1 ? 2 : 3)} MB`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatSimilarity(score: number | null) {
  if (score === null) {
    return "Not available";
  }

  return `${Math.round(score * 100)}%`;
}

function matchDescription(status: string) {
  if (status === "EXACT_DUPLICATE") {
    return "Exact byte-level match with";
  }

  if (status === "LIKELY_DUPLICATE") {
    return "Likely same document as";
  }

  return "Matched with";
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const document = await getDocumentForUser(id, user.id);

  if (!document) {
    notFound();
  }

  const matchedDocument =
    document.matchedDocumentId === null
      ? null
      : await getDocumentForUser(document.matchedDocumentId, user.id);
  const canReview =
    document.duplicateStatus === "LIKELY_DUPLICATE" &&
    document.reviewStatus === "PENDING" &&
    matchedDocument !== null;
  const documentTypeGuidance = getDocumentTypeGuidance(document.documentType);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <Link className="text-sm font-medium text-accent hover:text-accent-dark" href="/dashboard">
        Back to dashboard
      </Link>
      <div className="mt-5 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{document.originalFilename}</h1>
            <p className="mt-2 text-sm text-slate-600">Uploaded {formatDate(document.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DocumentStatusPill status={document.duplicateStatus} />
            <ReviewStatusPill status={document.reviewStatus} />
            <QualityStatusPill status={document.qualityStatus} />
          </div>
        </div>

        {document.duplicateStatus === "LIKELY_DUPLICATE" && matchedDocument ? (
          <div className="mt-6">
            <div className="mb-3 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm leading-6 text-orange-950">
              System thinks this is a likely duplicate. Your review status is{" "}
              <strong>{formatReviewStatus(document.reviewStatus)}</strong>.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <figure className="overflow-hidden rounded-md border border-line bg-slate-50">
                <figcaption className="border-b border-line bg-white px-3 py-2 text-sm font-medium">
                  Current upload
                </figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="max-h-[460px] w-full object-contain"
                  src={`/api/documents/${String(document._id)}/original`}
                  alt="Current uploaded financial document preview"
                />
              </figure>
              <figure className="overflow-hidden rounded-md border border-line bg-slate-50">
                <figcaption className="border-b border-line bg-white px-3 py-2 text-sm font-medium">
                  Matched document
                </figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="max-h-[460px] w-full object-contain"
                  src={`/api/documents/${String(matchedDocument._id)}/original`}
                  alt="Matched financial document preview"
                />
              </figure>
            </div>
            {canReview ? <ReviewActions documentId={String(document._id)} /> : null}
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-md border border-line bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="max-h-[520px] w-full object-contain"
              src={`/api/documents/${String(document._id)}/original`}
              alt="Uploaded financial document preview"
            />
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            ["Source", document.sourceType],
            ["Processing status", document.status],
            ["MIME type", document.mimeType],
            ["File size", formatBytes(document.fileSize)],
            ["Machine status", formatDuplicateStatus(document.duplicateStatus)],
            ["Review status", formatReviewStatus(document.reviewStatus)],
            ["Quality status", formatQualityStatus(document.qualityStatus)],
            ["Similarity", formatSimilarity(document.similarityScore)],
            ["Reviewed at", document.reviewedAt ? formatDate(document.reviewedAt) : "Not reviewed"],
            ["Quality checked", document.qualityCheckedAt ? formatDate(document.qualityCheckedAt) : "Not checked"],
            [
              "Image metrics",
              document.qualityMetrics
                ? `${document.qualityMetrics.width}x${document.qualityMetrics.height}, sharpness ${document.qualityMetrics.sharpness}, luminance ${document.qualityMetrics.meanLuminance}`
                : "Not available"
            ],
            ["Perceptual hash", document.perceptualHash ?? "Not generated"],
            ["Normalized image", document.normalizedImage ? `${document.normalizedImage.width}x${document.normalizedImage.height} WebP` : "Not generated"]
          ].map(([label, value]) => (
            <div className="rounded-md border border-line p-3" key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 break-words text-sm">{value}</dd>
            </div>
          ))}
        </div>

        <DocumentTypeCorrection documentId={String(document._id)} currentDocumentType={document.documentType} />

        <div className="mt-3 rounded-md border border-line bg-slate-50 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Type-specific intake note</dt>
          <dd className="mt-1 text-sm text-slate-700">{documentTypeGuidance.title}</dd>
        </div>

        <div className="mt-3 rounded-md border border-line p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Matched document</dt>
          <dd className="mt-1 break-words text-sm">
            {matchedDocument ? (
              <span>
                {matchDescription(document.duplicateStatus)}{" "}
                <Link
                  className="font-medium text-accent hover:text-accent-dark"
                  href={`/documents/${String(matchedDocument._id)}`}
                >
                  {matchedDocument.originalFilename}
                </Link>
              </span>
            ) : document.matchedDocumentId ? (
              <span>Matched document is not available to this account.</span>
            ) : (
              "None"
            )}
          </dd>
        </div>

        {document.qualityWarnings.length > 0 ? (
          <div className="mt-3 rounded-md border border-orange-200 bg-orange-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-orange-800">Capture quality warnings</dt>
            <dd className="mt-2 text-sm text-orange-950">
              <ul className="list-disc space-y-1 pl-5">
                {document.qualityWarnings.map((warning) => (
                  <li key={warning}>{formatQualityWarning(warning)}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}

        <div className="mt-6 rounded-md border border-line bg-slate-50 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Exact hash</dt>
          <dd className="mt-1 break-all font-mono text-xs">{document.exactHash ?? "Not calculated"}</dd>
        </div>
        <div className="mt-3 rounded-md border border-line bg-slate-50 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Normalized object</dt>
          <dd className="mt-1 break-all font-mono text-xs">{document.normalizedObject?.key ?? "Not generated"}</dd>
        </div>
      </div>
    </section>
  );
}
