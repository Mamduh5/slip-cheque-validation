import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { documentMatchesExtractedFieldSearch, normalizeAmountForSearch } from "../lib/extracted-field-search";
import type { DocumentRecord, ImageReadTransferFields } from "../lib/models";

function makeDoc(fields: Partial<Record<keyof ImageReadTransferFields, string | null>> = {}): DocumentRecord {
  const now = new Date("2026-05-12T08:00:00.000Z");

  return {
    _id: new ObjectId(),
    userId: "user-1",
    documentType: "BANK_TRANSFER_SLIP",
    sourceType: "UPLOAD",
    originalFilename: "slip.jpg",
    mimeType: "image/jpeg",
    fileSize: 1024,
    originalObject: { bucket: "docs", key: "original" },
    normalizedObject: null,
    normalizedImage: null,
    processingProfile: undefined,
    qrCandidateAnalysis: null,
    qrDecode: null,
    transferMetadata: null,
    slipVerification: null,
    slipImageRead: {
      stage: "SLIP_IMAGE_READ",
      algorithm: "slip-image-read-v1",
      status: "COMPLETED",
      result: "EXTRACTED",
      readAt: now,
      rawOcrText: "raw text should not be searched by this helper",
      notes: [],
      warnings: [],
      extractedFields: {
        amount: { value: fields.amount ?? null, confidence: "HIGH", source: "test" },
        senderName: { value: fields.senderName ?? null, confidence: "HIGH", source: "test" },
        receiverName: { value: fields.receiverName ?? null, confidence: "HIGH", source: "test" },
        dateTime: { value: fields.dateTime ?? null, confidence: "HIGH", source: "test" },
        transactionReference: { value: fields.transactionReference ?? null, confidence: "HIGH", source: "test" },
        senderBank: { value: fields.senderBank ?? null, confidence: "HIGH", source: "test" },
        receiverBank: { value: fields.receiverBank ?? null, confidence: "HIGH", source: "test" },
        senderAccountTail: { value: fields.senderAccountTail ?? null, confidence: "HIGH", source: "test" },
        receiverAccountTail: { value: fields.receiverAccountTail ?? null, confidence: "HIGH", source: "test" }
      }
    },
    status: "READY",
    duplicateStatus: "LIKELY_DUPLICATE",
    duplicateDecisionType: "LIKELY_DUPLICATE_REVIEW",
    duplicateDecisionReasons: ["IMAGE_SIMILARITY_ONLY"],
    matchedDocumentId: null,
    similarityScore: 0.94,
    reviewStatus: "PENDING",
    reviewedAt: null,
    reviewedMatchDocumentId: null,
    qualityStatus: "PASS",
    qualityWarnings: [],
    qualityMetrics: null,
    qualityCheckedAt: null,
    exactHash: "hash",
    perceptualHash: "ffff0000ffff0000",
    notes: null,
    createdAt: now,
    updatedAt: now
  };
}

describe("documentMatchesExtractedFieldSearch", () => {
  it("matches amount with numeric normalization", () => {
    const doc = makeDoc({ amount: "1,500.00" });

    expect(normalizeAmountForSearch("1500")).toBe("1500.00");
    expect(documentMatchesExtractedFieldSearch(doc, "1500")).toBe(true);
  });

  it("matches reference numbers with OCR-safe reference normalization", () => {
    const doc = makeDoc({ transactionReference: "016126175244BTF00250" });

    expect(documentMatchesExtractedFieldSearch(doc, "O16126175244BTF00250")).toBe(true);
  });

  it("matches receiver names with Thai name normalization", () => {
    const doc = makeDoc({ receiverName: "นาย สมชาย ใจดี" });

    expect(documentMatchesExtractedFieldSearch(doc, "สมชายใจดี")).toBe(true);
  });

  it("matches sender names", () => {
    const doc = makeDoc({ senderName: "Alice Sender" });

    expect(documentMatchesExtractedFieldSearch(doc, "alice")).toBe(true);
  });

  it("matches date/time values with Thai date normalization", () => {
    const doc = makeDoc({ dateTime: "6 พ.ค.69 17:52" });

    expect(documentMatchesExtractedFieldSearch(doc, "6 พ . ค . 69")).toBe(true);
  });

  it("matches lower-priority bank and account tail fields", () => {
    const doc = makeDoc({ receiverBank: "SCB", receiverAccountTail: "5678" });

    expect(documentMatchesExtractedFieldSearch(doc, "scb")).toBe(true);
    expect(documentMatchesExtractedFieldSearch(doc, "5678")).toBe(true);
  });

  it("does not search raw OCR text when structured fields do not match", () => {
    const doc = makeDoc({ receiverName: "Alice Receiver" });

    expect(documentMatchesExtractedFieldSearch(doc, "raw text")).toBe(false);
  });
});
