/**
 * Pure formatting and path-resolution helpers for the
 * inspect-transfer-slip dev runner.
 */

import path from "node:path";
import type { ImageReadField, ImageReadTransferFields } from "@/lib/models";
import { normalizeReferenceForCompare, normalizeThaiDateTimeForCompare, normalizeThaiNameForCompare } from "@/lib/slip-ocr-normalization";

export function resolveImagePath(input: string, fixtureDir: string): string {
  if (path.isAbsolute(input) || input.includes("/") || input.includes("\\")) {
    return path.resolve(input);
  }
  return path.join(fixtureDir, input);
}

export function formatField(field: ImageReadField | undefined): string {
  if (!field || field.value === null) return "—";
  return `${field.value} (${field.confidence.toLowerCase()})`;
}

function maybeNormLine(label: string, rawValue: string | null, normalize: (v: string | null) => string): string | null {
  if (!rawValue) return null;
  const norm = normalize(rawValue);
  if (norm !== rawValue.toLowerCase().replace(/\s+/g, " ").trim()) {
    return `${label}${norm}`;
  }
  return null;
}

export function formatFieldsLines(fields: ImageReadTransferFields | null): string[] {
  if (!fields) {
    return ["  (no fields extracted)"];
  }
  const lines: string[] = [
    `  Amount:              ${formatField(fields.amount)}`,
    `  Sender name:         ${formatField(fields.senderName)}`,
  ];
  const normSender = maybeNormLine("  Norm. sender name:   ", fields.senderName.value, normalizeThaiNameForCompare);
  if (normSender) lines.push(normSender);
  lines.push(`  Receiver name:       ${formatField(fields.receiverName)}`);
  const normReceiver = maybeNormLine("  Norm. receiver name: ", fields.receiverName.value, normalizeThaiNameForCompare);
  if (normReceiver) lines.push(normReceiver);
  lines.push(`  Date/Time:           ${formatField(fields.dateTime)}`);
  const normDt = maybeNormLine("  Norm. datetime:      ", fields.dateTime.value, normalizeThaiDateTimeForCompare);
  if (normDt) lines.push(normDt);
  lines.push(`  Transaction ref:     ${formatField(fields.transactionReference)}`);
  const normRef = maybeNormLine("  Norm. ref:           ", fields.transactionReference.value, normalizeReferenceForCompare);
  if (normRef) lines.push(normRef);
  lines.push(
    `  Sender bank:         ${formatField(fields.senderBank)}`,
    `  Receiver bank:       ${formatField(fields.receiverBank)}`,
    `  Sender acct tail:    ${formatField(fields.senderAccountTail)}`,
    `  Receiver acct tail:  ${formatField(fields.receiverAccountTail)}`,
  );
  return lines;
}

export function formatFields(fields: ImageReadTransferFields | null): string {
  return formatFieldsLines(fields).join("\n") + "\n";
}
