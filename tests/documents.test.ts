import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { getDocumentProcessingProfile, getTypeAwareProcessingPlan } from "../lib/document-processing-profiles";
import {
  formatDocumentType,
  getDocumentTypeDescription,
  getDocumentTypeGuidance,
  getDocumentTypeProcessingProfile
} from "../lib/document-types";
import { buildDocumentObjectKey, buildUploadedDocumentRecord, calculateSha256 } from "../lib/documents";

describe("document helpers", () => {
  it("formats and describes supported document types", () => {
    expect(formatDocumentType("BANK_TRANSFER_SLIP")).toBe("Bank transfer slip");
    expect(formatDocumentType("DEPOSIT_PAYMENT_SLIP")).toBe("Deposit/payment slip");
    expect(formatDocumentType("CHEQUE")).toBe("Cheque");
    expect(formatDocumentType("UNKNOWN")).toBe("Not sure / unknown");
    expect(getDocumentTypeDescription("UNKNOWN")).toContain("unclear");
    expect(getDocumentTypeGuidance("CHEQUE").title).toContain("cheques");
    expect(getDocumentTypeProcessingProfile("CHEQUE")).toMatchObject({
      type: "CHEQUE",
      name: "cheque-v1",
      futureChequeExtractionCandidate: true
    });
  });

  it("selects type-aware processing profiles for all supported document types", () => {
    expect(getTypeAwareProcessingPlan("BANK_TRANSFER_SLIP")).toMatchObject({
      specializedBranch: "slip",
      profile: {
        name: "bank-transfer-slip-v1",
        branch: "TRANSFER_SLIP",
        futureStages: expect.arrayContaining(["qr-candidate-handling"])
      }
    });
    expect(getTypeAwareProcessingPlan("DEPOSIT_PAYMENT_SLIP")).toMatchObject({
      specializedBranch: "payment-slip",
      profile: { branch: "PAYMENT_SLIP" }
    });
    expect(getTypeAwareProcessingPlan("CHEQUE")).toMatchObject({
      specializedBranch: "cheque",
      profile: { branch: "CHEQUE" }
    });
    expect(getTypeAwareProcessingPlan("UNKNOWN")).toMatchObject({
      specializedBranch: "generic",
      profile: { branch: "GENERIC" }
    });
  });

  it("calculates stable SHA-256 exact hashes", () => {
    expect(calculateSha256(Buffer.from("same image bytes"))).toBe(
      "f10266197016b8e8842aeba6800100997ce04f35a45a3bff974711e9615ea597"
    );
  });

  it("builds safe original object keys with the document id", () => {
    expect(
      buildDocumentObjectKey({
        userId: "user-1",
        documentId: "document-1",
        originalFilename: "receipt.final.JPG"
      })
    ).toBe("documents/user-1/document-1/original.jpg");
  });

  it("builds a new document record from a non-duplicate decision", () => {
    const id = new ObjectId();
    const now = new Date("2026-05-08T10:00:00.000Z");

    const record = buildUploadedDocumentRecord({
      documentId: id,
      now,
      userId: "user-1",
      documentType: "CHEQUE",
      sourceType: "UPLOAD",
      originalFilename: "cheque.jpg",
      mimeType: "image/jpeg",
      fileSize: 128,
      originalObject: { bucket: "document-images", key: "documents/user-1/id/original.jpg" },
      normalizedObject: { bucket: "document-images", key: "documents/user-1/id/normalized.webp" },
      normalizedImage: {
        width: 32,
        height: 24,
        mimeType: "image/webp",
        fileSize: 96,
        algorithm: "normalized-webp-grayscale-v1"
      },
      processingProfile: getDocumentProcessingProfile("CHEQUE"),
      exactHash: "abc123",
      perceptualHash: "0000000000000000",
      qualityStatus: "PASS",
      qualityWarnings: [],
      qualityMetrics: {
        width: 1000,
        height: 800,
        meanLuminance: 128,
        sharpness: 120
      },
      qualityCheckedAt: now,
      duplicateDecision: {
        duplicateStatus: "NEW",
        matchedDocumentId: null,
        similarityScore: null
      }
    });

    expect(record).toMatchObject({
      _id: id,
      userId: "user-1",
      duplicateStatus: "NEW",
      matchedDocumentId: null,
      similarityScore: null,
      reviewStatus: "NOT_REQUIRED",
      reviewedAt: null,
      reviewedMatchDocumentId: null,
      qualityStatus: "PASS",
      qualityWarnings: [],
      exactHash: "abc123",
      perceptualHash: "0000000000000000",
      processingProfile: {
        name: "cheque-v1",
        branch: "CHEQUE"
      },
      status: "READY"
    });
    expect(record.createdAt).toBe(now);
    expect(record.updatedAt).toBe(now);
  });

  it("builds an exact duplicate document record linked to the matched document", () => {
    const matchedDocumentId = String(new ObjectId());

    const record = buildUploadedDocumentRecord({
      documentId: new ObjectId(),
      now: new Date("2026-05-08T10:00:00.000Z"),
      userId: "user-2",
      documentType: "UNKNOWN",
      sourceType: "CAMERA",
      originalFilename: "duplicate.webp",
      mimeType: "image/webp",
      fileSize: 256,
      originalObject: { bucket: "document-images", key: "documents/user-2/id/original.webp" },
      normalizedObject: { bucket: "document-images", key: "documents/user-2/id/normalized.webp" },
      normalizedImage: {
        width: 32,
        height: 24,
        mimeType: "image/webp",
        fileSize: 96,
        algorithm: "normalized-webp-grayscale-v1"
      },
      processingProfile: getDocumentProcessingProfile("UNKNOWN"),
      exactHash: "abc123",
      perceptualHash: "ffffffffffffffff",
      qualityStatus: "PASS",
      qualityWarnings: [],
      qualityMetrics: {
        width: 1000,
        height: 800,
        meanLuminance: 128,
        sharpness: 120
      },
      qualityCheckedAt: new Date("2026-05-08T10:00:00.000Z"),
      duplicateDecision: {
        duplicateStatus: "EXACT_DUPLICATE",
        matchedDocumentId,
        similarityScore: 1
      }
    });

    expect(record.duplicateStatus).toBe("EXACT_DUPLICATE");
    expect(record.reviewStatus).toBe("NOT_REQUIRED");
    expect(record.matchedDocumentId).toBe(matchedDocumentId);
    expect(record.similarityScore).toBe(1);
  });

  it("builds a pending review state for likely duplicate records", () => {
    const matchedDocumentId = String(new ObjectId());

    const record = buildUploadedDocumentRecord({
      documentId: new ObjectId(),
      now: new Date("2026-05-08T10:00:00.000Z"),
      userId: "user-2",
      documentType: "UNKNOWN",
      sourceType: "CAMERA",
      originalFilename: "near.webp",
      mimeType: "image/webp",
      fileSize: 256,
      originalObject: { bucket: "document-images", key: "documents/user-2/id/original.webp" },
      normalizedObject: { bucket: "document-images", key: "documents/user-2/id/normalized.webp" },
      normalizedImage: {
        width: 32,
        height: 24,
        mimeType: "image/webp",
        fileSize: 96,
        algorithm: "normalized-webp-grayscale-v1"
      },
      processingProfile: getDocumentProcessingProfile("UNKNOWN"),
      exactHash: "abc123",
      perceptualHash: "ffffffffffffffff",
      qualityStatus: "WARN",
      qualityWarnings: ["BLURRY_IMAGE"],
      qualityMetrics: {
        width: 1000,
        height: 800,
        meanLuminance: 128,
        sharpness: 12
      },
      qualityCheckedAt: new Date("2026-05-08T10:00:00.000Z"),
      duplicateDecision: {
        duplicateStatus: "LIKELY_DUPLICATE",
        matchedDocumentId,
        similarityScore: 0.9375
      }
    });

    expect(record.duplicateStatus).toBe("LIKELY_DUPLICATE");
    expect(record.reviewStatus).toBe("PENDING");
    expect(record.reviewedAt).toBeNull();
    expect(record.reviewedMatchDocumentId).toBeNull();
    expect(record.qualityStatus).toBe("WARN");
    expect(record.qualityWarnings).toEqual(["BLURRY_IMAGE"]);
  });
});
