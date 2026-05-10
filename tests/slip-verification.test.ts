import { describe, expect, it } from "vitest";
import { attemptSlipVerification } from "../lib/slip-verification";
import type { TransferMetadataParseAnalysisResult } from "../lib/models";

function parsedThaiQrMetadata(input: {
  targetIdentifier?: string | null;
  targetIdentifierType?: "PROMPTPAY_MOBILE" | "PROMPTPAY_NATIONAL_ID_OR_TAX_ID" | "PROMPTPAY_EWALLET" | "BILLER_ID" | "UNKNOWN";
  amount?: string | null;
  crc?: string | null;
  countryCode?: string | null;
  currencyCode?: string | null;
  rawPayload?: string;
} = {}): TransferMetadataParseAnalysisResult {
  const crc = input.crc ?? "7938";
  const rawPayload =
    input.rawPayload ??
    `00020101021229370016A000000677010111011300668123456785802TH53037645406100.005909TEST SHOP6007BANGKOK6304${crc}`;

  return {
    stage: "TRANSFER_METADATA_PARSE",
    algorithm: "transfer-metadata-parse-v1",
    status: "COMPLETED",
    result: "PARSED",
    payloadFormat: "THAI_QR_PAYMENT",
    parsedAt: new Date("2026-05-08T10:00:00.000Z"),
    metadata: {
      emvVersion: "01",
      initiationMethod: "12",
      merchantAccountInfo: {
        tag: "29",
        applicationId: "A000000677010111",
        subtype: "PROMPTPAY",
        targetIdentifier: input.targetIdentifier ?? "0066812345678",
        targetIdentifierType: input.targetIdentifierType ?? "PROMPTPAY_MOBILE",
        references: {
          reference1: null,
          reference2: null,
          reference3: null
        }
      },
      countryCode: input.countryCode ?? "TH",
      currencyCode: input.currencyCode ?? "764",
      amount: input.amount ?? "100.00",
      merchantName: "TEST SHOP",
      merchantCity: "BANGKOK",
      crc,
      rawTopLevelTags: {}
    },
    rawPayload,
    notes: ["Structured metadata was parsed from decoded QR content. Parsed values are not verified."],
    warnings: []
  };
}

function unsupportedTransferMetadata(): TransferMetadataParseAnalysisResult {
  return {
    stage: "TRANSFER_METADATA_PARSE",
    algorithm: "transfer-metadata-parse-v1",
    status: "COMPLETED",
    result: "UNSUPPORTED_FORMAT",
    payloadFormat: "GENERIC_URL",
    parsedAt: new Date("2026-05-08T10:00:00.000Z"),
    metadata: null,
    rawPayload: "https://example.com/payment/12345",
    notes: ["Decoded QR payload is a generic URL and was not treated as transfer metadata."],
    warnings: []
  };
}

describe("slip verification local structural validation", () => {
  it("marks supported Thai QR metadata as structurally consistent when required local fields and CRC checksum are valid", () => {
    const result = attemptSlipVerification({
      transferMetadata: parsedThaiQrMetadata(),
      evaluatedAt: new Date("2026-05-10T08:00:00.000Z")
    });

    expect(result).toMatchObject({
      stage: "SLIP_VERIFICATION",
      algorithm: "slip-verification-local-structural-v1",
      status: "COMPLETED",
      result: "STRUCTURALLY_CONSISTENT",
      evidenceCategory: "LOCAL_STRUCTURAL_CHECK"
    });
    expect(result.notes.join(" ")).toContain("does not confirm payment completion");
  });

  it("marks supported Thai QR metadata as structurally inconsistent when CRC checksum is invalid", () => {
    const result = attemptSlipVerification({
      transferMetadata: parsedThaiQrMetadata({ crc: "ABCD" }),
      evaluatedAt: new Date("2026-05-10T08:00:00.000Z")
    });

    expect(result).toMatchObject({
      algorithm: "slip-verification-local-structural-v1",
      status: "COMPLETED",
      result: "STRUCTURALLY_INCONSISTENT",
      evidenceCategory: "LOCAL_STRUCTURAL_CHECK"
    });
    expect(result.notes).toEqual(expect.arrayContaining([expect.stringContaining("CRC checksum mismatch")]));
  });

  it("marks supported Thai QR metadata as structurally inconsistent when required local fields are missing", () => {
    const result = attemptSlipVerification({
      transferMetadata: parsedThaiQrMetadata({ targetIdentifier: null, targetIdentifierType: "UNKNOWN", crc: null }),
      evaluatedAt: new Date("2026-05-10T08:00:00.000Z")
    });

    expect(result).toMatchObject({
      algorithm: "slip-verification-local-structural-v1",
      status: "COMPLETED",
      result: "STRUCTURALLY_INCONSISTENT",
      evidenceCategory: "LOCAL_STRUCTURAL_CHECK"
    });
    expect(result.notes).toEqual(expect.arrayContaining([expect.stringContaining("Structural issue")]));
  });

  it("marks supported Thai QR metadata as structurally inconsistent when CRC tag is missing", () => {
    const result = attemptSlipVerification({
      transferMetadata: parsedThaiQrMetadata({
        crc: null,
        rawPayload: "00020101021229370016A000000677010111011300668123456785802TH53037645406100.00"
      }),
      evaluatedAt: new Date("2026-05-10T08:00:00.000Z")
    });

    expect(result).toMatchObject({
      algorithm: "slip-verification-local-structural-v1",
      status: "COMPLETED",
      result: "STRUCTURALLY_INCONSISTENT",
      evidenceCategory: "LOCAL_STRUCTURAL_CHECK"
    });
    expect(result.notes).toEqual(expect.arrayContaining([expect.stringContaining("CRC tag (63) is missing")]));
  });

  it("keeps unsupported decoded payloads as no-evidence unsupported results", () => {
    const result = attemptSlipVerification({
      transferMetadata: unsupportedTransferMetadata(),
      evaluatedAt: new Date("2026-05-10T08:00:00.000Z")
    });

    expect(result).toMatchObject({
      algorithm: "slip-verification-scaffold-v1",
      status: "COMPLETED",
      result: "UNSUPPORTED",
      evidenceCategory: "NO_EVIDENCE"
    });
  });

  it("keeps missing transfer metadata as not verified with no evidence", () => {
    const result = attemptSlipVerification({
      transferMetadata: null,
      evaluatedAt: new Date("2026-05-10T08:00:00.000Z")
    });

    expect(result).toMatchObject({
      algorithm: "slip-verification-scaffold-v1",
      status: "COMPLETED",
      result: "NOT_VERIFIED",
      evidenceCategory: "NO_EVIDENCE"
    });
  });
});
