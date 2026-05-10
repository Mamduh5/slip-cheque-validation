import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  backfillMissingSlipVerification,
  buildMissingSlipVerificationQuery,
  buildSlipVerificationBackfillUpdate
} from "../lib/slip-verification-backfill";
import type { DocumentRecord } from "../lib/models";

const testState = vi.hoisted(() => ({
  countDocuments: vi.fn(),
  updateMany: vi.fn()
}));

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(async () => ({
    collection: vi.fn(() => ({
      countDocuments: testState.countDocuments,
      updateMany: testState.updateMany
    }))
  }))
}));

function legacyDocument(input: Partial<DocumentRecord>): DocumentRecord {
  return {
    userId: "user-1",
    documentType: "BANK_TRANSFER_SLIP",
    sourceType: "UPLOAD",
    originalFilename: "slip.jpg",
    mimeType: "image/jpeg",
    fileSize: 128,
    originalObject: { bucket: "document-images", key: "documents/user-1/id/original.jpg" },
    normalizedObject: null,
    normalizedImage: null,
    processingProfile: undefined,
    qrCandidateAnalysis: null,
    qrDecode: null,
    transferMetadata: null,
    status: "READY",
    duplicateStatus: "NEW",
    duplicateDecisionType: null,
    duplicateDecisionReasons: [],
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
    perceptualHash: "0000000000000000",
    notes: null,
    createdAt: new Date("2026-05-08T10:00:00.000Z"),
    updatedAt: new Date("2026-05-08T10:00:00.000Z"),
    ...input
  };
}

function matchesBackfillQuery(document: DocumentRecord) {
  return (
    document.documentType === "BANK_TRANSFER_SLIP" &&
    (!Object.prototype.hasOwnProperty.call(document, "slipVerification") || document.slipVerification === null)
  );
}

describe("slip verification backfill policy", () => {
  beforeEach(() => {
    testState.countDocuments.mockReset();
    testState.updateMany.mockReset();
  });

  it("targets only transfer-slip records with missing or null slipVerification", () => {
    const query = buildMissingSlipVerificationQuery();

    expect(query).toEqual({
      documentType: "BANK_TRANSFER_SLIP",
      $or: [{ slipVerification: { $exists: false } }, { slipVerification: null }]
    });
  });

  it("builds the same safe no-evidence scaffold used by new transfer-slip records", () => {
    const evaluatedAt = new Date("2026-05-10T08:00:00.000Z");
    const update = buildSlipVerificationBackfillUpdate({ evaluatedAt });

    expect(update).toEqual({
      $set: {
        slipVerification: {
          stage: "SLIP_VERIFICATION",
          algorithm: "slip-verification-scaffold-v1",
          status: "COMPLETED",
          result: "NOT_VERIFIED",
          evidenceCategory: "NO_EVIDENCE",
          evaluatedAt,
          notes: [
            "Slip verification runtime scaffold recorded with no verification evidence.",
            "No local structural validation or external provider verification has been performed."
          ]
        }
      }
    });
  });

  it("leaves non-slip and already-populated transfer-slip records out of the eligible set", () => {
    const missingSlip = legacyDocument({});
    delete (missingSlip as Partial<DocumentRecord>).slipVerification;
    const populatedSlip = legacyDocument({
      slipVerification: buildSlipVerificationBackfillUpdate({
        evaluatedAt: new Date("2026-05-10T08:00:00.000Z")
      }).$set?.slipVerification
    });
    const documents = [
      legacyDocument({ slipVerification: null }),
      missingSlip,
      populatedSlip,
      legacyDocument({ documentType: "CHEQUE", slipVerification: null })
    ];

    expect(documents.filter(matchesBackfillQuery)).toHaveLength(2);
    expect(matchesBackfillQuery(populatedSlip)).toBe(false);
  });

  it("is idempotent because updated records no longer match the backfill query", () => {
    const document = legacyDocument({ slipVerification: null });
    const update = buildSlipVerificationBackfillUpdate({ evaluatedAt: new Date("2026-05-10T08:00:00.000Z") });

    expect(matchesBackfillQuery(document)).toBe(true);

    Object.assign(document, update.$set);

    expect(matchesBackfillQuery(document)).toBe(false);
    expect(document).toMatchObject({
      duplicateStatus: "NEW",
      reviewStatus: "NOT_REQUIRED",
      qualityStatus: "PASS",
      qrCandidateAnalysis: null,
      qrDecode: null,
      transferMetadata: null
    });
  });

  it("reports eligible records without updating them in dry-run mode", async () => {
    testState.countDocuments.mockResolvedValueOnce(2);

    const result = await backfillMissingSlipVerification({ dryRun: true });

    expect(result).toEqual({
      dryRun: true,
      matchedCount: 2,
      modifiedCount: 0
    });
    expect(testState.countDocuments).toHaveBeenCalledWith(buildMissingSlipVerificationQuery());
    expect(testState.updateMany).not.toHaveBeenCalled();
  });

  it("updates only the eligible backfill query with the safe scaffold", async () => {
    const evaluatedAt = new Date("2026-05-10T08:00:00.000Z");
    testState.countDocuments.mockResolvedValueOnce(2);
    testState.updateMany.mockResolvedValueOnce({ modifiedCount: 2 });

    const result = await backfillMissingSlipVerification({ evaluatedAt });

    expect(result).toEqual({
      dryRun: false,
      matchedCount: 2,
      modifiedCount: 2
    });
    expect(testState.updateMany).toHaveBeenCalledWith(
      buildMissingSlipVerificationQuery(),
      buildSlipVerificationBackfillUpdate({ evaluatedAt })
    );
  });
});
