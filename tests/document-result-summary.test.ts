import { describe, expect, it } from "vitest";
import { buildResultSummary, toneClasses } from "../lib/document-result-summary";
import type { DocumentRecord } from "../lib/models";

function makeDocument(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  const now = new Date("2026-05-10T10:00:00.000Z");

  return {
    _id: undefined,
    userId: "user-1",
    documentType: "UNKNOWN",
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
    status: "READY",
    duplicateStatus: "NEW",
    matchedDocumentId: null,
    similarityScore: null,
    reviewStatus: "NOT_REQUIRED",
    reviewedAt: null,
    reviewedMatchDocumentId: null,
    qualityStatus: "PASS",
    qualityWarnings: [],
    qualityMetrics: null,
    qualityCheckedAt: null,
    exactHash: "abc123",
    perceptualHash: "ffff0000ffff0000",
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe("buildResultSummary", () => {
  it("shows new upload for a basic document", () => {
    const summary = buildResultSummary(makeDocument());
    const duplicate = summary.find((s) => s.label === "Duplicate check");

    expect(duplicate?.value).toBe("New upload");
    expect(duplicate?.tone).toBe("positive");
  });

  it("shows exact duplicate", () => {
    const summary = buildResultSummary(makeDocument({ duplicateStatus: "EXACT_DUPLICATE" }));
    const duplicate = summary.find((s) => s.label === "Duplicate check");

    expect(duplicate?.value).toBe("Exact duplicate found");
    expect(duplicate?.tone).toBe("info");
  });

  it("shows likely duplicate with review needed", () => {
    const summary = buildResultSummary(
      makeDocument({ duplicateStatus: "LIKELY_DUPLICATE", reviewStatus: "PENDING" })
    );
    const duplicate = summary.find((s) => s.label === "Duplicate check");
    const review = summary.find((s) => s.label === "Review");

    expect(duplicate?.value).toBe("Likely duplicate — review needed");
    expect(duplicate?.tone).toBe("warning");
    expect(review?.value).toBe("Pending your review");
    expect(review?.tone).toBe("warning");
  });

  it("shows suppressed near-duplicate when notes indicate suppression", () => {
    const summary = buildResultSummary(
      makeDocument({
        duplicateStatus: "NEW",
        notes: "Suppressed near-duplicate: different amount, different recipient"
      })
    );
    const duplicate = summary.find((s) => s.label === "Duplicate check");
    const note = summary.find((s) => s.label === "Note");

    expect(duplicate?.value).toBe("New upload (near-duplicate suppressed)");
    expect(duplicate?.tone).toBe("positive");
    expect(note?.value).toBe("Suppressed near-duplicate: different amount, different recipient");
    expect(note?.tone).toBe("info");
  });

  it("shows confirmed duplicate review status", () => {
    const summary = buildResultSummary(
      makeDocument({ reviewStatus: "CONFIRMED_DUPLICATE" })
    );
    const review = summary.find((s) => s.label === "Review");

    expect(review?.value).toBe("Confirmed duplicate");
    expect(review?.tone).toBe("info");
  });

  it("shows confirmed distinct review status", () => {
    const summary = buildResultSummary(
      makeDocument({ reviewStatus: "CONFIRMED_DISTINCT" })
    );
    const review = summary.find((s) => s.label === "Review");

    expect(review?.value).toBe("Confirmed distinct");
    expect(review?.tone).toBe("positive");
  });

  it("shows quality warnings", () => {
    const summary = buildResultSummary(
      makeDocument({ qualityStatus: "WARN", qualityWarnings: ["BLURRY_IMAGE", "TOO_DARK"] })
    );
    const quality = summary.find((s) => s.label === "Quality");

    expect(quality?.value).toBe("2 warnings detected");
    expect(quality?.tone).toBe("warning");
  });

  it("shows single quality warning with singular wording", () => {
    const summary = buildResultSummary(
      makeDocument({ qualityStatus: "WARN", qualityWarnings: ["IMAGE_TOO_SMALL"] })
    );
    const quality = summary.find((s) => s.label === "Quality");

    expect(quality?.value).toBe("1 warning detected");
  });

  it("shows transfer-slip QR decode and metadata results", () => {
    const summary = buildResultSummary(
      makeDocument({
        documentType: "BANK_TRANSFER_SLIP",
        qrDecode: {
          stage: "QR_DECODE",
          algorithm: "jsqr-decode-v1",
          status: "COMPLETED",
          result: "QR_DECODED",
          decodedAt: new Date(),
          rawDecodedText: "some-qr-text",
          decodedTextLength: 12,
          sourceImageType: "normalized-image",
          notes: []
        },
        transferMetadata: {
          stage: "TRANSFER_METADATA_PARSE",
          algorithm: "transfer-metadata-parse-v1",
          status: "COMPLETED",
          result: "PARSED",
          payloadFormat: "THAI_QR_PAYMENT",
          parsedAt: new Date(),
          metadata: null,
          rawPayload: "payload",
          notes: [],
          warnings: []
        }
      })
    );

    const qr = summary.find((s) => s.label === "QR decode");
    const metadata = summary.find((s) => s.label === "Metadata");

    expect(qr?.value).toBe("Decoded");
    expect(metadata?.value).toBe("Parsed");
  });

  it("shows slip verification structural consistency", () => {
    const summary = buildResultSummary(
      makeDocument({
        documentType: "BANK_TRANSFER_SLIP",
        slipVerification: {
          stage: "SLIP_VERIFICATION",
          algorithm: "slip-verification-local-structural-v1",
          status: "COMPLETED",
          result: "STRUCTURALLY_CONSISTENT",
          evidenceCategory: "LOCAL_STRUCTURAL_CHECK",
          evaluatedAt: new Date(),
          notes: []
        }
      })
    );

    const localCheck = summary.find((s) => s.label === "Local check");

    expect(localCheck?.value).toBe("Structurally consistent");
    expect(localCheck?.tone).toBe("positive");
  });

  it("shows slip verification structural inconsistency", () => {
    const summary = buildResultSummary(
      makeDocument({
        documentType: "BANK_TRANSFER_SLIP",
        slipVerification: {
          stage: "SLIP_VERIFICATION",
          algorithm: "slip-verification-local-structural-v1",
          status: "COMPLETED",
          result: "STRUCTURALLY_INCONSISTENT",
          evidenceCategory: "LOCAL_STRUCTURAL_CHECK",
          evaluatedAt: new Date(),
          notes: []
        }
      })
    );

    const localCheck = summary.find((s) => s.label === "Local check");

    expect(localCheck?.value).toBe("Structural inconsistency found");
    expect(localCheck?.tone).toBe("warning");
  });

  it("does not show transfer-slip fields for non-slip types", () => {
    const summary = buildResultSummary(makeDocument({ documentType: "CHEQUE" }));

    expect(summary.some((s) => s.label === "QR decode")).toBe(false);
    expect(summary.some((s) => s.label === "Metadata")).toBe(false);
    expect(summary.some((s) => s.label === "Local check")).toBe(false);
  });

  it("does not show review status when not required", () => {
    const summary = buildResultSummary(makeDocument({ reviewStatus: "NOT_REQUIRED" }));

    expect(summary.some((s) => s.label === "Review")).toBe(false);
  });

  it("does not show quality section when quality is PASS with no warnings", () => {
    const summary = buildResultSummary(makeDocument({ qualityStatus: "PASS", qualityWarnings: [] }));

    expect(summary.some((s) => s.label === "Quality")).toBe(false);
  });

  it("does not contain overclaiming terms in any summary value", () => {
    const summary = buildResultSummary(
      makeDocument({
        documentType: "BANK_TRANSFER_SLIP",
        duplicateStatus: "LIKELY_DUPLICATE",
        reviewStatus: "PENDING",
        qualityStatus: "WARN",
        qualityWarnings: ["BLURRY_IMAGE"],
        slipVerification: {
          stage: "SLIP_VERIFICATION",
          algorithm: "slip-verification-local-structural-v1",
          status: "COMPLETED",
          result: "STRUCTURALLY_CONSISTENT",
          evidenceCategory: "LOCAL_STRUCTURAL_CHECK",
          evaluatedAt: new Date(),
          notes: []
        },
        qrDecode: {
          stage: "QR_DECODE",
          algorithm: "jsqr-decode-v1",
          status: "COMPLETED",
          result: "QR_DECODED",
          decodedAt: new Date(),
          rawDecodedText: "text",
          decodedTextLength: 4,
          sourceImageType: "normalized-image",
          notes: []
        },
        transferMetadata: {
          stage: "TRANSFER_METADATA_PARSE",
          algorithm: "transfer-metadata-parse-v1",
          status: "COMPLETED",
          result: "PARSED",
          payloadFormat: "THAI_QR_PAYMENT",
          parsedAt: new Date(),
          metadata: null,
          rawPayload: "payload",
          notes: [],
          warnings: []
        }
      })
    );

    const allText = summary.map((s) => s.value).join(" ").toLowerCase();

    const forbidden = [
      "verified payment",
      "confirmed transfer",
      "bank truth",
      "provider truth",
      "payment truth",
      "authenticity"
    ];

    for (const term of forbidden) {
      expect(allText).not.toContain(term);
    }
  });
});

describe("toneClasses", () => {
  it("returns correct classes for each tone", () => {
    expect(toneClasses("positive")).toContain("emerald");
    expect(toneClasses("warning")).toContain("orange");
    expect(toneClasses("info")).toContain("sky");
    expect(toneClasses("neutral")).toContain("slate");
  });
});
