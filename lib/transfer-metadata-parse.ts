import type {
  QrDecodeAnalysisResult,
  TransferMetadataFields,
  TransferMetadataParseAnalysisResult,
  TransferMetadataPayloadFormat
} from "@/lib/models";

const parseAlgorithm = "transfer-metadata-parse-v1" as const;
const thaiPromptPayApplicationId = "A000000677010111";
const thaiBillPaymentApplicationId = "A000000677010112";

type TlvEntry = {
  tag: string;
  value: string;
};

export function attemptTransferMetadataParse(input: {
  qrDecode: QrDecodeAnalysisResult | null;
  parsedAt?: Date;
}): TransferMetadataParseAnalysisResult {
  const parsedAt = input.parsedAt ?? new Date();

  if (!input.qrDecode) {
    return {
      stage: "TRANSFER_METADATA_PARSE",
      algorithm: parseAlgorithm,
      status: "NOT_APPLICABLE",
      result: "NO_STRUCTURED_METADATA",
      payloadFormat: "UNKNOWN_FORMAT",
      parsedAt,
      metadata: null,
      rawPayload: null,
      notes: ["Transfer metadata parse was not attempted because QR decode results are not available."],
      warnings: []
    };
  }

  if (input.qrDecode.status !== "COMPLETED" || input.qrDecode.result !== "QR_DECODED" || !input.qrDecode.rawDecodedText) {
    return {
      stage: "TRANSFER_METADATA_PARSE",
      algorithm: parseAlgorithm,
      status: "SKIPPED",
      result: "NO_STRUCTURED_METADATA",
      payloadFormat: "UNKNOWN_FORMAT",
      parsedAt,
      metadata: null,
      rawPayload: null,
      notes: ["Transfer metadata parse was skipped because no decoded QR payload is available."],
      warnings: []
    };
  }

  const rawPayload = input.qrDecode.rawDecodedText.trim();
  const payloadFormat = classifyDecodedPayload(rawPayload);

  if (payloadFormat === "GENERIC_URL") {
    return unsupportedFormatResult({
      parsedAt,
      payloadFormat,
      rawPayload,
      notes: ["Decoded QR payload is a generic URL and was not treated as transfer metadata."]
    });
  }

  if (payloadFormat === "PLAIN_TEXT") {
    return {
      stage: "TRANSFER_METADATA_PARSE",
      algorithm: parseAlgorithm,
      status: "COMPLETED",
      result: "NO_STRUCTURED_METADATA",
      payloadFormat,
      parsedAt,
      metadata: null,
      rawPayload,
      notes: ["Decoded QR payload is plain text without a supported structured transfer metadata format."],
      warnings: []
    };
  }

  if (payloadFormat !== "THAI_QR_PAYMENT") {
    return unsupportedFormatResult({
      parsedAt,
      payloadFormat,
      rawPayload,
      notes: ["Decoded QR payload did not match a supported transfer metadata format."]
    });
  }

  const parsedMetadata = parseThaiQrPaymentPayload(rawPayload);

  if (!parsedMetadata) {
    return {
      stage: "TRANSFER_METADATA_PARSE",
      algorithm: parseAlgorithm,
      status: "FAILED",
      result: "PARSE_FAILED",
      payloadFormat,
      parsedAt,
      metadata: null,
      rawPayload,
      notes: ["Decoded QR payload was classified as Thai QR payment, but structured metadata parsing failed."],
      warnings: []
    };
  }

  return {
    stage: "TRANSFER_METADATA_PARSE",
    algorithm: parseAlgorithm,
    status: "COMPLETED",
    result: parsedMetadata.metadata.merchantAccountInfo ? "PARSED" : "NO_STRUCTURED_METADATA",
    payloadFormat,
    parsedAt,
    metadata: parsedMetadata.metadata,
    rawPayload,
    notes: ["Structured metadata was parsed from decoded QR content. Parsed values are not verified."],
    warnings: parsedMetadata.warnings
  };
}

export function classifyDecodedPayload(rawPayload: string): TransferMetadataPayloadFormat {
  const payload = rawPayload.trim();

  if (/^https?:\/\//i.test(payload)) {
    return "GENERIC_URL";
  }

  const topLevelEntries = parseTlvEntries(payload);

  if (topLevelEntries && isThaiQrPaymentPayload(topLevelEntries)) {
    return "THAI_QR_PAYMENT";
  }

  if (/^[\x20-\x7E\r\n\t]+$/.test(payload)) {
    return "PLAIN_TEXT";
  }

  return "UNKNOWN_FORMAT";
}

function unsupportedFormatResult(input: {
  parsedAt: Date;
  payloadFormat: TransferMetadataPayloadFormat;
  rawPayload: string;
  notes: string[];
}): TransferMetadataParseAnalysisResult {
  return {
    stage: "TRANSFER_METADATA_PARSE",
    algorithm: parseAlgorithm,
    status: "COMPLETED",
    result: "UNSUPPORTED_FORMAT",
    payloadFormat: input.payloadFormat,
    parsedAt: input.parsedAt,
    metadata: null,
    rawPayload: input.rawPayload,
    notes: input.notes,
    warnings: []
  };
}

function parseThaiQrPaymentPayload(payload: string): { metadata: TransferMetadataFields; warnings: string[] } | null {
  const topLevelEntries = parseTlvEntries(payload);

  if (!topLevelEntries) {
    return null;
  }

  const topLevelTags = entriesToRecord(topLevelEntries);
  const merchantAccountInfo = findThaiMerchantAccountInfo(topLevelEntries);
  const warnings: string[] = [];
  const amount = topLevelTags["54"] ?? null;

  if (amount !== null && !/^\d+(\.\d{1,2})?$/.test(amount)) {
    warnings.push("Amount tag was present but did not match the expected decimal format.");
  }

  return {
    metadata: {
      emvVersion: topLevelTags["00"] ?? null,
      initiationMethod: topLevelTags["01"] ?? null,
      merchantAccountInfo,
      countryCode: topLevelTags["58"] ?? null,
      currencyCode: topLevelTags["53"] ?? null,
      amount,
      merchantName: topLevelTags["59"] ?? null,
      merchantCity: topLevelTags["60"] ?? null,
      crc: topLevelTags["63"] ?? null,
      rawTopLevelTags: topLevelTags
    },
    warnings
  };
}

function isThaiQrPaymentPayload(entries: TlvEntry[]) {
  const topLevelTags = entriesToRecord(entries);

  if (topLevelTags["00"] !== "01" || topLevelTags["58"] !== "TH" || topLevelTags["53"] !== "764") {
    return false;
  }

  return findThaiMerchantAccountInfo(entries) !== null;
}

function findThaiMerchantAccountInfo(entries: TlvEntry[]): TransferMetadataFields["merchantAccountInfo"] {
  for (const entry of entries) {
    const tagNumber = Number(entry.tag);

    if (!Number.isInteger(tagNumber) || tagNumber < 26 || tagNumber > 51) {
      continue;
    }

    const nestedEntries = parseTlvEntries(entry.value);

    if (!nestedEntries) {
      continue;
    }

    const nestedTags = entriesToRecord(nestedEntries);
    const applicationId = nestedTags["00"] ?? null;

    if (applicationId !== thaiPromptPayApplicationId && applicationId !== thaiBillPaymentApplicationId) {
      continue;
    }

    const subtype =
      applicationId === thaiPromptPayApplicationId
        ? "PROMPTPAY"
        : applicationId === thaiBillPaymentApplicationId
          ? "BILL_PAYMENT"
          : "UNKNOWN_THAI_QR";

    return {
      tag: entry.tag,
      applicationId,
      subtype,
      targetIdentifier: getTargetIdentifier(subtype, nestedTags),
      targetIdentifierType: getTargetIdentifierType(subtype, nestedTags),
      references: {
        reference1: subtype === "BILL_PAYMENT" ? nestedTags["02"] ?? null : null,
        reference2: subtype === "BILL_PAYMENT" ? nestedTags["03"] ?? null : null,
        reference3: subtype === "BILL_PAYMENT" ? nestedTags["04"] ?? null : null
      }
    };
  }

  return null;
}

function getTargetIdentifier(
  subtype: "PROMPTPAY" | "BILL_PAYMENT" | "UNKNOWN_THAI_QR",
  nestedTags: Record<string, string>
) {
  if (subtype === "PROMPTPAY") {
    return nestedTags["01"] ?? nestedTags["02"] ?? nestedTags["03"] ?? null;
  }

  if (subtype === "BILL_PAYMENT") {
    return nestedTags["01"] ?? null;
  }

  return null;
}

function getTargetIdentifierType(
  subtype: "PROMPTPAY" | "BILL_PAYMENT" | "UNKNOWN_THAI_QR",
  nestedTags: Record<string, string>
): NonNullable<TransferMetadataFields["merchantAccountInfo"]>["targetIdentifierType"] {
  if (subtype === "BILL_PAYMENT") {
    return nestedTags["01"] ? "BILLER_ID" : "UNKNOWN";
  }

  if (subtype === "PROMPTPAY") {
    if (nestedTags["01"]) {
      return "PROMPTPAY_MOBILE";
    }

    if (nestedTags["02"]) {
      return "PROMPTPAY_NATIONAL_ID_OR_TAX_ID";
    }

    if (nestedTags["03"]) {
      return "PROMPTPAY_EWALLET";
    }
  }

  return "UNKNOWN";
}

function parseTlvEntries(payload: string): TlvEntry[] | null {
  const entries: TlvEntry[] = [];
  let offset = 0;

  while (offset < payload.length) {
    const tag = payload.slice(offset, offset + 2);
    const lengthText = payload.slice(offset + 2, offset + 4);

    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) {
      return null;
    }

    const length = Number(lengthText);
    const valueStart = offset + 4;
    const valueEnd = valueStart + length;

    if (valueEnd > payload.length) {
      return null;
    }

    entries.push({
      tag,
      value: payload.slice(valueStart, valueEnd)
    });
    offset = valueEnd;
  }

  return entries;
}

function entriesToRecord(entries: TlvEntry[]) {
  return entries.reduce<Record<string, string>>((record, entry) => {
    record[entry.tag] = entry.value;
    return record;
  }, {});
}
