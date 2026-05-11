import { describe, expect, it } from "vitest";
import { assessTransferSlipDuplicateCandidate } from "../lib/transfer-slip-duplicate-assessment";
import type { DocumentRecord, ImageReadTransferFields } from "../lib/models";

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

function emptyImageReadFields(): ImageReadTransferFields {
  const empty = { value: null, confidence: "NONE" as const, source: "none" };
  return {
    amount: empty,
    senderName: empty,
    receiverName: empty,
    dateTime: empty,
    transactionReference: empty,
    senderBank: empty,
    receiverBank: empty,
    senderAccountTail: empty,
    receiverAccountTail: empty
  };
}

function makeImageReadFields(overrides: Partial<Record<keyof ImageReadTransferFields, { value: string | null; confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE"; source?: string }>> = {}): ImageReadTransferFields {
  const base = emptyImageReadFields();
  for (const key of Object.keys(overrides) as Array<keyof ImageReadTransferFields>) {
    const override = overrides[key];
    if (override) {
      base[key] = { value: override.value, confidence: override.confidence, source: override.source ?? "regex" };
    }
  }
  return base;
}

describe("assessTransferSlipDuplicateCandidate", () => {
  it("returns MATCH for identical raw QR payloads", () => {
    const payload = "00020101021129370016A00000067701011101130066812345678...";
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(payload), transferMetadata: makeTransferMetadata(null, null, null, null), slipImageRead: null },
      { qrDecode: makeQrDecode(payload), transferMetadata: makeTransferMetadata(null, null, null, null), slipImageRead: null }
    );

    expect(result.result).toBe("MATCH");
    expect(result.positiveEvidence).toContain("identical raw QR payload");
    expect(result.conflicts).toHaveLength(0);
    expect(result.reasonCodes).toEqual(["IDENTICAL_QR_PAYLOAD"]);
  });

  it("returns CONFLICT for different raw QR payloads", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode("payload-a-123"), transferMetadata: makeTransferMetadata(null, null, null, null), slipImageRead: null },
      { qrDecode: makeQrDecode("payload-b-456"), transferMetadata: makeTransferMetadata(null, null, null, null), slipImageRead: null }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("different raw QR payload");
    expect(result.positiveEvidence).toHaveLength(0);
    expect(result.notes).toContain("Suppressed near-duplicate");
    expect(result.reasonCodes).toEqual(["QR_PAYLOAD_MISMATCH"]);
  });

  it("returns CONFLICT for different amounts", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("73.00", "0812345678", "REF001", null), slipImageRead: null },
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("40.00", "0812345678", "REF001", null), slipImageRead: null }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("different amount");
    expect(result.reasonCodes).toEqual(["AMOUNT_MISMATCH"]);
  });

  it("returns CONFLICT for different recipients", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("100.00", "0811111111", "REF001", null), slipImageRead: null },
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("100.00", "0822222222", "REF001", null), slipImageRead: null }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("different recipient");
    expect(result.reasonCodes).toEqual(["RECIPIENT_MISMATCH"]);
  });

  it("returns CONFLICT for different transaction references", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("100.00", "0811111111", "REF001", null), slipImageRead: null },
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("100.00", "0811111111", "REF002", null), slipImageRead: null }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("different transaction reference");
    expect(result.reasonCodes).toEqual(["REFERENCE_MISMATCH"]);
  });

  it("returns CONFLICT for different raw metadata payloads", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata(null, null, null, "payload-abc"), slipImageRead: null },
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata(null, null, null, "payload-def"), slipImageRead: null }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("different transfer metadata payload");
    expect(result.reasonCodes).toEqual(["TRANSFER_METADATA_PAYLOAD_MISMATCH"]);
  });

  it("returns MATCH when definitive signals align (identical QR and raw payload)", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode("same-qr"), transferMetadata: makeTransferMetadata("50.00", "0811111111", "REF001", "same-payload"), slipImageRead: null },
      { qrDecode: makeQrDecode("same-qr"), transferMetadata: makeTransferMetadata("50.00", "0811111111", "REF001", "same-payload"), slipImageRead: null }
    );

    expect(result.result).toBe("MATCH");
    expect(result.positiveEvidence).toContain("identical raw QR payload");
    expect(result.positiveEvidence).toContain("identical transfer metadata payload");
    expect(result.reasonCodes).toEqual(["IDENTICAL_QR_PAYLOAD", "IDENTICAL_TRANSFER_METADATA_PAYLOAD"]);
  });

  it("returns INSUFFICIENT_EVIDENCE when only one side has structured data", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode("some-qr"), transferMetadata: makeTransferMetadata("50.00", "0811111111", "REF001", "payload"), slipImageRead: null },
      { qrDecode: makeQrDecode(null), transferMetadata: null, slipImageRead: null }
    );

    expect(result.result).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.conflicts).toHaveLength(0);
    expect(result.positiveEvidence).toHaveLength(0);
    expect(result.reasonCodes).toEqual(["IMAGE_SIMILARITY_ONLY"]);
  });

  it("returns INSUFFICIENT_EVIDENCE when both sides lack parsed metadata", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(null), transferMetadata: null, slipImageRead: null },
      { qrDecode: makeQrDecode(null), transferMetadata: null, slipImageRead: null }
    );

    expect(result.result).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.reasonCodes).toEqual(["IMAGE_SIMILARITY_ONLY"]);
  });

  it("returns CONFLICT when strong conflicts exist even if other fields match", () => {
    const result = assessTransferSlipDuplicateCandidate(
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("50.00", "0811111111", "REF001", "payload-a"), slipImageRead: null },
      { qrDecode: makeQrDecode(null), transferMetadata: makeTransferMetadata("50.00", "0811111111", "REF002", "payload-b"), slipImageRead: null }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("different transaction reference");
    expect(result.conflicts).toContain("different transfer metadata payload");
    expect(result.reasonCodes).toEqual(["TRANSFER_METADATA_PAYLOAD_MISMATCH", "REFERENCE_MISMATCH"]);
  });

  it("returns CONFLICT from image-read different amount (HIGH confidence)", () => {
    const result = assessTransferSlipDuplicateCandidate(
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ amount: { value: "1,250.00", confidence: "HIGH" } }), rawOcrText: "a", notes: [], warnings: [] }
      },
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ amount: { value: "999.00", confidence: "HIGH" } }), rawOcrText: "b", notes: [], warnings: [] }
      }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("image-read different amount");
    expect(result.reasonCodes).toEqual(["IMAGE_READ_AMOUNT_MISMATCH"]);
  });

  it("returns CONFLICT from image-read different receiver name (HIGH confidence)", () => {
    const result = assessTransferSlipDuplicateCandidate(
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ receiverName: { value: "Somchai Jaidee", confidence: "HIGH" } }), rawOcrText: "a", notes: [], warnings: [] }
      },
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ receiverName: { value: "Suda Prasert", confidence: "HIGH" } }), rawOcrText: "b", notes: [], warnings: [] }
      }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("image-read different recipient");
    expect(result.reasonCodes).toEqual(["IMAGE_READ_RECIPIENT_MISMATCH"]);
  });

  it("returns CONFLICT from image-read different transaction reference (HIGH confidence)", () => {
    const result = assessTransferSlipDuplicateCandidate(
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ transactionReference: { value: "TRX-001", confidence: "HIGH" } }), rawOcrText: "a", notes: [], warnings: [] }
      },
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ transactionReference: { value: "TRX-002", confidence: "HIGH" } }), rawOcrText: "b", notes: [], warnings: [] }
      }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("image-read different transaction reference");
    expect(result.reasonCodes).toEqual(["IMAGE_READ_REFERENCE_MISMATCH"]);
  });

  it("returns CONFLICT from image-read different date/time (HIGH confidence)", () => {
    const result = assessTransferSlipDuplicateCandidate(
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ dateTime: { value: "11/05/2026 10:21:00", confidence: "HIGH" } }), rawOcrText: "a", notes: [], warnings: [] }
      },
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ dateTime: { value: "12/05/2026 14:30:00", confidence: "HIGH" } }), rawOcrText: "b", notes: [], warnings: [] }
      }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("image-read different date/time");
    expect(result.reasonCodes).toEqual(["IMAGE_READ_DATETIME_MISMATCH"]);
  });

  it("returns CONFLICT from image-read different receiver bank (HIGH confidence)", () => {
    const result = assessTransferSlipDuplicateCandidate(
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ receiverBank: { value: "KBANK", confidence: "HIGH" } }), rawOcrText: "a", notes: [], warnings: [] }
      },
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ receiverBank: { value: "SCB", confidence: "HIGH" } }), rawOcrText: "b", notes: [], warnings: [] }
      }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("image-read different receiver bank");
    expect(result.reasonCodes).toEqual(["IMAGE_READ_BANK_MISMATCH"]);
  });

  it("uses MEDIUM confidence amount to suppress (amount is a strong field)", () => {
    const result = assessTransferSlipDuplicateCandidate(
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ amount: { value: "1,250.00", confidence: "MEDIUM" } }), rawOcrText: "a", notes: [], warnings: [] }
      },
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ amount: { value: "999.00", confidence: "MEDIUM" } }), rawOcrText: "b", notes: [], warnings: [] }
      }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("image-read different amount");
    expect(result.reasonCodes).toContain("IMAGE_READ_AMOUNT_MISMATCH");
  });

  it("uses MEDIUM confidence reference to suppress (reference is a strong field)", () => {
    const result = assessTransferSlipDuplicateCandidate(
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ transactionReference: { value: "016126175244BTF00250", confidence: "MEDIUM" } }), rawOcrText: "a", notes: [], warnings: [] }
      },
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ transactionReference: { value: "016127083448102590", confidence: "MEDIUM" } }), rawOcrText: "b", notes: [], warnings: [] }
      }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("image-read different transaction reference");
    expect(result.reasonCodes).toContain("IMAGE_READ_REFERENCE_MISMATCH");
  });

  it("ignores LOW confidence image-read fields", () => {
    const result = assessTransferSlipDuplicateCandidate(
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ amount: { value: "1,250.00", confidence: "LOW" } }), rawOcrText: "a", notes: [], warnings: [] }
      },
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: { stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(), extractedFields: makeImageReadFields({ amount: { value: "999.00", confidence: "LOW" } }), rawOcrText: "b", notes: [], warnings: [] }
      }
    );

    expect(result.result).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.reasonCodes).toEqual(["IMAGE_SIMILARITY_ONLY"]);
  });

  it("suppresses when two MEDIUM supporting fields conflict (multi-signal)", () => {
    const result = assessTransferSlipDuplicateCandidate(
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: {
          stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(),
          extractedFields: makeImageReadFields({
            receiverName: { value: "Alice Smith", confidence: "MEDIUM" },
            senderName: { value: "Bob Jones", confidence: "MEDIUM" }
          }),
          rawOcrText: "a", notes: [], warnings: []
        }
      },
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: {
          stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(),
          extractedFields: makeImageReadFields({
            receiverName: { value: "Charlie Brown", confidence: "MEDIUM" },
            senderName: { value: "Dave Wilson", confidence: "MEDIUM" }
          }),
          rawOcrText: "b", notes: [], warnings: []
        }
      }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("image-read different recipient");
    expect(result.conflicts).toContain("image-read different sender");
    expect(result.reasonCodes).toContain("IMAGE_READ_RECIPIENT_MISMATCH");
    expect(result.reasonCodes).toContain("IMAGE_READ_SENDER_MISMATCH");
  });

  it("does not suppress on a single MEDIUM supporting field alone (insufficient for suppression)", () => {
    const result = assessTransferSlipDuplicateCandidate(
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: {
          stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(),
          extractedFields: makeImageReadFields({
            receiverName: { value: "Alice Smith", confidence: "MEDIUM" }
          }),
          rawOcrText: "a", notes: [], warnings: []
        }
      },
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: {
          stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(),
          extractedFields: makeImageReadFields({
            receiverName: { value: "Bob Jones", confidence: "MEDIUM" }
          }),
          rawOcrText: "b", notes: [], warnings: []
        }
      }
    );

    expect(result.result).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.reasonCodes).toEqual(["IMAGE_SIMILARITY_ONLY"]);
  });

  it("includes single MEDIUM supporting field in reason codes when another conflict already exists", () => {
    const result = assessTransferSlipDuplicateCandidate(
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: {
          stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(),
          extractedFields: makeImageReadFields({
            amount: { value: "500.00", confidence: "MEDIUM" },
            dateTime: { value: "11/05/2026 10:00:00", confidence: "MEDIUM" }
          }),
          rawOcrText: "a", notes: [], warnings: []
        }
      },
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: {
          stage: "SLIP_IMAGE_READ", algorithm: "slip-image-read-v1", status: "COMPLETED", result: "EXTRACTED", readAt: new Date(),
          extractedFields: makeImageReadFields({
            amount: { value: "999.00", confidence: "MEDIUM" },
            dateTime: { value: "12/05/2026 14:30:00", confidence: "MEDIUM" }
          }),
          rawOcrText: "b", notes: [], warnings: []
        }
      }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("image-read different amount");
    expect(result.conflicts).toContain("image-read different date/time");
    expect(result.reasonCodes).toContain("IMAGE_READ_AMOUNT_MISMATCH");
    expect(result.reasonCodes).toContain("IMAGE_READ_DATETIME_MISMATCH");
  });

  it("uses image-read conflicts to suppress even when QR metadata is missing", () => {
    const result = assessTransferSlipDuplicateCandidate(
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: {
          stage: "SLIP_IMAGE_READ",
          algorithm: "slip-image-read-v1",
          status: "COMPLETED",
          result: "EXTRACTED",
          readAt: new Date(),
          extractedFields: makeImageReadFields({
            amount: { value: "500.00", confidence: "HIGH" },
            receiverName: { value: "Alice Smith", confidence: "HIGH" },
            transactionReference: { value: "REF-A1", confidence: "HIGH" }
          }),
          rawOcrText: "a",
          notes: [],
          warnings: []
        }
      },
      {
        qrDecode: makeQrDecode(null),
        transferMetadata: null,
        slipImageRead: {
          stage: "SLIP_IMAGE_READ",
          algorithm: "slip-image-read-v1",
          status: "COMPLETED",
          result: "EXTRACTED",
          readAt: new Date(),
          extractedFields: makeImageReadFields({
            amount: { value: "750.00", confidence: "HIGH" },
            receiverName: { value: "Bob Jones", confidence: "HIGH" },
            transactionReference: { value: "REF-B2", confidence: "HIGH" }
          }),
          rawOcrText: "b",
          notes: [],
          warnings: []
        }
      }
    );

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("image-read different amount");
    expect(result.conflicts).toContain("image-read different recipient");
    expect(result.conflicts).toContain("image-read different transaction reference");
    expect(result.reasonCodes).toEqual([
      "IMAGE_READ_AMOUNT_MISMATCH",
      "IMAGE_READ_REFERENCE_MISMATCH",
      "IMAGE_READ_RECIPIENT_MISMATCH"
    ]);
  });

  it("regression: suppresses two clearly different real-world slips via image-read (BTF00250 vs COR07936 scenario)", () => {
    // Simulates the negative pair where both slips are visually similar bank transfer
    // confirmations but represent different transactions. No QR metadata is available,
    // so image-read fields must drive suppression.
    const btf00250 = {
      qrDecode: makeQrDecode(null),
      transferMetadata: null,
      slipImageRead: {
        stage: "SLIP_IMAGE_READ" as const,
        algorithm: "slip-image-read-v1" as const,
        status: "COMPLETED" as const,
        result: "EXTRACTED" as const,
        readAt: new Date("2026-05-11T08:00:00.000Z"),
        extractedFields: makeImageReadFields({
          amount: { value: "250.00", confidence: "HIGH" },
          senderName: { value: "John Doe", confidence: "HIGH" },
          receiverName: { value: "ABC Corp", confidence: "HIGH" },
          dateTime: { value: "11/05/2026 08:15:00", confidence: "HIGH" },
          transactionReference: { value: "BTF00250", confidence: "HIGH" },
          receiverBank: { value: "BBL", confidence: "HIGH" },
          senderAccountTail: { value: "1234", confidence: "MEDIUM" },
          receiverAccountTail: { value: "5678", confidence: "MEDIUM" }
        }),
        rawOcrText: "Amount 250.00 From John Doe To ABC Corp Ref BTF00250",
        notes: [],
        warnings: []
      }
    };

    const cor07936 = {
      qrDecode: makeQrDecode(null),
      transferMetadata: null,
      slipImageRead: {
        stage: "SLIP_IMAGE_READ" as const,
        algorithm: "slip-image-read-v1" as const,
        status: "COMPLETED" as const,
        result: "EXTRACTED" as const,
        readAt: new Date("2026-05-11T09:30:00.000Z"),
        extractedFields: makeImageReadFields({
          amount: { value: "7936.00", confidence: "HIGH" },
          senderName: { value: "Jane Roe", confidence: "HIGH" },
          receiverName: { value: "XYZ Ltd", confidence: "HIGH" },
          dateTime: { value: "11/05/2026 09:30:00", confidence: "HIGH" },
          transactionReference: { value: "COR07936", confidence: "HIGH" },
          receiverBank: { value: "KBANK", confidence: "HIGH" },
          senderAccountTail: { value: "9999", confidence: "MEDIUM" },
          receiverAccountTail: { value: "1111", confidence: "MEDIUM" }
        }),
        rawOcrText: "Amount 7936.00 From Jane Roe To XYZ Ltd Ref COR07936",
        notes: [],
        warnings: []
      }
    };

    const result = assessTransferSlipDuplicateCandidate(btf00250, cor07936);

    expect(result.result).toBe("CONFLICT");
    expect(result.conflicts).toContain("image-read different amount");
    expect(result.conflicts).toContain("image-read different sender");
    expect(result.conflicts).toContain("image-read different recipient");
    expect(result.conflicts).toContain("image-read different date/time");
    expect(result.conflicts).toContain("image-read different transaction reference");
    expect(result.conflicts).toContain("image-read different receiver bank");
    expect(result.reasonCodes).toEqual([
      "IMAGE_READ_AMOUNT_MISMATCH",
      "IMAGE_READ_REFERENCE_MISMATCH",
      "IMAGE_READ_RECIPIENT_MISMATCH",
      "IMAGE_READ_SENDER_MISMATCH",
      "IMAGE_READ_DATETIME_MISMATCH",
      "IMAGE_READ_BANK_MISMATCH"
    ]);
    expect(result.notes).toContain("Suppressed near-duplicate");
  });

  it("regression: suppresses when only amount and reference differ (common real-slip scenario)", () => {
    const slipA = {
      qrDecode: makeQrDecode(null),
      transferMetadata: null,
      slipImageRead: {
        stage: "SLIP_IMAGE_READ" as const,
        algorithm: "slip-image-read-v1" as const,
        status: "COMPLETED" as const,
        result: "EXTRACTED" as const,
        readAt: new Date(),
        extractedFields: makeImageReadFields({
          amount: { value: "1500.00", confidence: "HIGH" },
          receiverName: { value: "Somchai Jaidee", confidence: "HIGH" },
          transactionReference: { value: "TRX-1111", confidence: "HIGH" },
          dateTime: { value: "10/05/2026 14:00:00", confidence: "HIGH" }
        }),
        rawOcrText: "a",
        notes: [],
        warnings: []
      }
    };

    const slipB = {
      qrDecode: makeQrDecode(null),
      transferMetadata: null,
      slipImageRead: {
        stage: "SLIP_IMAGE_READ" as const,
        algorithm: "slip-image-read-v1" as const,
        status: "COMPLETED" as const,
        result: "EXTRACTED" as const,
        readAt: new Date(),
        extractedFields: makeImageReadFields({
          amount: { value: "3200.00", confidence: "HIGH" },
          receiverName: { value: "Somchai Jaidee", confidence: "HIGH" },
          transactionReference: { value: "TRX-2222", confidence: "HIGH" },
          dateTime: { value: "10/05/2026 16:30:00", confidence: "HIGH" }
        }),
        rawOcrText: "b",
        notes: [],
        warnings: []
      }
    };

    const result = assessTransferSlipDuplicateCandidate(slipA, slipB);

    expect(result.result).toBe("CONFLICT");
    // Same receiver should NOT produce a conflict
    expect(result.conflicts).not.toContain("image-read different recipient");
    expect(result.conflicts).toContain("image-read different amount");
    expect(result.conflicts).toContain("image-read different date/time");
    expect(result.conflicts).toContain("image-read different transaction reference");
    expect(result.reasonCodes).toEqual([
      "IMAGE_READ_AMOUNT_MISMATCH",
      "IMAGE_READ_REFERENCE_MISMATCH",
      "IMAGE_READ_DATETIME_MISMATCH"
    ]);
  });
});
