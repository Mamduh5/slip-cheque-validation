/**
 * Pure formatting and path-resolution helpers for the
 * inspect-transfer-slip dev runner.
 */

import path from "node:path";
import type { ImageReadField, ImageReadTransferFields } from "@/lib/models";

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

export function formatFieldsLines(fields: ImageReadTransferFields | null): string[] {
  if (!fields) {
    return ["  (no fields extracted)"];
  }
  return [
    `  Amount:              ${formatField(fields.amount)}`,
    `  Sender name:         ${formatField(fields.senderName)}`,
    `  Receiver name:       ${formatField(fields.receiverName)}`,
    `  Date/Time:           ${formatField(fields.dateTime)}`,
    `  Transaction ref:     ${formatField(fields.transactionReference)}`,
    `  Sender bank:         ${formatField(fields.senderBank)}`,
    `  Receiver bank:       ${formatField(fields.receiverBank)}`,
    `  Sender acct tail:    ${formatField(fields.senderAccountTail)}`,
    `  Receiver acct tail:  ${formatField(fields.receiverAccountTail)}`,
  ];
}

export function formatFields(fields: ImageReadTransferFields | null): string {
  return formatFieldsLines(fields).join("\n") + "\n";
}
