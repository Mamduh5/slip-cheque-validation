import { translate, type SupportedLocale } from "@/lib/i18n";
import type { DocumentRecord, DuplicateDecisionReason } from "@/lib/models";

export interface ResultSummaryItem {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "warning" | "info";
}

export function reasonCodeToLabel(reason: DuplicateDecisionReason, localeOrIndex: SupportedLocale | number = "en"): string {
  const locale = typeof localeOrIndex === "string" ? localeOrIndex : "en";

  return translate(locale, `duplicateReasons.${reason}`);
}

/**
 * Parse a suppression note like "Suppressed near-duplicate: different amount, different recipient"
 * into an array of human-readable reason fragments.
 * Legacy fallback for records created before structured reason codes existed.
 */
export function parseSuppressionReasons(note: string | null, locale: SupportedLocale = "en"): string[] {
  if (!note || !note.startsWith("Suppressed near-duplicate:")) {
    return [];
  }

  const reasonsText = note.replace("Suppressed near-duplicate:", "").trim();
  if (!reasonsText) return [];

  const rawReasons = reasonsText.split(",").map((r) => r.trim());

  return rawReasons.map((reason) => {
    switch (reason) {
      case "different amount":
        return translate(locale, "duplicateReasons.AMOUNT_MISMATCH");
      case "different recipient":
        return translate(locale, "duplicateReasons.RECIPIENT_MISMATCH");
      case "different transaction reference":
        return translate(locale, "duplicateReasons.REFERENCE_MISMATCH");
      case "different raw QR payload":
        return translate(locale, "duplicateReasons.QR_PAYLOAD_MISMATCH");
      case "different transfer metadata payload":
        return translate(locale, "duplicateReasons.TRANSFER_METADATA_PAYLOAD_MISMATCH");
      case "image-read different amount":
        return translate(locale, "duplicateReasons.IMAGE_READ_AMOUNT_MISMATCH");
      case "image-read different recipient":
        return translate(locale, "duplicateReasons.IMAGE_READ_RECIPIENT_MISMATCH");
      case "image-read different sender":
        return translate(locale, "duplicateReasons.IMAGE_READ_SENDER_MISMATCH");
      case "image-read different transaction reference":
        return translate(locale, "duplicateReasons.IMAGE_READ_REFERENCE_MISMATCH");
      case "image-read different date/time":
        return translate(locale, "duplicateReasons.IMAGE_READ_DATETIME_MISMATCH");
      case "image-read different receiver bank":
        return translate(locale, "duplicateReasons.IMAGE_READ_BANK_MISMATCH");
      default:
        return reason;
    }
  });
}

function formatReasonList(reasons: string[], locale: SupportedLocale): string {
  if (locale === "en" && reasons.length > 1) {
    const last = reasons[reasons.length - 1];
    const rest = reasons.slice(0, -1).join(", ");
    return `${rest} and ${last}`;
  }

  return reasons.join(", ");
}

function formatSuppressionReasons(reasons: string[], locale: SupportedLocale): string {
  if (reasons.length === 0) return translate(locale, "documentDetail.results.structuredDifferencesFound");
  return translate(locale, "documentDetail.results.suppressedBecause", { reasons: formatReasonList(reasons, locale) });
}

function getSuppressionReasons(document: DocumentRecord, locale: SupportedLocale): string[] {
  // Prefer structured reason codes for new records
  if (
    document.duplicateDecisionType === "SUPPRESSED_NEAR_DUPLICATE" &&
    document.duplicateDecisionReasons.length > 0
  ) {
    return document.duplicateDecisionReasons.map((reason) => reasonCodeToLabel(reason, locale));
  }

  // Legacy fallback for older records that only have note strings
  return parseSuppressionReasons(document.notes ?? null, locale);
}

export function buildResultSummary(document: DocumentRecord, locale: SupportedLocale = "en"): ResultSummaryItem[] {
  const parts: ResultSummaryItem[] = [];

  // Duplicate outcome - prefer structured decision type when present
  const decisionType = document.duplicateDecisionType;

  if (decisionType === "EXACT_DUPLICATE" || document.duplicateStatus === "EXACT_DUPLICATE") {
    parts.push({
      label: translate(locale, "documentDetail.results.duplicateCheck"),
      value: translate(locale, "documentDetail.results.exactFound"),
      tone: "info"
    });
  } else if (decisionType === "LIKELY_DUPLICATE_REVIEW" || document.duplicateStatus === "LIKELY_DUPLICATE") {
    parts.push({
      label: translate(locale, "documentDetail.results.duplicateCheck"),
      value: locale === "en" ? "Likely duplicate — review needed" : translate(locale, "documentDetail.results.likelyReview"),
      tone: "warning"
    });
  } else if (decisionType === "SUPPRESSED_NEAR_DUPLICATE") {
    const reasons = getSuppressionReasons(document, locale);
    parts.push({
      label: translate(locale, "documentDetail.results.duplicateCheck"),
      value: translate(locale, "documentDetail.results.suppressed"),
      tone: "info"
    });
    parts.push({
      label: translate(locale, "documentDetail.results.why"),
      value: formatSuppressionReasons(reasons, locale),
      tone: "info"
    });
  } else if (document.notes?.startsWith("Suppressed near-duplicate")) {
    // Legacy fallback for records without structured decision type
    const reasons = parseSuppressionReasons(document.notes, locale);
    parts.push({
      label: translate(locale, "documentDetail.results.duplicateCheck"),
      value: translate(locale, "documentDetail.results.suppressed"),
      tone: "info"
    });
    parts.push({
      label: translate(locale, "documentDetail.results.why"),
      value: formatSuppressionReasons(reasons, locale),
      tone: "info"
    });
  } else {
    parts.push({
      label: translate(locale, "documentDetail.results.duplicateCheck"),
      value: translate(locale, "documentDetail.results.newUpload"),
      tone: "positive"
    });
  }

  // Review status
  if (document.reviewStatus === "PENDING") {
    parts.push({
      label: translate(locale, "documentDetail.results.review"),
      value: translate(locale, "documentDetail.results.pendingYourReview"),
      tone: "warning"
    });
  } else if (document.reviewStatus === "CONFIRMED_DUPLICATE") {
    parts.push({
      label: translate(locale, "documentDetail.results.review"),
      value: translate(locale, "documentDetail.results.confirmedDuplicate"),
      tone: "info"
    });
  } else if (document.reviewStatus === "CONFIRMED_DISTINCT") {
    parts.push({
      label: translate(locale, "documentDetail.results.review"),
      value: translate(locale, "documentDetail.results.confirmedDistinct"),
      tone: "positive"
    });
  }

  // Quality
  if (document.qualityStatus === "WARN" && document.qualityWarnings.length > 0) {
    parts.push({
      label: translate(locale, "documentDetail.results.quality"),
      value:
        locale === "en"
          ? `${document.qualityWarnings.length} warning${document.qualityWarnings.length === 1 ? "" : "s"} detected`
          : translate(locale, "documentDetail.results.warningsDetected", { count: document.qualityWarnings.length }),
      tone: "warning"
    });
  } else if (document.qualityStatus === "FAIL") {
    parts.push({
      label: translate(locale, "documentDetail.results.quality"),
      value: translate(locale, "documentDetail.results.imageRejected"),
      tone: "warning"
    });
  }

  // Transfer-slip stages
  if (document.documentType === "BANK_TRANSFER_SLIP") {
    if (document.slipVerification?.result === "STRUCTURALLY_CONSISTENT") {
      parts.push({
        label: translate(locale, "documentDetail.results.localCheck"),
        value: translate(locale, "documentDetail.results.structurallyConsistent"),
        tone: "positive"
      });
    } else if (document.slipVerification?.result === "STRUCTURALLY_INCONSISTENT") {
      parts.push({
        label: translate(locale, "documentDetail.results.localCheck"),
        value: translate(locale, "documentDetail.results.structuralInconsistency"),
        tone: "warning"
      });
    }

    if (document.qrDecode?.result === "QR_DECODED") {
      parts.push({
        label: translate(locale, "documentDetail.results.qrDecode"),
        value: translate(locale, "documentDetail.results.decoded"),
        tone: "neutral"
      });
    } else if (document.qrDecode?.result === "NO_QR_DECODED") {
      parts.push({
        label: translate(locale, "documentDetail.results.qrDecode"),
        value: translate(locale, "documentDetail.results.noQrFound"),
        tone: "neutral"
      });
    }

    if (document.transferMetadata?.result === "PARSED") {
      parts.push({
        label: translate(locale, "documentDetail.results.metadata"),
        value: translate(locale, "documentDetail.results.parsed"),
        tone: "neutral"
      });
    } else if (document.transferMetadata?.result === "UNSUPPORTED_FORMAT") {
      parts.push({
        label: translate(locale, "documentDetail.results.metadata"),
        value: translate(locale, "documentDetail.results.unsupportedFormat"),
        tone: "neutral"
      });
    } else if (document.transferMetadata?.result === "PARSE_FAILED") {
      parts.push({
        label: translate(locale, "documentDetail.results.metadata"),
        value: translate(locale, "documentDetail.results.parseFailed"),
        tone: "neutral"
      });
    }
  }

  return parts;
}

export function toneClasses(tone: ResultSummaryItem["tone"]) {
  switch (tone) {
    case "positive":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "warning":
      return "border-orange-200 bg-orange-50 text-orange-900";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}
