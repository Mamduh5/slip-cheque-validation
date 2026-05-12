import { formatDocumentType } from "@/lib/document-types";
import { reasonCodeToLabel } from "@/lib/document-result-summary";
import { formatDuplicateStatus, formatReviewStatus } from "@/lib/formatters";
import type { DocumentRecord, ImageReadTransferFields } from "@/lib/models";

export const exportCsvHeaders = [
  "document id",
  "filename",
  "created at",
  "document type",
  "duplicate status",
  "duplicate decision",
  "duplicate decision reasons",
  "review status",
  "amount (extracted)",
  "reference number (extracted)",
  "receiver name (extracted)",
  "sender name (extracted)",
  "date/time (extracted)",
  "receiver bank (extracted)",
  "sender bank (extracted)",
  "similarity score",
  "matched document id",
  "matched filename"
] as const;

export interface ExportDocumentRow {
  document: DocumentRecord;
  matchedDocument?: DocumentRecord | null;
}

function csvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function formatExportDate(date: Date): string {
  return date.toISOString();
}

function getExtractedField(document: DocumentRecord, field: keyof ImageReadTransferFields) {
  return document.slipImageRead?.extractedFields?.[field]?.value ?? "";
}

function formatDecisionReasons(document: DocumentRecord): string {
  if (document.duplicateDecisionReasons.length === 0) {
    return "";
  }

  return document.duplicateDecisionReasons.map(reasonCodeToLabel).join("; ");
}

function formatSimilarity(score: number | null): string {
  return score === null ? "" : String(Math.round(score * 10000) / 10000);
}

export function exportDocumentToCsvRow(input: ExportDocumentRow): string[] {
  const { document, matchedDocument } = input;

  return [
    String(document._id ?? ""),
    document.originalFilename,
    formatExportDate(document.createdAt),
    formatDocumentType(document.documentType),
    formatDuplicateStatus(document.duplicateStatus),
    document.duplicateDecisionType ?? "",
    formatDecisionReasons(document),
    formatReviewStatus(document.reviewStatus),
    getExtractedField(document, "amount"),
    getExtractedField(document, "transactionReference"),
    getExtractedField(document, "receiverName"),
    getExtractedField(document, "senderName"),
    getExtractedField(document, "dateTime"),
    getExtractedField(document, "receiverBank"),
    getExtractedField(document, "senderBank"),
    formatSimilarity(document.similarityScore),
    document.matchedDocumentId ?? "",
    matchedDocument?.originalFilename ?? ""
  ];
}

export function buildDocumentsCsv(rows: ExportDocumentRow[]): string {
  return rowsToCsv([Array.from(exportCsvHeaders), ...rows.map(exportDocumentToCsvRow)]);
}
