import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentTypeCorrection } from "@/components/document-type-correction";
import { DocumentStatusPill } from "@/components/document-status-pill";
import { QualityStatusPill } from "@/components/quality-status-pill";
import { ReviewActions } from "@/components/review-actions";
import { ReviewStatusPill } from "@/components/review-status-pill";
import { getDocumentProcessingProfile } from "@/lib/document-processing-profiles";
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

        <div className="mt-3 rounded-md border border-line bg-slate-50 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Processing profile</dt>
          <dd className="mt-1 text-sm font-medium text-slate-800">{processingProfile.label}</dd>
          <dd className="mt-1 text-sm text-slate-700">{processingProfile.description}</dd>
          {processingProfile.capabilities.qrOrientedFuturePath ? (
            <dd className="mt-2 text-xs leading-5 text-slate-500">
              <p>Transfer-slip stage status:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {processingProfile.plannedStages
                  .map((stage) => (
                    <li key={stage.key}>
                      {stage.label}: {stage.status === "ACTIVE" ? "active" : "planned"}
                    </li>
                  ))}
              </ul>
            </dd>
          ) : null}
        </div>

        {document.documentType === "BANK_TRANSFER_SLIP" ? (
          <>
            <div className="mt-3 rounded-md border border-line bg-slate-50 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">QR candidate analysis</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">
                {formatQrCandidateResult(document.qrCandidateAnalysis?.result)}
              </dd>
              <dd className="mt-1 text-sm text-slate-700">
                {document.qrCandidateAnalysis?.status === "COMPLETED"
                  ? `Completed with ${document.qrCandidateAnalysis.candidateCount} candidate${document.qrCandidateAnalysis.candidateCount === 1 ? "" : "s"}.`
                  : document.qrCandidateAnalysis?.status === "FAILED"
                    ? "Analysis failed for this upload."
                    : "This record does not have QR-candidate analysis results."}
              </dd>
              {document.qrCandidateAnalysis?.bestCandidate ? (
                <dd className="mt-1 text-xs text-slate-500">
                  Best candidate confidence {Math.round(document.qrCandidateAnalysis.bestCandidate.confidence * 100)}%.
                </dd>
              ) : null}
            </div>

            <div className="mt-3 rounded-md border border-line bg-slate-50 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">QR decode</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">
                {document.qrDecode?.result === "QR_DECODED"
                  ? "QR content decoded"
                  : document.qrDecode?.result === "NO_QR_DECODED"
                    ? "No QR content decoded"
                    : "QR decode not available"}
              </dd>
              <dd className="mt-1 text-sm text-slate-700">
                {document.qrDecode?.status === "COMPLETED" && document.qrDecode.result === "QR_DECODED"
                  ? `Raw QR text was successfully decoded (${document.qrDecode.decodedTextLength} characters). This content has not been parsed or verified.`
                  : document.qrDecode?.status === "COMPLETED" && document.qrDecode.result === "NO_QR_DECODED"
                    ? "QR decode was attempted but no valid QR code was found."
                    : document.qrDecode?.status === "SKIPPED"
                      ? "QR decode was skipped because no plausible QR candidate was found."
                      : document.qrDecode?.status === "NOT_APPLICABLE"
                        ? "QR decode is not applicable for this document."
                        : document.qrDecode?.status === "FAILED"
                          ? "QR decode failed due to a processing error."
                          : "This record does not have QR decode results."}
              </dd>
              {document.qrDecode?.rawDecodedText ? (
                <dd className="mt-2 rounded border border-slate-200 bg-white p-2">
                  <div className="text-xs font-medium text-slate-500">Raw decoded content (not parsed or verified):</div>
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-slate-800">
                    {document.qrDecode.rawDecodedText}
                  </pre>
                </dd>
              ) : null}
            </div>

            <div className="mt-3 rounded-md border border-line bg-slate-50 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Transfer metadata parse</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800">
                {formatTransferMetadataResult(document.transferMetadata?.result)}
              </dd>
              <dd className="mt-1 text-sm text-slate-700">
                {document.transferMetadata?.status === "COMPLETED" && document.transferMetadata.result === "PARSED"
                  ? `Decoded QR payload was classified as ${document.transferMetadata.payloadFormat} and parsed into structured metadata. These values are not verified.`
                  : document.transferMetadata?.status === "COMPLETED" && document.transferMetadata.result === "UNSUPPORTED_FORMAT"
                    ? `Decoded QR payload was classified as ${document.transferMetadata.payloadFormat}; this format is not parsed as transfer metadata.`
                    : document.transferMetadata?.status === "COMPLETED" && document.transferMetadata.result === "NO_STRUCTURED_METADATA"
                      ? `Decoded QR payload was classified as ${document.transferMetadata.payloadFormat}, but no structured transfer metadata was derived.`
                      : document.transferMetadata?.status === "SKIPPED"
                        ? "Transfer metadata parse was skipped because decoded QR content is not available."
                        : document.transferMetadata?.status === "NOT_APPLICABLE"
                          ? "Transfer metadata parse is not applicable for this document."
                          : document.transferMetadata?.status === "FAILED"
                            ? "Transfer metadata parse failed for this upload."
                            : "This record does not have transfer metadata parse results."}
              </dd>
              {document.transferMetadata?.metadata ? (
                <dd className="mt-2 rounded border border-slate-200 bg-white p-2 text-xs text-slate-700">
                  <div className="font-medium text-slate-500">Parsed metadata (not verified):</div>
                  <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-slate-500">Country / currency</dt>
                      <dd>
                        {document.transferMetadata.metadata.countryCode ?? "Unknown"} /{" "}
                        {document.transferMetadata.metadata.currencyCode ?? "Unknown"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">Amount</dt>
                      <dd>{document.transferMetadata.metadata.amount ?? "Not present"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">Payment subtype</dt>
                      <dd>{document.transferMetadata.metadata.merchantAccountInfo?.subtype ?? "Unknown"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">Target identifier</dt>
                      <dd className="break-all">
                        {document.transferMetadata.metadata.merchantAccountInfo?.targetIdentifier ?? "Not present"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">Reference 1</dt>
                      <dd className="break-all">
                        {document.transferMetadata.metadata.merchantAccountInfo?.references.reference1 ?? "Not present"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-500">Reference 2</dt>
                      <dd className="break-all">
                        {document.transferMetadata.metadata.merchantAccountInfo?.references.reference2 ?? "Not present"}
                      </dd>
                    </div>
                  </dl>
                </dd>
              ) : null}
            </div>
          </>
        ) : null}

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
