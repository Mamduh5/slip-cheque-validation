import { describe, expect, it } from "vitest";
import { attemptTransferMetadataParse, classifyDecodedPayload } from "../lib/transfer-metadata-parse";
import type { QrDecodeAnalysisResult } from "../lib/models";

const thaiPromptPayPayload =
  "00020101021229370016A000000677010111011300668123456785802TH53037645406100.005909TEST SHOP6007BANGKOK6304ABCD";

function decodedQr(rawDecodedText: string): QrDecodeAnalysisResult {
  return {
    stage: "QR_DECODE",
    algorithm: "jsqr-decode-v1",
    status: "COMPLETED",
    result: "QR_DECODED",
    decodedAt: new Date("2026-05-08T10:00:00.000Z"),
    rawDecodedText,
    decodedTextLength: rawDecodedText.length,
    sourceImageType: "normalized-image",
    notes: ["QR content was successfully decoded from the normalized image."]
  };
}

describe("transfer metadata parse", () => {
  it("classifies and parses supported Thai QR payment payloads", () => {
    const result = attemptTransferMetadataParse({
      qrDecode: decodedQr(thaiPromptPayPayload),
      parsedAt: new Date("2026-05-08T10:00:00.000Z")
    });

    expect(classifyDecodedPayload(thaiPromptPayPayload)).toBe("THAI_QR_PAYMENT");
    expect(result).toMatchObject({
      stage: "TRANSFER_METADATA_PARSE",
      algorithm: "transfer-metadata-parse-v1",
      status: "COMPLETED",
      result: "PARSED",
      payloadFormat: "THAI_QR_PAYMENT",
      metadata: {
        emvVersion: "01",
        initiationMethod: "12",
        countryCode: "TH",
        currencyCode: "764",
        amount: "100.00",
        merchantName: "TEST SHOP",
        merchantCity: "BANGKOK",
        crc: "ABCD",
        merchantAccountInfo: {
          tag: "29",
          applicationId: "A000000677010111",
          subtype: "PROMPTPAY",
          targetIdentifier: "0066812345678",
          targetIdentifierType: "PROMPTPAY_MOBILE"
        }
      }
    });
  });

  it("classifies generic URLs as unsupported transfer metadata formats", () => {
    const result = attemptTransferMetadataParse({
      qrDecode: decodedQr("https://example.com/payment/12345"),
      parsedAt: new Date("2026-05-08T10:00:00.000Z")
    });

    expect(result).toMatchObject({
      status: "COMPLETED",
      result: "UNSUPPORTED_FORMAT",
      payloadFormat: "GENERIC_URL",
      metadata: null
    });
  });

  it("classifies plain text as no structured transfer metadata", () => {
    const result = attemptTransferMetadataParse({
      qrDecode: decodedQr("plain transfer note only"),
      parsedAt: new Date("2026-05-08T10:00:00.000Z")
    });

    expect(result).toMatchObject({
      status: "COMPLETED",
      result: "NO_STRUCTURED_METADATA",
      payloadFormat: "PLAIN_TEXT",
      metadata: null
    });
  });

  it("skips parsing when decoded QR content is unavailable", () => {
    const result = attemptTransferMetadataParse({
      qrDecode: {
        stage: "QR_DECODE",
        algorithm: "jsqr-decode-v1",
        status: "COMPLETED",
        result: "NO_QR_DECODED",
        decodedAt: new Date("2026-05-08T10:00:00.000Z"),
        rawDecodedText: null,
        decodedTextLength: null,
        sourceImageType: "normalized-image",
        notes: ["QR decode was attempted on the normalized image but no valid QR code was found."]
      },
      parsedAt: new Date("2026-05-08T10:00:00.000Z")
    });

    expect(result).toMatchObject({
      status: "SKIPPED",
      result: "NO_STRUCTURED_METADATA",
      payloadFormat: "UNKNOWN_FORMAT",
      metadata: null
    });
  });
});
