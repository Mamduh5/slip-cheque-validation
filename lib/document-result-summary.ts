import type { DocumentRecord, DuplicateDecisionReason } from "@/lib/models";

export interface ResultSummaryItem {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "warning" | "info";
}

export function reasonCodeToLabel(reason: DuplicateDecisionReason): string {
  switch (reason) {
    case "AMOUNT_MISMATCH":
      return "amount differed";
    case "RECIPIENT_MISMATCH":
      return "recipient differed";
    case "REFERENCE_MISMATCH":
      return "transaction reference differed";
    case "QR_PAYLOAD_MISMATCH":
      return "QR payload differed";
    case "TRANSFER_METADATA_PAYLOAD_MISMATCH":
      return "transfer metadata payload differed";
    case "IMAGE_SIMILARITY_ONLY":
      return "image similarity only";
    case "IDENTICAL_QR_PAYLOAD":
      return "identical QR payload";
    case "IDENTICAL_TRANSFER_METADATA_PAYLOAD":
      return "identical transfer metadata payload";
    default:
      return reason;
  }
}

/**
 * Parse a suppression note like "Suppressed near-duplicate: different amount, different recipient"
 * into an array of human-readable reason fragments.
 * Legacy fallback for records created before structured reason codes existed.
 */
export function parseSuppressionReasons(note: string | null): string[] {
  if (!note || !note.startsWith("Suppressed near-duplicate:")) {
    return [];
  }

  const reasonsText = note.replace("Suppressed near-duplicate:", "").trim();
  if (!reasonsText) return [];

  const rawReasons = reasonsText.split(",").map((r) => r.trim());

  return rawReasons.map((reason) => {
    switch (reason) {
      case "different amount":
        return "amount differed";
      case "different recipient":
        return "recipient differed";
      case "different transaction reference":
        return "transaction reference differed";
      case "different raw QR payload":
        return "QR payload differed";
      case "different transfer metadata payload":
        return "transfer metadata payload differed";
      default:
        return reason;
    }
  });
}

function formatSuppressionReasons(reasons: string[]): string {
  if (reasons.length === 0) return "Structured differences found";
  if (reasons.length === 1) return `Suppressed because ${reasons[0]}`;
  const last = reasons[reasons.length - 1];
  const rest = reasons.slice(0, -1).join(", ");
  return `Suppressed because ${rest} and ${last}`;
}

function getSuppressionReasons(document: DocumentRecord): string[] {
  // Prefer structured reason codes for new records
  if (
    document.duplicateDecisionType === "SUPPRESSED_NEAR_DUPLICATE" &&
    document.duplicateDecisionReasons.length > 0
  ) {
    return document.duplicateDecisionReasons.map(reasonCodeToLabel);
  }

  // Legacy fallback for older records that only have note strings
  return parseSuppressionReasons(document.notes ?? null);
}

export function buildResultSummary(document: DocumentRecord): ResultSummaryItem[] {
  const parts: ResultSummaryItem[] = [];

  // Duplicate outcome - prefer structured decision type when present
  const decisionType = document.duplicateDecisionType;

  if (decisionType === "EXACT_DUPLICATE" || document.duplicateStatus === "EXACT_DUPLICATE") {
    parts.push({ label: "Duplicate check", value: "Exact duplicate found", tone: "info" });
  } else if (decisionType === "LIKELY_DUPLICATE_REVIEW" || document.duplicateStatus === "LIKELY_DUPLICATE") {
    parts.push({ label: "Duplicate check", value: "Likely duplicate — review needed", tone: "warning" });
  } else if (decisionType === "SUPPRESSED_NEAR_DUPLICATE") {
    const reasons = getSuppressionReasons(document);
    parts.push({
      label: "Duplicate check",
      value: "Near-duplicate review suppressed",
      tone: "info"
    });
    parts.push({
      label: "Why",
      value: formatSuppressionReasons(reasons),
      tone: "info"
    });
  } else if (document.notes?.startsWith("Suppressed near-duplicate")) {
    // Legacy fallback for records without structured decision type
    const reasons = parseSuppressionReasons(document.notes);
    parts.push({
      label: "Duplicate check",
      value: "Near-duplicate review suppressed",
      tone: "info"
    });
    parts.push({
      label: "Why",
      value: formatSuppressionReasons(reasons),
      tone: "info"
    });
  } else {
    parts.push({ label: "Duplicate check", value: "New upload", tone: "positive" });
  }

  // Review status
  if (document.reviewStatus === "PENDING") {
    parts.push({ label: "Review", value: "Pending your review", tone: "warning" });
  } else if (document.reviewStatus === "CONFIRMED_DUPLICATE") {
    parts.push({ label: "Review", value: "Confirmed duplicate", tone: "info" });
  } else if (document.reviewStatus === "CONFIRMED_DISTINCT") {
    parts.push({ label: "Review", value: "Confirmed distinct", tone: "positive" });
  }

  // Quality
  if (document.qualityStatus === "WARN" && document.qualityWarnings.length > 0) {
    parts.push({
      label: "Quality",
      value: `${document.qualityWarnings.length} warning${document.qualityWarnings.length === 1 ? "" : "s"} detected`,
      tone: "warning"
    });
  } else if (document.qualityStatus === "FAIL") {
    parts.push({ label: "Quality", value: "Image quality rejected", tone: "warning" });
  }

  // Transfer-slip stages
  if (document.documentType === "BANK_TRANSFER_SLIP") {
    if (document.slipVerification?.result === "STRUCTURALLY_CONSISTENT") {
      parts.push({ label: "Local check", value: "Structurally consistent", tone: "positive" });
    } else if (document.slipVerification?.result === "STRUCTURALLY_INCONSISTENT") {
      parts.push({ label: "Local check", value: "Structural inconsistency found", tone: "warning" });
    }

    if (document.qrDecode?.result === "QR_DECODED") {
      parts.push({ label: "QR decode", value: "Decoded", tone: "neutral" });
    } else if (document.qrDecode?.result === "NO_QR_DECODED") {
      parts.push({ label: "QR decode", value: "No QR found", tone: "neutral" });
    }

    if (document.transferMetadata?.result === "PARSED") {
      parts.push({ label: "Metadata", value: "Parsed", tone: "neutral" });
    } else if (document.transferMetadata?.result === "UNSUPPORTED_FORMAT") {
      parts.push({ label: "Metadata", value: "Unsupported format", tone: "neutral" });
    } else if (document.transferMetadata?.result === "PARSE_FAILED") {
      parts.push({ label: "Metadata", value: "Parse failed", tone: "neutral" });
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
