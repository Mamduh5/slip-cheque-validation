import type { DocumentRecord } from "@/lib/models";

export interface ResultSummaryItem {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "warning" | "info";
}

export function buildResultSummary(document: DocumentRecord): ResultSummaryItem[] {
  const parts: ResultSummaryItem[] = [];

  // Duplicate outcome
  if (document.duplicateStatus === "EXACT_DUPLICATE") {
    parts.push({ label: "Duplicate check", value: "Exact duplicate found", tone: "info" });
  } else if (document.duplicateStatus === "LIKELY_DUPLICATE") {
    parts.push({ label: "Duplicate check", value: "Likely duplicate — review needed", tone: "warning" });
  } else if (document.notes?.startsWith("Suppressed near-duplicate")) {
    parts.push({ label: "Duplicate check", value: "New upload (near-duplicate suppressed)", tone: "positive" });
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

  // Suppression note
  if (document.notes?.startsWith("Suppressed near-duplicate")) {
    parts.push({ label: "Note", value: document.notes, tone: "info" });
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
