import type { DocumentRecord } from "@/lib/models";

export type ReviewFieldKey =
  | "amount"
  | "receiverName"
  | "senderName"
  | "dateTime"
  | "transactionReference";

export const REVIEW_FIELD_LABELS: Record<ReviewFieldKey, string> = {
  amount: "Amount",
  receiverName: "Receiver",
  senderName: "Sender",
  dateTime: "Date / time",
  transactionReference: "Reference"
};

export function getImageReadField(doc: DocumentRecord, key: ReviewFieldKey): string | null {
  return doc.slipImageRead?.extractedFields?.[key]?.value ?? null;
}

export function getImageReadConfidence(doc: DocumentRecord, key: ReviewFieldKey): string | null {
  const conf = doc.slipImageRead?.extractedFields?.[key]?.confidence;
  if (!conf || conf === "NONE") return null;
  return conf.toLowerCase();
}

export function isLowConfidence(doc: DocumentRecord, key: ReviewFieldKey): boolean {
  return doc.slipImageRead?.extractedFields?.[key]?.confidence === "LOW";
}

/**
 * Compare two OCR-derived field values for visual equality.
 * Null/null is treated as matching (both absent). One-sided null is treated as
 * non-matching only when both have values — a missing value is simply skipped
 * in the comparison table, not flagged as a conflict.
 */
export function reviewValuesMatch(a: string | null, b: string | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
