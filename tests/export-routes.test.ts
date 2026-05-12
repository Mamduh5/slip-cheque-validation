import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as exportDashboard } from "../app/api/exports/dashboard/route";
import { GET as exportReview } from "../app/api/exports/review/route";
import type { DocumentRecord } from "../lib/models";

const testState = vi.hoisted(() => ({
  user: { id: "owner-user" } as { id: string } | null,
  getDashboardExportDocumentsForUser: vi.fn(),
  getReviewQueueExportForUser: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(async () => testState.user)
}));

vi.mock("@/lib/documents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/documents")>();
  return {
    ...actual,
    getDashboardExportDocumentsForUser: testState.getDashboardExportDocumentsForUser,
    getReviewQueueExportForUser: testState.getReviewQueueExportForUser
  };
});

function makeDoc(): DocumentRecord {
  const now = new Date("2026-05-12T09:30:00.000Z");

  return {
    _id: new ObjectId("64f000000000000000000001"),
    userId: "owner-user",
    documentType: "BANK_TRANSFER_SLIP",
    sourceType: "UPLOAD",
    originalFilename: "export-slip.jpg",
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
    slipImageRead: null,
    status: "READY",
    duplicateStatus: "NEW",
    duplicateDecisionType: "NEW_UPLOAD",
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
    exactHash: "hash",
    perceptualHash: "ffff0000ffff0000",
    notes: null,
    createdAt: now,
    updatedAt: now
  };
}

describe("export routes", () => {
  beforeEach(() => {
    testState.user = { id: "owner-user" };
    testState.getDashboardExportDocumentsForUser.mockReset();
    testState.getReviewQueueExportForUser.mockReset();
    testState.getDashboardExportDocumentsForUser.mockResolvedValue([{ document: makeDoc(), matchedDocument: null }]);
    testState.getReviewQueueExportForUser.mockResolvedValue([{ document: makeDoc(), matchedDocument: null }]);
  });

  it("maps dashboard URL params to the owner-scoped export query", async () => {
    const response = await exportDashboard(
      new Request(
        "http://localhost/api/exports/dashboard?review=pending&documentType=BANK_TRANSFER_SLIP&duplicateStatus=LIKELY_DUPLICATE&decision=LIKELY_DUPLICATE_REVIEW&q=500"
      )
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(body).toContain("export-slip.jpg");
    expect(testState.getDashboardExportDocumentsForUser).toHaveBeenCalledWith("owner-user", {
      reviewFilter: "pending",
      documentType: "BANK_TRANSFER_SLIP",
      duplicateStatus: "LIKELY_DUPLICATE",
      duplicateDecisionType: "LIKELY_DUPLICATE_REVIEW",
      searchQuery: "500"
    });
  });

  it("maps review URL search and sort without exporting only the visible page", async () => {
    await exportReview(new Request("http://localhost/api/exports/review?q=receiver&sort=highest-similarity&page=3"));

    expect(testState.getReviewQueueExportForUser).toHaveBeenCalledWith("owner-user", {
      searchQuery: "receiver",
      sort: "highest-similarity"
    });
  });

  it("rejects unauthenticated export requests", async () => {
    testState.user = null;

    const response = await exportDashboard(new Request("http://localhost/api/exports/dashboard"));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication required.");
    expect(testState.getDashboardExportDocumentsForUser).not.toHaveBeenCalled();
  });
});

