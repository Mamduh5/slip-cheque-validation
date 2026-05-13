import Link from "next/link";
import { notFound } from "next/navigation";
import { CollapsibleSection } from "@/components/collapsible-section";
import { DocumentStatusPill } from "@/components/document-status-pill";
import { DocumentTypeCorrection } from "@/components/document-type-correction";
import { QualityStatusPill } from "@/components/quality-status-pill";
import { ReviewActions } from "@/components/review-actions";
import { ReviewHistoryCard } from "@/components/review-history-card";
import { ReviewStatusPill } from "@/components/review-status-pill";
import {
  buildResultSummary,
  parseSuppressionReasons,
  reasonCodeToLabel,
  toneClasses
} from "@/lib/document-result-summary";
import { getDocumentProcessingProfile } from "@/lib/document-processing-profiles";
import { getDocumentTypeGuidance } from "@/lib/document-types";
import {
  formatDuplicateStatus,
  formatQualityStatus,
  formatReviewStatus,
  getDocumentForUser,
  getReviewHistoryForDocument
} from "@/lib/documents";
import { createTranslator, type SupportedLocale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";
import { formatQualityWarning } from "@/lib/image-quality";
import { requireUser } from "@/lib/session";

function duplicateDecisionLabel(document: Awaited<ReturnType<typeof getDocumentForUser>>, locale: SupportedLocale) {
  if (!document) return null;

  const t = createTranslator(locale);
  const decisionType = document.duplicateDecisionType;

  if (decisionType === "EXACT_DUPLICATE" || document.duplicateStatus === "EXACT_DUPLICATE") {
    return {
      title: t("documentDetail.duplicateDecisionCard.exactTitle"),
      description: t("documentDetail.duplicateDecisionCard.exactDescription"),
      tone: "info" as const
    };
  }

  if (decisionType === "LIKELY_DUPLICATE_REVIEW" || document.duplicateStatus === "LIKELY_DUPLICATE") {
    return {
      title: t("documentDetail.duplicateDecisionCard.likelyTitle"),
      description: t("documentDetail.duplicateDecisionCard.likelyDescription"),
      tone: "warning" as const
    };
  }

  if (decisionType === "SUPPRESSED_NEAR_DUPLICATE" || document.notes?.startsWith("Suppressed near-duplicate")) {
    const reasons =
      decisionType === "SUPPRESSED_NEAR_DUPLICATE" && document.duplicateDecisionReasons.length > 0
        ? document.duplicateDecisionReasons.map((reason) => reasonCodeToLabel(reason, locale))
        : parseSuppressionReasons(document.notes ?? null);

    const reasonText =
      reasons.length === 1
        ? t("documentDetail.duplicateDecisionCard.suppressedReasonOne", { reason: reasons[0] })
        : reasons.length > 1
          ? t("documentDetail.duplicateDecisionCard.suppressedReasonMany", { reasons: reasons.join(", ") })
          : t("documentDetail.duplicateDecisionCard.suppressedReasonFallback");

    return {
      title: t("documentDetail.duplicateDecisionCard.suppressedTitle"),
      description: t("documentDetail.duplicateDecisionCard.suppressedDescription", { reasonText }),
      tone: "info" as const
    };
  }

  return {
    title: t("documentDetail.duplicateDecisionCard.newTitle"),
    description: t("documentDetail.duplicateDecisionCard.newDescription"),
    tone: "positive" as const
  };
}

function formatBytes(bytes: number) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 1 ? 2 : 3)} MB`;
}

function formatDate(date: Date, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatSimilarity(score: number | null, locale: SupportedLocale) {
  if (score === null) {
    return createTranslator(locale)("documentDetail.metadata.notAvailable");
  }

  return `${Math.round(score * 100)}%`;
}

function matchDescription(status: string, locale: SupportedLocale) {
  const t = createTranslator(locale);

  if (status === "EXACT_DUPLICATE") {
    return t("documentDetail.matchDescription.exact");
  }

  if (status === "LIKELY_DUPLICATE") {
    return t("documentDetail.matchDescription.likely");
  }

  return t("documentDetail.matchDescription.fallback");
}

function formatTransferMetadataResult(result: string | undefined, locale: SupportedLocale) {
  const t = createTranslator(locale);

  if (result === "PARSED") return t("documentDetail.transferAnalysis.metadataParsed");
  if (result === "UNSUPPORTED_FORMAT") return t("documentDetail.transferAnalysis.metadataUnsupported");
  if (result === "NO_STRUCTURED_METADATA") return t("documentDetail.transferAnalysis.metadataEmpty");
  if (result === "PARSE_FAILED") return t("documentDetail.transferAnalysis.metadataParseFailed");
  return t("documentDetail.transferAnalysis.metadataUnavailable");
}

function formatSlipVerificationResult(result: string | undefined, locale: SupportedLocale) {
  const t = createTranslator(locale);

  if (result === "NOT_VERIFIED") return t("documentDetail.transferAnalysis.slipResultNotVerified");
  if (result === "UNSUPPORTED") return t("documentDetail.transferAnalysis.slipResultUnsupported");
  if (result === "STRUCTURALLY_CONSISTENT") return t("documentDetail.transferAnalysis.slipResultConsistent");
  if (result === "STRUCTURALLY_INCONSISTENT") return t("documentDetail.transferAnalysis.slipResultInconsistent");
  return t("documentDetail.transferAnalysis.slipResultUnavailable");
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const { id } = await params;
  const document = await getDocumentForUser(id, user.id);

  if (!document) {
    notFound();
  }

  const matchedDocument =
    document.matchedDocumentId === null
      ? null
      : await getDocumentForUser(document.matchedDocumentId, user.id);
  const reviewHistory = await getReviewHistoryForDocument({
    documentId: String(document._id),
    userId: user.id,
    limit: 5
  });
  const canReview =
    document.duplicateStatus === "LIKELY_DUPLICATE" &&
    document.reviewStatus === "PENDING" &&
    matchedDocument !== null;
  const documentTypeGuidance = getDocumentTypeGuidance(document.documentType, locale);
  const processingProfile = document.processingProfile ?? getDocumentProcessingProfile(document.documentType);
  const likelyDuplicateEvidence =
    document.duplicateStatus === "LIKELY_DUPLICATE" && matchedDocument ? (
      <div className="mt-4" data-testid="likely-duplicate-evidence">
        <div className="mb-3 flex flex-col gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t("documentDetail.likelyDuplicateBanner")}{" "}
            <strong>{formatReviewStatus(document.reviewStatus, locale)}</strong>.
          </span>
          {document.reviewStatus === "PENDING" && (
            <Link
              href={`/review/${String(document._id)}`}
              className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
            >
              {t("documentDetail.compareReview")}
            </Link>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <figure className="overflow-hidden rounded-md border border-line bg-slate-50">
            <figcaption className="border-b border-line bg-white px-3 py-2 text-sm font-medium">
              {t("documentDetail.thisUpload")}
            </figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="max-h-[400px] w-full object-contain"
              src={`/api/documents/${String(document._id)}/original`}
              alt={t("documentDetail.currentPreviewAlt")}
            />
          </figure>
          <figure className="overflow-hidden rounded-md border border-line bg-slate-50">
            <figcaption className="border-b border-line bg-white px-3 py-2 text-sm font-medium">
              {t("documentDetail.matchedDocument")}
            </figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="max-h-[400px] w-full object-contain"
              src={`/api/documents/${String(matchedDocument._id)}/original`}
              alt={t("documentDetail.matchedPreviewAlt")}
            />
          </figure>
        </div>
        {canReview ? <ReviewActions documentId={String(document._id)} locale={locale} /> : null}
      </div>
    ) : null;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-3">
        <a className="text-sm font-medium text-accent hover:text-accent-dark" href="/dashboard">
          {t("documentDetail.backToDashboard")}
        </a>
        {document.duplicateStatus === "LIKELY_DUPLICATE" && (
          <>
            <span className="text-slate-300">/</span>
            <Link className="text-sm font-medium text-accent hover:text-accent-dark" href="/review">
              {t("documentDetail.reviewQueue")}
            </Link>
          </>
        )}
      </div>
      <div className="mt-5 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{document.originalFilename}</h1>
            <p className="mt-2 text-sm text-slate-600">{t("documentDetail.uploaded", { date: formatDate(document.createdAt, locale) })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DocumentStatusPill status={document.duplicateStatus} locale={locale} />
            <ReviewStatusPill status={document.reviewStatus} locale={locale} />
            <QualityStatusPill status={document.qualityStatus} locale={locale} />
          </div>
        </div>

        {canReview ? likelyDuplicateEvidence : null}

        {(() => {
          const summary = buildResultSummary(document, locale);
          if (!summary || summary.length === 0) return null;
          return (
            <div
              className="mt-4 rounded-lg border border-line bg-white p-4 shadow-sm"
              data-testid="document-result-summary"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("documentDetail.uploadResult")}</p>
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
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-800">
                  <dt className="text-xs font-medium opacity-80">{t("documentDetail.processingProfile")}</dt>
                  <dd className="mt-0.5 font-medium">{processingProfile.label}</dd>
                  <dd className="mt-1 text-xs text-slate-500">
                    {processingProfile.plannedStages.map((stage) => stage.label).join(" | ")}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })()}

        {(() => {
          const decision = duplicateDecisionLabel(document, locale);
          if (!decision) return null;

          return (
            <div
              className="mt-4 rounded-lg border border-line bg-white p-4 shadow-sm"
              data-testid="duplicate-decision-card"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("documentDetail.duplicateDecision")}</p>
              <div className={`mt-2 rounded-md border p-3 text-sm ${toneClasses(decision.tone)}`}>
                <p className="font-medium">{decision.title}</p>
                <p className="mt-1 text-xs opacity-90">{decision.description}</p>
              </div>
              {document.matchedDocumentId && matchedDocument ? (
                <p className="mt-2 text-xs text-slate-500">
                  {matchDescription(document.duplicateStatus, locale)}{" "}
                  <Link
                    className="font-medium text-accent hover:text-accent-dark"
                    href={`/documents/${String(matchedDocument._id)}`}
                  >
                    {matchedDocument.originalFilename}
                  </Link>
                  {document.similarityScore !== null && (
                    <span> ({t("documentDetail.visualSimilarity", { similarity: formatSimilarity(document.similarityScore, locale) })})</span>
                  )}
                </p>
              ) : null}
            </div>
          );
        })()}

        <ReviewHistoryCard entries={reviewHistory} locale={locale} />

        {!canReview ? (document.duplicateStatus === "LIKELY_DUPLICATE" && matchedDocument ? (
          likelyDuplicateEvidence
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-line bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="max-h-[480px] w-full object-contain"
              src={`/api/documents/${String(document._id)}/original`}
              alt={t("documentDetail.uploadedPreviewAlt")}
            />
          </div>
        )) : null}

        {document.qualityWarnings.length > 0 ? (
          <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-orange-800">{t("documentDetail.qualityWarnings")}</dt>
            <dd className="mt-2 text-sm text-orange-950">
              <ul className="list-disc space-y-1 pl-5">
                {document.qualityWarnings.map((warning) => (
                  <li key={warning}>{formatQualityWarning(warning, locale)}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}

        <div className="mt-4">
          <DocumentTypeCorrection documentId={String(document._id)} currentDocumentType={document.documentType} locale={locale} />
        </div>

        <CollapsibleSection label={t("documentDetail.documentMetadata")}>
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              [t("documentDetail.metadata.source"), document.sourceType],
              [t("documentDetail.metadata.processingStatus"), document.status],
              [t("documentDetail.metadata.mimeType"), document.mimeType],
              [t("documentDetail.metadata.fileSize"), formatBytes(document.fileSize)],
              [t("documentDetail.metadata.machineStatus"), formatDuplicateStatus(document.duplicateStatus, locale)],
              [t("documentDetail.metadata.reviewStatus"), formatReviewStatus(document.reviewStatus, locale)],
              [t("documentDetail.metadata.qualityStatus"), formatQualityStatus(document.qualityStatus, locale)],
              [t("documentDetail.metadata.similarity"), formatSimilarity(document.similarityScore, locale)],
              [t("documentDetail.metadata.reviewedAt"), document.reviewedAt ? formatDate(document.reviewedAt, locale) : t("documentDetail.metadata.notReviewed")],
              [t("documentDetail.metadata.matchedDocument"), matchedDocument
                ? `${matchDescription(document.duplicateStatus, locale)} ${matchedDocument.originalFilename}`
                : document.matchedDocumentId ? t("documentDetail.metadata.matchedUnavailable") : t("documentDetail.metadata.none")]
            ].map(([label, value]) => (
              <div className="rounded-md border border-line bg-white p-2.5" key={label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-1 break-words text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </CollapsibleSection>

        {document.documentType === "BANK_TRANSFER_SLIP" && (
          <CollapsibleSection label={t("documentDetail.imageRead.title")}>
            <p className="mb-2 text-xs text-slate-500">
              {t("documentDetail.imageRead.helper")}
            </p>
            {document.slipImageRead?.extractedFields ? (
              <dl className="grid gap-2 text-xs sm:grid-cols-2">
                {[
                  { label: t("documentDetail.imageRead.amount"), field: document.slipImageRead.extractedFields.amount },
                  { label: t("documentDetail.imageRead.sender"), field: document.slipImageRead.extractedFields.senderName },
                  { label: t("documentDetail.imageRead.receiver"), field: document.slipImageRead.extractedFields.receiverName },
                  { label: t("documentDetail.imageRead.dateTime"), field: document.slipImageRead.extractedFields.dateTime },
                  { label: t("documentDetail.imageRead.reference"), field: document.slipImageRead.extractedFields.transactionReference },
                  { label: t("documentDetail.imageRead.senderBank"), field: document.slipImageRead.extractedFields.senderBank },
                  { label: t("documentDetail.imageRead.receiverBank"), field: document.slipImageRead.extractedFields.receiverBank },
                  { label: t("documentDetail.imageRead.senderAcctTail"), field: document.slipImageRead.extractedFields.senderAccountTail },
                  { label: t("documentDetail.imageRead.receiverAcctTail"), field: document.slipImageRead.extractedFields.receiverAccountTail }
                ]
                  .filter((item) => item.field.value !== null && item.field.value !== "")
                  .map((item) => (
                    <div key={item.label} className="rounded border border-slate-200 bg-white p-2">
                      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{item.label}</dt>
                      <dd className="mt-0.5 break-words font-medium text-ink">{item.field.value}</dd>
                      <dd className="text-[10px] text-slate-400">
                        {t("documentDetail.imageRead.confidence", { confidence: item.field.confidence.toLowerCase() })}
                      </dd>
                    </div>
                  ))}
              </dl>
            ) : (
              <p className="text-xs text-slate-500">
                {document.slipImageRead?.status === "FAILED" ? t("documentDetail.imageRead.failed") : t("documentDetail.imageRead.unavailable")}
              </p>
            )}
            {document.slipImageRead?.warnings && document.slipImageRead.warnings.length > 0 ? (
              <p className="mt-2 text-[10px] text-orange-700">
                {t("documentDetail.imageRead.warnings", { warnings: document.slipImageRead.warnings.join("; ") })}
              </p>
            ) : null}
          </CollapsibleSection>
        )}

        {document.documentType === "BANK_TRANSFER_SLIP" && (
          <CollapsibleSection label={t("documentDetail.transferAnalysis.title")}>
            <div className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("documentDetail.transferAnalysis.slipVerification")}</dt>
                <dd className="mt-1 font-medium text-slate-800">{formatSlipVerificationResult(document.slipVerification?.result, locale)}</dd>
                <dd className="mt-0.5 text-xs text-slate-500">{t("documentDetail.transferAnalysis.localOnly")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("documentDetail.transferAnalysis.qrDecode")}</dt>
                <dd className="mt-1 font-medium text-slate-800">
                  {document.qrDecode?.result === "QR_DECODED"
                    ? t("documentDetail.transferAnalysis.decoded")
                    : document.qrDecode?.result === "NO_QR_DECODED"
                      ? t("documentDetail.transferAnalysis.noQr")
                      : t("documentDetail.transferAnalysis.notAvailable")}
                </dd>
                {document.qrDecode?.rawDecodedText && (
                  <pre className="mt-1 max-h-24 overflow-auto rounded border border-slate-200 bg-white p-2 text-[10px] font-mono text-slate-700">
                    {document.qrDecode.rawDecodedText}
                  </pre>
                )}
              </div>
              {document.transferMetadata?.metadata && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("documentDetail.transferAnalysis.transferMetadata")}</dt>
                  <dd className="mt-1 text-xs text-slate-500">{t("documentDetail.transferAnalysis.metadataHelper")}</dd>
                  <dl className="mt-1 grid gap-2 text-xs sm:grid-cols-2">
                    {[
                      [t("documentDetail.transferAnalysis.countryCurrency"), `${document.transferMetadata.metadata.countryCode ?? "?"} / ${document.transferMetadata.metadata.currencyCode ?? "?"}`],
                      [t("documentDetail.transferAnalysis.amountQr"), document.transferMetadata.metadata.amount ?? t("reviewCompare.notAvailable")],
                      [t("documentDetail.transferAnalysis.subtype"), document.transferMetadata.metadata.merchantAccountInfo?.subtype ?? t("reviewCompare.notAvailable")],
                      [t("documentDetail.transferAnalysis.reference1"), document.transferMetadata.metadata.merchantAccountInfo?.references.reference1 ?? t("reviewCompare.notAvailable")],
                      [t("documentDetail.transferAnalysis.reference2"), document.transferMetadata.metadata.merchantAccountInfo?.references.reference2 ?? t("reviewCompare.notAvailable")]
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
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("documentDetail.processingProfile")}</dt>
                <dd className="mt-1 font-medium text-slate-800">{processingProfile.label}</dd>
                <dd className="text-xs text-slate-500">{processingProfile.description}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("documentDetail.transferAnalysis.typeGuidance")}</dt>
                <dd className="mt-1 text-xs text-slate-600">{documentTypeGuidance.title}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("documentDetail.transferAnalysis.transferMetadata")}</dt>
                <dd className="mt-1 font-medium text-slate-800">{formatTransferMetadataResult(document.transferMetadata?.result, locale)}</dd>
              </div>
            </div>
          </CollapsibleSection>
        )}

        <CollapsibleSection label={t("documentDetail.technicalIdentifiers.title")}>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="font-medium text-slate-500">{t("documentDetail.technicalIdentifiers.exactHash")}</dt>
              <dd className="mt-0.5 break-all font-mono text-slate-700">{document.exactHash ?? t("documentDetail.technicalIdentifiers.notCalculated")}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">{t("documentDetail.technicalIdentifiers.perceptualHash")}</dt>
              <dd className="mt-0.5 break-all font-mono text-slate-700">{document.perceptualHash ?? t("documentDetail.technicalIdentifiers.notGenerated")}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">{t("documentDetail.technicalIdentifiers.normalizedImage")}</dt>
              <dd className="mt-0.5 text-slate-700">
                {document.normalizedImage ? `${document.normalizedImage.width}x${document.normalizedImage.height} WebP` : t("documentDetail.technicalIdentifiers.notGenerated")}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">{t("documentDetail.technicalIdentifiers.normalizedObjectKey")}</dt>
              <dd className="mt-0.5 break-all font-mono text-slate-700">{document.normalizedObject?.key ?? t("documentDetail.technicalIdentifiers.notGenerated")}</dd>
            </div>
            {document.qualityMetrics && (
              <div>
                <dt className="font-medium text-slate-500">{t("documentDetail.technicalIdentifiers.imageMetrics")}</dt>
                <dd className="mt-0.5 text-slate-700">
                  {document.qualityMetrics.width}x{document.qualityMetrics.height},{" "}
                  {t("documentDetail.technicalIdentifiers.sharpness")} {document.qualityMetrics.sharpness},{" "}
                  {t("documentDetail.technicalIdentifiers.luminance")} {document.qualityMetrics.meanLuminance}
                </dd>
              </div>
            )}
          </dl>
        </CollapsibleSection>
      </div>
    </section>
  );
}
