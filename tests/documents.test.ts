import { ObjectId } from "mongodb";
import { describe, expect, it, beforeEach } from "vitest";
import { getDocumentProcessingProfile, getTypeAwareProcessingPlan } from "../lib/document-processing-profiles";
import {
  formatDocumentType,
  getDocumentTypeDescription,
  getDocumentTypeGuidance,
  getDocumentTypeProcessingProfile
} from "../lib/document-types";
import {
  buildDocumentObjectKey,
  buildUploadedDocumentRecord,
  calculateSha256,
  getRecentDocumentsForUser
} from "../lib/documents";
import { getDb } from "../lib/mongodb";
import type { DocumentRecord } from "../lib/models";

function makeSlipImageRead(fields: {
  amount?: string;
  receiverName?: string;
  senderName?: string;
  transactionReference?: string;
  dateTime?: string;
}): NonNullable<DocumentRecord["slipImageRead"]> {
  return {
    stage: "SLIP_IMAGE_READ",
    algorithm: "slip-image-read-v1",
    status: "COMPLETED",
    result: "EXTRACTED",
    readAt: new Date("2026-05-10T10:00:00.000Z"),
    rawOcrText: null,
    notes: [],
    warnings: [],
    extractedFields: {
      amount: { value: fields.amount ?? null, confidence: "HIGH", source: "test" },
      receiverName: { value: fields.receiverName ?? null, confidence: "HIGH", source: "test" },
      senderName: { value: fields.senderName ?? null, confidence: "HIGH", source: "test" },
      dateTime: { value: fields.dateTime ?? null, confidence: "HIGH", source: "test" },
      transactionReference: { value: fields.transactionReference ?? null, confidence: "HIGH", source: "test" },
      senderBank: { value: null, confidence: "NONE", source: "test" },
      receiverBank: { value: null, confidence: "NONE", source: "test" },
      senderAccountTail: { value: null, confidence: "NONE", source: "test" },
      receiverAccountTail: { value: null, confidence: "NONE", source: "test" }
    }
  };
}

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
        family: "transfer-slip",
        capabilities: {
          qrOrientedFuturePath: true,
          qrCandidateAnalysisImplemented: true,
          extractionImplemented: true,
          verificationImplemented: true
        },
        plannedStages: expect.arrayContaining([
          expect.objectContaining({ key: "QR_CANDIDATE", status: "ACTIVE" }),
          expect.objectContaining({ key: "QR_DECODE", status: "ACTIVE" }),
          expect.objectContaining({ key: "TRANSFER_METADATA_PARSE", status: "ACTIVE" }),
          expect.objectContaining({ key: "SLIP_VERIFICATION", status: "ACTIVE" })
        ]),
        currentStages: expect.arrayContaining(["qr-candidate-analysis", "qr-decode", "transfer-metadata-parse", "slip-image-read", "slip-verification-local-structural"]),
        futureStages: expect.arrayContaining(["external-truth-verification"])
      }
    });
    expect(getTypeAwareProcessingPlan("DEPOSIT_PAYMENT_SLIP")).toMatchObject({
      specializedBranch: "payment-slip",
      profile: { branch: "PAYMENT_SLIP" }
    });
    expect(getTypeAwareProcessingPlan("CHEQUE")).toMatchObject({
      specializedBranch: "cheque",
      profile: {
        branch: "CHEQUE",
        capabilities: {
          qrOrientedFuturePath: false,
          qrCandidateAnalysisImplemented: false,
          extractionImplemented: false,
          verificationImplemented: false
        }
      }
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
      qrCandidateAnalysis: null,
      qrDecode: null,
      transferMetadata: null,
      slipVerification: null,
      slipImageRead: null,
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
        duplicateDecisionType: "NEW_UPLOAD",
        duplicateDecisionReasons: [],
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
      qrCandidateAnalysis: null,
      qrDecode: null,
      transferMetadata: null,
      slipVerification: null,
      slipImageRead: null,
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
        duplicateDecisionType: "EXACT_DUPLICATE",
        duplicateDecisionReasons: [],
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
      qrCandidateAnalysis: null,
      qrDecode: null,
      transferMetadata: null,
      slipVerification: null,
      slipImageRead: null,
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
        duplicateDecisionType: "LIKELY_DUPLICATE_REVIEW",
        duplicateDecisionReasons: ["IMAGE_SIMILARITY_ONLY"],
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

describe("document list filtering", () => {
  const userId = "filter-test-user";
  let documentIds: ObjectId[] = [];

  beforeEach(async () => {
    const db = await getDb();
    await db.collection<DocumentRecord>("documents").deleteMany({ userId });

    const now = new Date("2026-05-10T10:00:00.000Z");

    const doc1 = new ObjectId();
    const doc2 = new ObjectId();
    const doc3 = new ObjectId();
    const doc4 = new ObjectId();
    documentIds = [doc1, doc2, doc3, doc4];

    const records: DocumentRecord[] = [
      buildUploadedDocumentRecord({
        documentId: doc1,
        now,
        userId,
        documentType: "BANK_TRANSFER_SLIP",
        sourceType: "UPLOAD",
        originalFilename: "slip.jpg",
        mimeType: "image/jpeg",
        fileSize: 128,
        originalObject: { bucket: "test", key: "doc1/original.jpg" },
        normalizedObject: { bucket: "test", key: "doc1/normalized.webp" },
        normalizedImage: {
          width: 32,
          height: 24,
          mimeType: "image/webp",
          fileSize: 96,
          algorithm: "normalized-webp-grayscale-v1"
        },
        processingProfile: getDocumentProcessingProfile("BANK_TRANSFER_SLIP"),
        qrCandidateAnalysis: null,
        qrDecode: null,
        transferMetadata: null,
        slipVerification: null,
        slipImageRead: makeSlipImageRead({
          amount: "500.00",
          receiverName: "นาย สมชาย ใจดี",
          senderName: "Alice Sender",
          transactionReference: "016126175244BTF00250",
          dateTime: "6 พ.ค.69 17:52"
        }),
        exactHash: "abc123",
        perceptualHash: "0000000000000001",
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
          duplicateDecisionType: "NEW_UPLOAD",
          duplicateDecisionReasons: [],
          matchedDocumentId: null,
          similarityScore: null
        }
      }),
      buildUploadedDocumentRecord({
        documentId: doc2,
        now,
        userId,
        documentType: "CHEQUE",
        sourceType: "UPLOAD",
        originalFilename: "cheque.jpg",
        mimeType: "image/jpeg",
        fileSize: 256,
        originalObject: { bucket: "test", key: "doc2/original.jpg" },
        normalizedObject: { bucket: "test", key: "doc2/normalized.webp" },
        normalizedImage: {
          width: 32,
          height: 24,
          mimeType: "image/webp",
          fileSize: 96,
          algorithm: "normalized-webp-grayscale-v1"
        },
        processingProfile: getDocumentProcessingProfile("CHEQUE"),
        qrCandidateAnalysis: null,
        qrDecode: null,
        transferMetadata: null,
        slipVerification: null,
        slipImageRead: null,
        exactHash: "def456",
        perceptualHash: "0000000000000002",
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
          duplicateStatus: "EXACT_DUPLICATE",
          duplicateDecisionType: "EXACT_DUPLICATE",
          duplicateDecisionReasons: [],
          matchedDocumentId: null,
          similarityScore: 1
        }
      }),
      buildUploadedDocumentRecord({
        documentId: doc3,
        now,
        userId,
        documentType: "BANK_TRANSFER_SLIP",
        sourceType: "UPLOAD",
        originalFilename: "slip2.jpg",
        mimeType: "image/jpeg",
        fileSize: 128,
        originalObject: { bucket: "test", key: "doc3/original.jpg" },
        normalizedObject: { bucket: "test", key: "doc3/normalized.webp" },
        normalizedImage: {
          width: 32,
          height: 24,
          mimeType: "image/webp",
          fileSize: 96,
          algorithm: "normalized-webp-grayscale-v1"
        },
        processingProfile: getDocumentProcessingProfile("BANK_TRANSFER_SLIP"),
        qrCandidateAnalysis: null,
        qrDecode: null,
        transferMetadata: null,
        slipVerification: null,
        slipImageRead: null,
        exactHash: "ghi789",
        perceptualHash: "0000000000000003",
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
          duplicateStatus: "LIKELY_DUPLICATE",
          duplicateDecisionType: "LIKELY_DUPLICATE_REVIEW",
          duplicateDecisionReasons: ["IMAGE_SIMILARITY_ONLY"],
          matchedDocumentId: null,
          similarityScore: 0.9375
        }
      }),
      buildUploadedDocumentRecord({
        documentId: doc4,
        now,
        userId,
        documentType: "DEPOSIT_PAYMENT_SLIP",
        sourceType: "UPLOAD",
        originalFilename: "deposit.jpg",
        mimeType: "image/jpeg",
        fileSize: 128,
        originalObject: { bucket: "test", key: "doc4/original.jpg" },
        normalizedObject: { bucket: "test", key: "doc4/normalized.webp" },
        normalizedImage: {
          width: 32,
          height: 24,
          mimeType: "image/webp",
          fileSize: 96,
          algorithm: "normalized-webp-grayscale-v1"
        },
        processingProfile: getDocumentProcessingProfile("DEPOSIT_PAYMENT_SLIP"),
        qrCandidateAnalysis: null,
        qrDecode: null,
        transferMetadata: null,
        slipVerification: null,
        slipImageRead: null,
        exactHash: "jkl012",
        perceptualHash: "0000000000000004",
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
          duplicateDecisionType: "SUPPRESSED_NEAR_DUPLICATE",
          duplicateDecisionReasons: ["AMOUNT_MISMATCH"],
          matchedDocumentId: null,
          similarityScore: null
        }
      })
    ];

    await db.collection<DocumentRecord>("documents").insertMany(records);
  });

  it("filters by documentType", async () => {
    const documents = await getRecentDocumentsForUser(userId, { documentType: "BANK_TRANSFER_SLIP" });

    expect(documents).toHaveLength(2);
    expect(documents.every((d) => d.documentType === "BANK_TRANSFER_SLIP")).toBe(true);
  });

  it("filters by duplicateStatus", async () => {
    const documents = await getRecentDocumentsForUser(userId, { duplicateStatus: "NEW" });

    expect(documents).toHaveLength(2);
    expect(documents.every((d) => d.duplicateStatus === "NEW")).toBe(true);
  });

  it("filters by reviewStatus", async () => {
    const documents = await getRecentDocumentsForUser(userId, { reviewFilter: "pending" });

    expect(documents).toHaveLength(1);
    expect(documents[0].reviewStatus).toBe("PENDING");
  });

  it("combines documentType and duplicateStatus filters", async () => {
    const documents = await getRecentDocumentsForUser(userId, {
      documentType: "BANK_TRANSFER_SLIP",
      duplicateStatus: "NEW"
    });

    expect(documents).toHaveLength(1);
    expect(documents[0].documentType).toBe("BANK_TRANSFER_SLIP");
    expect(documents[0].duplicateStatus).toBe("NEW");
  });

  it("returns empty array when no documents match filters", async () => {
    const documents = await getRecentDocumentsForUser(userId, { documentType: "CHEQUE", duplicateStatus: "NEW" });

    expect(documents).toHaveLength(0);
  });

  it("returns all documents when no filters are applied", async () => {
    const documents = await getRecentDocumentsForUser(userId);

    expect(documents).toHaveLength(4);
  });

  it("maintains owner scoping", async () => {
    const documentsForOtherUser = await getRecentDocumentsForUser("other-user-id");

    expect(documentsForOtherUser).toHaveLength(0);
  });

  it("respects limit parameter", async () => {
    const documents = await getRecentDocumentsForUser(userId, { limit: 2 });

    expect(documents).toHaveLength(2);
  });

  it("filters by duplicateDecisionType for workflow presets", async () => {
    const newUploads = await getRecentDocumentsForUser(userId, { duplicateDecisionType: "NEW_UPLOAD" });
    const suppressed = await getRecentDocumentsForUser(userId, {
      duplicateDecisionType: "SUPPRESSED_NEAR_DUPLICATE"
    });

    expect(newUploads).toHaveLength(1);
    expect(String(newUploads[0]._id)).toBe(String(documentIds[0]));
    expect(suppressed).toHaveLength(1);
    expect(String(suppressed[0]._id)).toBe(String(documentIds[3]));
  });

  it("searches documents by extracted amount", async () => {
    const documents = await getRecentDocumentsForUser(userId, { searchQuery: "500" });

    expect(documents).toHaveLength(1);
    expect(String(documents[0]._id)).toBe(String(documentIds[0]));
  });

  it("searches documents by normalized reference", async () => {
    const documents = await getRecentDocumentsForUser(userId, { searchQuery: "O16126175244BTF00250" });

    expect(documents).toHaveLength(1);
    expect(String(documents[0]._id)).toBe(String(documentIds[0]));
  });

  it("searches documents by normalized receiver and sender names", async () => {
    const receiverMatches = await getRecentDocumentsForUser(userId, { searchQuery: "สมชายใจดี" });
    const senderMatches = await getRecentDocumentsForUser(userId, { searchQuery: "alice sender" });

    expect(receiverMatches).toHaveLength(1);
    expect(senderMatches).toHaveLength(1);
  });

  it("returns empty array when extracted-field search has no match", async () => {
    const documents = await getRecentDocumentsForUser(userId, { searchQuery: "does-not-exist" });

    expect(documents).toHaveLength(0);
  });
});
