import { describe, expect, it } from "vitest";
import { assessTransferSlipDuplicateCandidate } from "../lib/transfer-slip-duplicate-assessment";
import type { DocumentRecord } from "../lib/models";

function makeQrDecode(rawDecodedText: string | null): NonNullable<DocumentRecord["qrDecode"]> {
  return {
    stage: "QR_DECODE",
    algorithm: "jsqr-decode-v1",
    status: "COMPLETED",
    result: rawDecodedText ? "QR_DECODED" : "NO_QR_DECODED",
    decodedAt: new Date("2026-05-10T10:00:00.000Z"),
    rawDecodedText,
    decodedTextLength: rawDecodedText?.length ?? null,
    sourceImageType: "normalized-image",
    notes: []
  };
}

function makeTransferMetadata(
  amount: string | null,
  targetIdentifier: string | null,
  reference1: string | null,
  rawPayload: string | null
): NonNullable<DocumentRecord["transferMetadata"]> {
  return {
    stage: "TRANSFER_METADATA_PARSE",
    algorithm: "transfer-metadata-parse-v1",
    status: "COMPLETED",
    result: "PARSED",
    payloadFormat: "THAI_QR_PAYMENT",
    parsedAt: new Date("2026-05-10T10:00:00.000Z"),
    metadata: {
      emvVersion: "01",
      initiationMethod: "11",
      merchantAccountInfo: {
        tag: "29",
        applicationId: "A000000677010111",
        subtype: "PROMPTPAY",
        targetIdentifier,
        targetIdentifierType: "PROMPTPAY_MOBILE",
        references: {
          reference1,
          reference2: null,
          reference3: null
        }
      },
      countryCode: "TH",
      currencyCode: "764",
      amount,
      merchantName: null,
      merchantCity: null,
      crc: "A1B2",
      rawTopLevelTags: {}
    },
    rawPayload,
    notes: [],
    warnings: []
  };
}

describe("assessTransferSlipDuplicateCandidate", () => {
  it("returns MATCH for identical raw QR payloads", () => {
    const payload = "00020101021129370016A00000067701011101130066812345678...";
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(payload), transferMetadata: makeTransferMetadata(null, null, null, null) },
      { qrDecode: makeQrDecode(payload), transferMetadata: makeTransferMetadata(null, null, null, null) }
    );

    expect(result.result).toBe("MATCH");
    expect(result.positiveEvidence).toContain("identical raw QR payload");
    expect(result.conflicts).toHaveLength(0);
  });

  it("returns CONFLICT for different raw QR payloads", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode("payload-a-123"), transferMetadata: makeTransferMetadata(null, null, null, null) },
      { qrDecode: makeQrDecode("payload-b-456"), transferMetadata: makeTransferMetadata(null, null, null, null) }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("different raw QR payload");
    expect(result.positiveEvidence).toHaveLength(0);
    expect(result.notes).toContain("Suppressed near-duplicate");
  });

  it("returns CONFLICT for different amounts", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("73.00", "0812345678", "REF001", "raw-a") },
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("40.00", "0812345678", "REF001", "raw-b") }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("different amount");
  });

  it("returns CONFLICT for different recipients", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("100.00", "0811111111", "REF001", "raw-a") },
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("100.00", "0822222222", "REF001", "raw-b") }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("different recipient");
  });

  it("returns CONFLICT for different transaction references", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("100.00", "0811111111", "REF001", "raw-a") },
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("100.00", "0811111111", "REF002", "raw-b") }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("different transaction reference");
  });

  it("returns CONFLICT for different raw metadata payloads", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata(null, null, null, "payload-abc") },
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata(null, null, null, "payload-def") }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("different transfer metadata payload");
  });

  it("returns MATCH when definitive signals align (identical QR and raw payload)", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode("same-qr"), transferMetadata: makeTransferMetadata("50.00", "0811111111", "REF001", "same-payload") },
      { qrDecode: makeQrDecode("same-qr"), transferMetadata: makeTransferMetadata("50.00", "0811111111", "REF001", "same-payload") }
    );

    expect(result.result).toBe("MATCH");
    expect(result.positiveEvidence).toContain("identical raw QR payload");
    expect(result.positiveEvidence).toContain("identical transfer metadata payload");
  });

  it("returns INSUFFICIENT_EVIDENCE when only one side has structured data", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode("some-qr"), transferMetadata: makeTransferMetadata("50.00", "0811111111", "REF001", "payload") },
      { qrDecode: makeQrDecode(null), transferMetadata: null }
    );

    expect(result.result).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.conflicts).toHaveLength(0);
    expect(result.positiveEvidence).toHaveLength(0);
  });

  it("returns INSUFFICIENT_EVIDENCE when both sides lack parsed metadata", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(null), transferMetadata: null },
      { qrDecode: makeQrDecode(null), transferMetadata: null }
    );

    expect(result.result).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("returns CONFLICT when strong conflicts exist even if other fields match", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("50.00", "0811111111", "REF001", "payload-a") },
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("50.00", "0811111111", "REF002", "payload-b") }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("different transaction reference");
    expect(result.conflicts).toContain("different transfer metadata payload");
  });
});
