import Link from "next/link";
import { notFound } from "next/navigation";
import { CollapsibleSection } from "@/components/collapsible-section";
import { DocumentTypeCorrection } from "@/components/document-type-correction";
import { DocumentStatusPill } from "@/components/document-status-pill";
import { QualityStatusPill } from "@/components/quality-status-pill";
import { ReviewActions } from "@/components/review-actions";
import { ReviewStatusPill } from "@/components/review-status-pill";
import {
  buildResultSummary,
  parseSuppressionReasons,
  reasonCodeToLabel,
  toneClasses
} from "@/lib/document-result-summary";
import { getDocumentProcessingProfile } from "@/lib/document-processing-profiles";
import { formatDocumentType, getDocumentTypeGuidance } from "@/lib/document-types";
import { formatDuplicateStatus, formatQualityStatus, formatReviewStatus, getDocumentForUser } from "@/lib/documents";
import { formatQualityWarning } from "@/lib/image-quality";
import { requireUser } from "@/lib/session";

function duplicateDecisionLabel(document: Awaited<ReturnType<typeof getDocumentForUser>>) {
  if (!document) return null;

  // Prefer structured decision type when present (new records)
  const decisionType = document.duplicateDecisionType;

  if (decisionType === "EXACT_DUPLICATE" || document.duplicateStatus === "EXACT_DUPLICATE") {
    return { title: "Exact duplicate", description: "This upload is a byte-level exact match with another document.", tone: "info" as const };
  }

  if (decisionType === "LIKELY_DUPLICATE_REVIEW" || document.duplicateStatus === "LIKELY_DUPLICATE") {
    return {
      title: "Likely duplicate — review needed",
      description: "Image similarity suggests this may be the same document. A side-by-side comparison is available for your review.",
      tone: "warning" as const
    };
  }

  if (decisionType === "SUPPRESSED_NEAR_DUPLICATE") {
    const reasons =
      document.duplicateDecisionReasons.length > 0
        ? document.duplicateDecisionReasons.map(reasonCodeToLabel)
        : parseSuppressionReasons(document.notes ?? null);

    const reasonText =
      reasons.length === 1
        ? `Structured evidence shows the ${reasons[0]}.`
        : reasons.length > 1
          ? `Structured evidence shows differences: ${reasons.join(", ")}.`
          : "Structured evidence showed differences between the documents.";

    return {
      title: "Near-duplicate review suppressed",
      description: `A visually similar candidate was found, but it was not flagged for review. ${reasonText} For transfer slips, structured metadata outweighs visual similarity in duplicate detection.`,
      tone: "info" as const
    };
  }

  if (document.notes?.startsWith("Suppressed near-duplicate")) {
    // Legacy fallback for older records without structured decision type
    const reasons = parseSuppressionReasons(document.notes);
    const reasonText =
      reasons.length === 1
        ? `Structured evidence shows the ${reasons[0]}.`
        : reasons.length > 1
          ? `Structured evidence shows differences: ${reasons.join(", ")}.`
          : "Structured evidence showed differences between the documents.";

    return {
      title: "Near-duplicate review suppressed",
      description: `A visually similar candidate was found, but it was not flagged for review. ${reasonText} For transfer slips, structured metadata outweighs visual similarity in duplicate detection.`,
      tone: "info" as const
    };
  }

  return { title: "New upload", description: "This document is treated as new based on current evidence.", tone: "positive" as const };
}

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

function formatQrCandidateResult(result: string | undefined) {
  if (result === "CANDIDATE_FOUND") {
    return "Plausible QR candidate found";
  }

  if (result === "NO_CANDIDATE_FOUND") {
    return "No plausible QR candidate found";
  }

  return "QR candidate analysis not available";
}

function formatTransferMetadataResult(result: string | undefined) {
  if (result === "PARSED") {
    return "Transfer metadata parsed";
  }

  if (result === "UNSUPPORTED_FORMAT") {
    return "Unsupported QR payload format";
  }

  if (result === "NO_STRUCTURED_METADATA") {
    return "No structured transfer metadata";
  }

  if (result === "PARSE_FAILED") {
    return "Transfer metadata parse failed";
  }

  return "Transfer metadata parse not available";
}

function formatSlipVerificationResult(result: string | undefined) {
  if (result === "NOT_VERIFIED") {
    return "Not verified";
  }

  if (result === "UNSUPPORTED") {
    return "Unsupported for verification";
  }

  if (result === "STRUCTURALLY_CONSISTENT") {
    return "Locally structurally consistent";
  }

  if (result === "STRUCTURALLY_INCONSISTENT") {
    return "Local structural inconsistency found";
  }

  return "Slip verification not available";
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
  const processingProfile = document.processingProfile ?? getDocumentProcessingProfile(document.documentType);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-3">
        <Link className="text-sm font-medium text-accent hover:text-accent-dark" href="/dashboard">
          Dashboard
        </Link>
        {document.duplicateStatus === "LIKELY_DUPLICATE" && (
          <>
            <span className="text-slate-300">/</span>
            <Link className="text-sm font-medium text-accent hover:text-accent-dark" href="/review">
              Review queue
            </Link>
          </>
        )}
      </div>
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

        {/* Upload result summary — derived from stored fields, redirect-safe */}
        {(() => {
          const summary = buildResultSummary(document);
          if (!summary || summary.length === 0) return null;
          return (
            <div
              className="mt-4 rounded-lg border border-line bg-white p-4 shadow-sm"
              data-testid="document-result-summary"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Upload result</p>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {summary.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-md border p-2.5 text-sm ${toneClasses(item.tone)}`}
                  >
                    <dt className="text-xs font-medium opacity-80">{item.label}</dt>
                    <dd className="mt-0.5 font-medium">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })()}

        {/* Dedicated duplicate-decision transparency */}
        {(() => {
          const decision = duplicateDecisionLabel(document);
          if (!decision) return null;

          return (
            <div
              className="mt-4 rounded-lg border border-line bg-white p-4 shadow-sm"
              data-testid="duplicate-decision-card"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Duplicate decision</p>
              <div className={`mt-2 rounded-md border p-3 text-sm ${toneClasses(decision.tone)}`}>
                <p className="font-medium">{decision.title}</p>
                <p className="mt-1 text-xs opacity-90">{decision.description}</p>
              </div>
              {document.matchedDocumentId && matchedDocument ? (
                <p className="mt-2 text-xs text-slate-500">
                  {matchDescription(document.duplicateStatus)}{" "}
                  <Link
                    className="font-medium text-accent hover:text-accent-dark"
                    href={`/documents/${String(matchedDocument._id)}`}
                  >
                    {matchedDocument.originalFilename}
                  </Link>
                  {document.similarityScore !== null && (
                    <span> (visual similarity {formatSimilarity(document.similarityScore)})</span>
                  )}
                </p>
              ) : null}
            </div>
          );
        })()}

        {document.duplicateStatus === "LIKELY_DUPLICATE" && matchedDocument ? (
          <div className="mt-4">
            <div className="mb-3 flex flex-col gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900 sm:flex-row sm:items-center sm:justify-between">
              <span>
                System flagged as likely duplicate. Review status:{" "}
                <strong>{formatReviewStatus(document.reviewStatus)}</strong>.
              </span>
              {document.reviewStatus === "PENDING" && (
                <Link
                  href={`/review/${String(document._id)}`}
                  className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
                >
                  Compare &amp; review →
                </Link>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <figure className="overflow-hidden rounded-md border border-line bg-slate-50">
                <figcaption className="border-b border-line bg-white px-3 py-2 text-sm font-medium">
                  This upload
                </figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="max-h-[400px] w-full object-contain"
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
                  className="max-h-[400px] w-full object-contain"
                  src={`/api/documents/${String(matchedDocument._id)}/original`}
                  alt="Matched financial document preview"
                />
              </figure>
            </div>
            {canReview ? <ReviewActions documentId={String(document._id)} /> : null}
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-line bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="max-h-[480px] w-full object-contain"
              src={`/api/documents/${String(document._id)}/original`}
              alt="Uploaded financial document preview"
            />
          </div>
        )}

        {document.qualityWarnings.length > 0 ? (
          <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3">
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

        {/* Document type correction — always accessible */}
        <div className="mt-4">
          <DocumentTypeCorrection documentId={String(document._id)} currentDocumentType={document.documentType} />
        </div>

        {/* Collapsed: document metadata */}
        <CollapsibleSection label="Document metadata">
          <dl className="grid gap-3 sm:grid-cols-2">
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
              ["Matched document", matchedDocument
                ? `${matchDescription(document.duplicateStatus)} ${matchedDocument.originalFilename}`
                : document.matchedDocumentId ? "Not available to this account" : "None"]
            ].map(([label, value]) => (
              <div className="rounded-md border border-line bg-white p-2.5" key={label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-1 break-words text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </CollapsibleSection>

        {/* Collapsed: transfer-slip analysis (for BANK_TRANSFER_SLIP) */}
        {document.documentType === "BANK_TRANSFER_SLIP" && (
          <CollapsibleSection label="Image-read fields">
            <p className="mb-2 text-xs text-slate-500">
              OCR-derived. Not bank/provider verified. Low-confidence fields shown with indicator.
            </p>
            {document.slipImageRead?.extractedFields ? (
              <dl className="grid gap-2 text-xs sm:grid-cols-2">
                {[
                  { label: "Amount", field: document.slipImageRead.extractedFields.amount },
                  { label: "Sender", field: document.slipImageRead.extractedFields.senderName },
                  { label: "Receiver", field: document.slipImageRead.extractedFields.receiverName },
                  { label: "Date / time", field: document.slipImageRead.extractedFields.dateTime },
                  { label: "Reference", field: document.slipImageRead.extractedFields.transactionReference },
                  { label: "Sender bank", field: document.slipImageRead.extractedFields.senderBank },
                  { label: "Receiver bank", field: document.slipImageRead.extractedFields.receiverBank },
                  { label: "Sender acct tail", field: document.slipImageRead.extractedFields.senderAccountTail },
                  { label: "Receiver acct tail", field: document.slipImageRead.extractedFields.receiverAccountTail }
                ]
                  .filter((item) => item.field.value !== null && item.field.value !== "")
                  .map((item) => (
                    <div key={item.label} className="rounded border border-slate-200 bg-white p-2">
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{item.label}</dt>
                      <dd className="mt-0.5 break-words font-medium text-ink">{item.field.value}</dd>
                      <dd className="text-[10px] text-slate-400">{item.field.confidence.toLowerCase()} confidence</dd>
                    </div>
                  ))}
              </dl>
            ) : (
              <p className="text-xs text-slate-500">
                {document.slipImageRead?.status === "FAILED" ? "Image reading failed." : "No image-read results available."}
              </p>
            )}
            {document.slipImageRead?.warnings && document.slipImageRead.warnings.length > 0 ? (
              <p className="mt-2 text-[10px] text-orange-700">
                Warnings: {document.slipImageRead.warnings.join("; ")}
              </p>
            ) : null}
          </CollapsibleSection>
        )}

        {/* Collapsed: technical analysis */}
        {document.documentType === "BANK_TRANSFER_SLIP" && (
          <CollapsibleSection label="Transfer slip analysis">
            <div className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Slip verification</dt>
                <dd className="mt-1 font-medium text-slate-800">{formatSlipVerificationResult(document.slipVerification?.result)}</dd>
                <dd className="mt-0.5 text-xs text-slate-500">Not bank/provider verified. Local structural check only.</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">QR decode</dt>
                <dd className="mt-1 font-medium text-slate-800">
                  {document.qrDecode?.result === "QR_DECODED" ? "Decoded" : document.qrDecode?.result === "NO_QR_DECODED" ? "No QR found" : "Not available"}
                </dd>
                {document.qrDecode?.rawDecodedText && (
                  <pre className="mt-1 max-h-24 overflow-auto rounded border border-slate-200 bg-white p-2 text-[10px] font-mono text-slate-700">
                    {document.qrDecode.rawDecodedText}
                  </pre>
                )}
              </div>
              {document.transferMetadata?.metadata && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Transfer metadata</dt>
                  <dd className="mt-1 text-xs text-slate-500">Not verified. Parsed from QR payload.</dd>
                  <dl className="mt-1 grid gap-2 text-xs sm:grid-cols-2">
                    {[
                      ["Country / currency", `${document.transferMetadata.metadata.countryCode ?? "?"} / ${document.transferMetadata.metadata.currencyCode ?? "?"}`],
                      ["Amount (QR)", document.transferMetadata.metadata.amount ?? "—"],
                      ["Subtype", document.transferMetadata.metadata.merchantAccountInfo?.subtype ?? "—"],
                      ["Reference 1", document.transferMetadata.metadata.merchantAccountInfo?.references.reference1 ?? "—"],
                      ["Reference 2", document.transferMetadata.metadata.merchantAccountInfo?.references.reference2 ?? "—"]
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-slate-400">{k}</dt>
                        <dd className="break-all font-medium text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Processing profile</dt>
                <dd className="mt-1 font-medium text-slate-800">{processingProfile.label}</dd>
                <dd className="text-xs text-slate-500">{processingProfile.description}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Type guidance</dt>
                <dd className="mt-1 text-xs text-slate-600">{documentTypeGuidance.title}</dd>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Collapsed: technical identifiers */}
        <CollapsibleSection label="Technical identifiers">
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="font-medium text-slate-500">Exact hash (SHA-256)</dt>
              <dd className="mt-0.5 break-all font-mono text-slate-700">{document.exactHash ?? "Not calculated"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Perceptual hash</dt>
              <dd className="mt-0.5 break-all font-mono text-slate-700">{document.perceptualHash ?? "Not generated"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Normalized image</dt>
              <dd className="mt-0.5 text-slate-700">
                {document.normalizedImage ? `${document.normalizedImage.width}×${document.normalizedImage.height} WebP` : "Not generated"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Normalized object key</dt>
              <dd className="mt-0.5 break-all font-mono text-slate-700">{document.normalizedObject?.key ?? "Not generated"}</dd>
            </div>
            {document.qualityMetrics && (
              <div>
                <dt className="font-medium text-slate-500">Image metrics</dt>
                <dd className="mt-0.5 text-slate-700">
                  {document.qualityMetrics.width}×{document.qualityMetrics.height}, sharpness {document.qualityMetrics.sharpness}, luminance {document.qualityMetrics.meanLuminance}
                </dd>
              </div>
            )}
          </dl>
        </CollapsibleSection>
      </div>
    </section>
  );
}
