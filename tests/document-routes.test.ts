import { Readable } from "node:stream";
import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getDocument } from "../app/api/documents/[id]/route";
import { GET as getOriginalDocument } from "../app/api/documents/[id]/original/route";
import { POST as reviewDocument } from "../app/api/documents/[id]/review/route";
import { POST as uploadDocument } from "../app/api/documents/route";
import { findLikelyDuplicateMatchForUser, getRecentDocumentsForUser } from "../lib/documents";
import type { DocumentRecord, DuplicateReviewPairRecord } from "../lib/models";

const testState = vi.hoisted(() => ({
  session: null as { user?: { id?: string; email?: string } } | null,
  documents: [] as DocumentRecord[],
  reviewPairs: [] as DuplicateReviewPairRecord[],
  auditLogs: [] as unknown[],
  processUploadedDocumentImage: vi.fn(),
  getOriginalDocumentObject: vi.fn()
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => testState.session)
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {}
}));

vi.mock("@/lib/object-storage", () => ({
  putOriginalDocumentObject: vi.fn(async (input: { objectKey: string }) => ({
    bucket: "document-images",
    key: input.objectKey
  })),
  getOriginalDocumentObject: testState.getOriginalDocumentObject
}));

vi.mock("@/lib/document-processing", () => ({
  DocumentImageProcessingError: class DocumentImageProcessingError extends Error {},
  processUploadedDocumentImage: testState.processUploadedDocumentImage
}));

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(async () => ({
    collection(name: string) {
      if (name === "documents") {
        return {
          createIndexes: vi.fn(async () => undefined),
          findOne: vi.fn(async (query: Record<string, unknown>, options?: { sort?: Record<string, 1 | -1> }) => {
            const matches = testState.documents.filter((document) => matchesQuery(document, query));
            return sortDocuments(matches, options?.sort)[0] ?? null;
          }),
          insertOne: vi.fn(async (document: DocumentRecord) => {
            testState.documents.push(document);
            return { insertedId: document._id };
          }),
          find: vi.fn((query: Record<string, unknown>) => {
            const matches = testState.documents.filter((document) => matchesQuery(document, query));
            return {
              sort: () => ({
                limit: () => ({
                  toArray: async () => matches
                })
              })
            };
          }),
          updateOne: vi.fn(async (query: Record<string, unknown>, update: { $set?: Partial<DocumentRecord> }) => {
            const document = testState.documents.find((candidate) => matchesQuery(candidate, query));

            if (document && update.$set) {
              Object.assign(document, update.$set);
            }

            return {
              matchedCount: document ? 1 : 0,
              modifiedCount: document ? 1 : 0
            };
          })
        };
      }

      if (name === "duplicate_review_pairs") {
        return {
          createIndexes: vi.fn(async () => undefined),
          updateOne: vi.fn(async (
            query: Record<string, unknown>,
            update: { $set?: Partial<DuplicateReviewPairRecord>; $setOnInsert?: Partial<DuplicateReviewPairRecord> }
          ) => {
            const existing = testState.reviewPairs.find((pair) => matchesQuery(pair, query));

            if (existing) {
              Object.assign(existing, update.$set);
            } else {
              testState.reviewPairs.push({
                ...(update.$setOnInsert as DuplicateReviewPairRecord),
                ...(update.$set as DuplicateReviewPairRecord)
              });
            }

            return { matchedCount: existing ? 1 : 0, modifiedCount: 1, upsertedCount: existing ? 0 : 1 };
          }),
          findOne: vi.fn(async (query: Record<string, unknown>) => {
            return testState.reviewPairs.find((pair) => matchesQuery(pair, query)) ?? null;
          }),
          find: vi.fn((query: Record<string, unknown>) => {
            const matches = testState.reviewPairs.filter((pair) => matchesQuery(pair, query));

            return {
              toArray: async () => matches
            };
          })
        };
      }

      if (name === "audit_logs") {
        return {
          insertOne: vi.fn(async (document: unknown) => {
            testState.auditLogs.push(document);
            return { insertedId: new ObjectId() };
          })
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }
  }))
}));

function matchesQuery(document: object, query: Record<string, unknown>): boolean {
  return Object.entries(query).every(([key, value]) => {
    if (key === "$or" && Array.isArray(value)) {
      return value.some((nestedQuery) => matchesQuery(document, nestedQuery as Record<string, unknown>));
    }

    if (key === "_id" && typeof value === "object" && value !== null && "$ne" in value) {
      return String(getDocumentValue(document, "_id")) !== String((value as { $ne: ObjectId }).$ne);
    }

    if (typeof value === "object" && value !== null && "$ne" in value) {
      return getDocumentValue(document, key) !== (value as { $ne: unknown }).$ne;
    }

    if (key === "_id") {
      return String(getDocumentValue(document, "_id")) === String(value);
    }

    return getDocumentValue(document, key) === value;
  });
}

function getDocumentValue(document: object, key: string) {
  return (document as Record<string, unknown>)[key];
}

function sortDocuments(documents: DocumentRecord[], sort?: Record<string, 1 | -1>) {
  if (!sort) {
    return documents;
  }

  return [...documents].sort((left, right) => {
    for (const [field, direction] of Object.entries(sort)) {
      const leftValue = left[field as keyof DocumentRecord];
      const rightValue = right[field as keyof DocumentRecord];
      const comparison =
        leftValue instanceof Date && rightValue instanceof Date
          ? leftValue.getTime() - rightValue.getTime()
          : String(leftValue).localeCompare(String(rightValue));

      if (comparison !== 0) {
        return direction === 1 ? comparison : -comparison;
      }
    }

    return 0;
  });
}

function setSession(userId: string | null) {
  testState.session = userId ? { user: { id: userId, email: `${userId}@example.test` } } : null;
}

function createUploadRequest(bytes = "same image bytes") {
  const formData = new FormData();
  formData.set("documentType", "CHEQUE");
  formData.set("sourceType", "UPLOAD");
  formData.set(
    "file",
    new File([Buffer.from(bytes)], "cheque.jpg", {
      type: "image/jpeg"
    })
  );

  return new Request("http://localhost/api/documents", {
    method: "POST",
    body: formData
  });
}

async function upload(bytes?: string) {
  const response = await uploadDocument(createUploadRequest(bytes));
  return {
    response,
    body: (await response.json()) as {
      documentId?: string;
      duplicateStatus?: string;
      matchedDocumentId?: string | null;
      similarityScore?: number | null;
      error?: string;
    }
  };
}

describe("document API integration boundaries", () => {
  beforeEach(() => {
    setSession(null);
    testState.documents.length = 0;
    testState.reviewPairs.length = 0;
    testState.auditLogs.length = 0;
    testState.processUploadedDocumentImage.mockReset();
    testState.processUploadedDocumentImage.mockImplementation(async (input: { userId: string; documentId: string; buffer: Buffer }) => ({
      normalizedObject: {
        bucket: "document-images",
        key: `documents/${input.userId}/${input.documentId}/normalized.webp`
      },
      normalizedImage: {
        width: 32,
        height: 24,
        mimeType: "image/webp",
        fileSize: 128,
        algorithm: "normalized-webp-grayscale-v1"
      },
      perceptualHash: input.buffer.toString("utf8").includes("near") ? "ffff0000ffff0000" : "0000000000000000"
    }));
    testState.getOriginalDocumentObject.mockReset();
    testState.getOriginalDocumentObject.mockResolvedValue(Readable.from([Buffer.from("image")]));
  });

  it("creates a NEW document for an authenticated first upload", async () => {
    setSession("user-1");

    const { response, body } = await upload();

    expect(response.status).toBe(200);
    expect(body.documentId).toBeDefined();
    expect(body.duplicateStatus).toBe("NEW");
    expect(body.matchedDocumentId).toBeNull();
    expect(body.similarityScore).toBeNull();
    expect(testState.documents).toHaveLength(1);
    expect(testState.documents[0]).toMatchObject({
      userId: "user-1",
      status: "READY",
      duplicateStatus: "NEW",
      reviewStatus: "NOT_REQUIRED",
      matchedDocumentId: null,
      similarityScore: null,
      perceptualHash: "0000000000000000",
      normalizedObject: {
        key: expect.stringContaining("/normalized.webp")
      }
    });
  });

  it("creates a new EXACT_DUPLICATE record linked to the earliest owned match", async () => {
    setSession("user-1");

    const first = await upload();
    const second = await upload();
    const third = await upload();

    expect(second.response.status).toBe(200);
    expect(testState.documents).toHaveLength(3);
    expect(second.body.documentId).not.toBe(first.body.documentId);
    expect(second.body.duplicateStatus).toBe("EXACT_DUPLICATE");
    expect(second.body.matchedDocumentId).toBe(first.body.documentId);
    expect(second.body.similarityScore).toBe(1);
    expect(third.body.duplicateStatus).toBe("EXACT_DUPLICATE");
    expect(third.body.matchedDocumentId).toBe(first.body.documentId);
    expect(testState.documents[1]).toMatchObject({
      duplicateStatus: "EXACT_DUPLICATE",
      reviewStatus: "NOT_REQUIRED",
      matchedDocumentId: first.body.documentId,
      similarityScore: 1
    });
  });

  it("creates a likely duplicate when bytes differ but the owner-scoped perceptual hash is close", async () => {
    setSession("user-1");

    const first = await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");

    expect(second.body.documentId).not.toBe(first.body.documentId);
    expect(second.body.duplicateStatus).toBe("LIKELY_DUPLICATE");
    expect(second.body.matchedDocumentId).toBe(first.body.documentId);
    expect(second.body.similarityScore).toBe(1);
    expect(testState.documents[1]).toMatchObject({
      reviewStatus: "PENDING",
      reviewedAt: null,
      reviewedMatchDocumentId: null
    });
  });

  it("allows the owner to confirm a pending likely duplicate", async () => {
    setSession("user-1");

    const first = await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    const response = await reviewDocument(
      new Request("http://localhost/api/documents/id/review", {
        method: "POST",
        body: JSON.stringify({ decision: "CONFIRMED_DUPLICATE" })
      }),
      { params: Promise.resolve({ id: second.body.documentId as string }) }
    );
    const body = (await response.json()) as { reviewStatus: string; reviewedMatchDocumentId: string };

    expect(response.status).toBe(200);
    expect(body.reviewStatus).toBe("CONFIRMED_DUPLICATE");
    expect(body.reviewedMatchDocumentId).toBe(first.body.documentId);
    expect(testState.documents[1]).toMatchObject({
      duplicateStatus: "LIKELY_DUPLICATE",
      reviewStatus: "CONFIRMED_DUPLICATE",
      matchedDocumentId: first.body.documentId
    });
    expect(testState.reviewPairs).toHaveLength(1);
    expect(testState.reviewPairs[0]).toMatchObject({
      userId: "user-1",
      decision: "CONFIRMED_DUPLICATE"
    });
  });

  it("allows the owner to mark a pending likely duplicate as distinct", async () => {
    setSession("user-1");

    const first = await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    const response = await reviewDocument(
      new Request("http://localhost/api/documents/id/review", {
        method: "POST",
        body: JSON.stringify({ decision: "CONFIRMED_DISTINCT" })
      }),
      { params: Promise.resolve({ id: second.body.documentId as string }) }
    );
    const body = (await response.json()) as { reviewStatus: string; reviewedMatchDocumentId: string };

    expect(response.status).toBe(200);
    expect(body.reviewStatus).toBe("CONFIRMED_DISTINCT");
    expect(body.reviewedMatchDocumentId).toBe(first.body.documentId);
    expect(testState.documents[1]).toMatchObject({
      duplicateStatus: "LIKELY_DUPLICATE",
      reviewStatus: "CONFIRMED_DISTINCT",
      matchedDocumentId: first.body.documentId,
      similarityScore: 1
    });
    expect(testState.reviewPairs[0]).toMatchObject({
      userId: "user-1",
      decision: "CONFIRMED_DISTINCT"
    });
  });

  it("rejects non-owner review of another user's likely duplicate", async () => {
    setSession("owner-user");
    const likelyDuplicate = await upload("near original image bytes").then(async () =>
      upload("near recompressed image bytes")
    );

    setSession("other-user");
    const response = await reviewDocument(
      new Request("http://localhost/api/documents/id/review", {
        method: "POST",
        body: JSON.stringify({ decision: "CONFIRMED_DUPLICATE" })
      }),
      { params: Promise.resolve({ id: likelyDuplicate.body.documentId as string }) }
    );

    expect(response.status).toBe(404);
  });

  it("does not return a reviewed pair as an unresolved likely duplicate candidate", async () => {
    setSession("user-1");

    await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    await reviewDocument(
      new Request("http://localhost/api/documents/id/review", {
        method: "POST",
        body: JSON.stringify({ decision: "CONFIRMED_DISTINCT" })
      }),
      { params: Promise.resolve({ id: second.body.documentId as string }) }
    );

    const match = await findLikelyDuplicateMatchForUser({
      userId: "user-1",
      documentId: new ObjectId(second.body.documentId),
      perceptualHash: "ffff0000ffff0000",
      excludeDocumentId: new ObjectId(second.body.documentId)
    });

    expect(match).toBeNull();
  });

  it("filters documents by review status for dashboard queries", async () => {
    setSession("user-1");

    await upload("near original image bytes");
    const second = await upload("near recompressed image bytes");
    await reviewDocument(
      new Request("http://localhost/api/documents/id/review", {
        method: "POST",
        body: JSON.stringify({ decision: "CONFIRMED_DISTINCT" })
      }),
      { params: Promise.resolve({ id: second.body.documentId as string }) }
    );

    const confirmedDistinct = await getRecentDocumentsForUser("user-1", {
      reviewFilter: "confirmed-distinct"
    });
    const pending = await getRecentDocumentsForUser("user-1", {
      reviewFilter: "pending"
    });

    expect(confirmedDistinct).toHaveLength(1);
    expect(confirmedDistinct[0].reviewStatus).toBe("CONFIRMED_DISTINCT");
    expect(pending).toHaveLength(0);
  });

  it("rejects unauthenticated uploads", async () => {
    setSession(null);

    const { response, body } = await upload();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication required.");
    expect(testState.documents).toHaveLength(0);
  });

  it("does not expose another user's duplicate through upload matching", async () => {
    setSession("user-1");
    await upload();

    setSession("user-2");
    const secondUserUpload = await upload();

    expect(secondUserUpload.body.duplicateStatus).toBe("NEW");
    expect(secondUserUpload.body.matchedDocumentId).toBeNull();
  });

  it("does not expose another user's near duplicate through perceptual matching", async () => {
    setSession("user-1");
    await upload("near owner image bytes");

    setSession("user-2");
    const secondUserUpload = await upload("near other owner image bytes");

    expect(secondUserUpload.body.duplicateStatus).toBe("NEW");
    expect(secondUserUpload.body.matchedDocumentId).toBeNull();
  });

  it("rejects another user's document detail and original image without leaking object access", async () => {
    setSession("owner-user");
    const ownerUpload = await upload();

    setSession("other-user");
    const detailResponse = await getDocument(new Request("http://localhost/api/documents/id"), {
      params: Promise.resolve({ id: ownerUpload.body.documentId as string })
    });
    const originalResponse = await getOriginalDocument(new Request("http://localhost/api/documents/id/original"), {
      params: Promise.resolve({ id: ownerUpload.body.documentId as string })
    });

    expect(detailResponse.status).toBe(404);
    expect(originalResponse.status).toBe(404);
    expect(testState.getOriginalDocumentObject).not.toHaveBeenCalled();
  });
});
