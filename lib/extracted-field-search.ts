import type { DocumentRecord, ImageReadTransferFields } from "@/lib/models";
import {
  normalizeReferenceForCompare,
  normalizeThaiDateTimeForCompare,
  normalizeThaiNameForCompare
} from "@/lib/slip-ocr-normalization";

const searchableImageReadFields: Array<keyof ImageReadTransferFields> = [
  "amount",
  "transactionReference",
  "receiverName",
  "senderName",
  "dateTime",
  "receiverBank",
  "senderBank",
  "receiverAccountTail",
  "senderAccountTail"
];

export function normalizeAmountForSearch(value: string | null): string {
  if (!value) return "";
  const normalized = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!/\d/.test(normalized)) {
    return value.trim().toLowerCase();
  }
  const numberValue = Number(normalized);

  if (!Number.isFinite(numberValue)) {
    return value.trim().toLowerCase();
  }

  return numberValue.toFixed(2);
}

export function normalizeBasicSearchText(value: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function includesNormalized(candidate: string, query: string) {
  return candidate !== "" && query !== "" && candidate.includes(query);
}

function getFieldValue(document: DocumentRecord, field: keyof ImageReadTransferFields): string | null {
  return document.slipImageRead?.extractedFields?.[field]?.value ?? null;
}

function documentReferenceValues(document: DocumentRecord): string[] {
  const refs = [
    getFieldValue(document, "transactionReference"),
    document.transferMetadata?.metadata?.merchantAccountInfo?.references.reference1 ?? null,
    document.transferMetadata?.metadata?.merchantAccountInfo?.references.reference2 ?? null,
    document.transferMetadata?.metadata?.merchantAccountInfo?.references.reference3 ?? null
  ];

  return refs.filter((value): value is string => Boolean(value));
}

function documentAmountValues(document: DocumentRecord): string[] {
  return [getFieldValue(document, "amount"), document.transferMetadata?.metadata?.amount ?? null].filter(
    (value): value is string => Boolean(value)
  );
}

function documentDateTimeValues(document: DocumentRecord): string[] {
  return [getFieldValue(document, "dateTime")].filter((value): value is string => Boolean(value));
}

function documentNameValues(document: DocumentRecord): string[] {
  return [getFieldValue(document, "receiverName"), getFieldValue(document, "senderName")].filter(
    (value): value is string => Boolean(value)
  );
}

export function documentMatchesExtractedFieldSearch(document: DocumentRecord, rawQuery: string | undefined): boolean {
  const raw = rawQuery?.trim() ?? "";
  const query = normalizeBasicSearchText(raw);

  if (!query) {
    return true;
  }

  const amountQuery = normalizeAmountForSearch(query);
  if (
    amountQuery &&
    documentAmountValues(document).some((value) => {
      const amountValue = normalizeAmountForSearch(value);
      return amountValue === amountQuery || includesNormalized(amountValue, amountQuery);
    })
  ) {
    return true;
  }

  const referenceQuery = normalizeReferenceForCompare(raw);
  if (
    referenceQuery &&
    documentReferenceValues(document).some((value) => {
      const referenceValue = normalizeReferenceForCompare(value);
      return referenceValue === referenceQuery || includesNormalized(referenceValue, referenceQuery);
    })
  ) {
    return true;
  }

  const nameQuery = normalizeThaiNameForCompare(query);
  if (
    nameQuery &&
    documentNameValues(document).some((value) => {
      const normalizedName = normalizeThaiNameForCompare(value);
      const basicName = normalizeBasicSearchText(value);
      return includesNormalized(normalizedName, nameQuery) || includesNormalized(basicName, query);
    })
  ) {
    return true;
  }

  const dateQuery = normalizeThaiDateTimeForCompare(query);
  if (
    dateQuery &&
    documentDateTimeValues(document).some((value) => {
      const dateValue = normalizeThaiDateTimeForCompare(value);
      return includesNormalized(dateValue, dateQuery) || includesNormalized(normalizeBasicSearchText(value), query);
    })
  ) {
    return true;
  }

  return searchableImageReadFields.some((field) => {
    const value = getFieldValue(document, field);
    return includesNormalized(normalizeBasicSearchText(value), query);
  });
}
