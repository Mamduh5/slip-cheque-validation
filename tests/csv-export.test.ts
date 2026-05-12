import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { buildDocumentsCsv, exportCsvHeaders, exportDocumentToCsvRow, rowsToCsv } from "../lib/csv-export";
import type { DocumentRecord } from "../lib/models";

function makeDoc(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  const now = new Date("2026-05-12T09:30:00.000Z");

  return {
    _id: new ObjectId("64f000000000000000000001"),
    userId: "user-1",
    documentType: "BANK_TRANSFER_SLIP",
    sourceType: "UPLOAD",
    originalFilename: "slip, quoted.jpg",
    mimeType: "image/jpeg",
    fileSize: 1000,
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
      rawOcrText: "not exported",
      notes: [],
      warnings: [],
      extractedFields: {
        amount: { value: "500.00", confidence: "HIGH", source: "test" },
        transactionReference: { value: "016126175244BTF00250", confidence: "HIGH", source: "test" },
        receiverName: { value: "Bob Receiver", confidence: "HIGH", source: "test" },
        senderName: { value: "Alice Sender", confidence: "HIGH", source: "test" },
        dateTime: { value: "6 พ.ค.69 17:52", confidence: "HIGH", source: "test" },
        receiverBank: { value: "SCB", confidence: "HIGH", source: "test" },
        senderBank: { value: "KBANK", confidence: "HIGH", source: "test" },
        receiverAccountTail: { value: "5678", confidence: "HIGH", source: "test" },
        senderAccountTail: { value: "1234", confidence: "HIGH", source: "test" }
      }
    },
    status: "READY",
    duplicateStatus: "LIKELY_DUPLICATE",
    duplicateDecisionType: "LIKELY_DUPLICATE_REVIEW",
    duplicateDecisionReasons: ["IMAGE_SIMILARITY_ONLY"],
    matchedDocumentId: "64f000000000000000000002",
    similarityScore: 0.9375,
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
    updatedAt: now,
    ...overrides
  };
}

describe("CSV export", () => {
  it("escapes CSV cells safely", () => {
    expect(rowsToCsv([["plain", "with, comma", "with \"quote\""]])).toBe(
      'plain,"with, comma","with ""quote"""\r\n'
    );
  });

  it("formats the export header and compact operational row", () => {
    const row = exportDocumentToCsvRow({
      document: makeDoc(),
      matchedDocument: makeDoc({ _id: new ObjectId("64f000000000000000000002"), originalFilename: "matched.jpg" })
    });

    expect(exportCsvHeaders).toContain("amount (extracted)");
    expect(row).toContain("slip, quoted.jpg");
    expect(row).toContain("Bank transfer slip");
    expect(row).toContain("Likely duplicate");
    expect(row).toContain("LIKELY_DUPLICATE_REVIEW");
    expect(row).toContain("image similarity only");
    expect(row).toContain("500.00");
    expect(row).toContain("matched.jpg");
    expect(row.join(" ")).not.toContain("not exported");
  });

  it("builds a CSV document with headers and rows", () => {
    const csv = buildDocumentsCsv([{ document: makeDoc(), matchedDocument: null }]);

    expect(csv.startsWith("document id,filename,created at")).toBe(true);
    expect(csv).toContain('"slip, quoted.jpg"');
    expect(csv).toContain("016126175244BTF00250");
  });
});

