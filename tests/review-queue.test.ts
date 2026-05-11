import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getReviewQueueForUser } from "../lib/documents";
import {
  reviewValuesMatch,
  getImageReadField,
  getImageReadConfidence,
  isLowConfidence,
  REVIEW_FIELD_LABELS
} from "../lib/review-helpers";
import type { DocumentRecord } from "../lib/models";

// ---------------------------------------------------------------------------
// MongoDB mock (minimal, covers the query patterns used by getReviewQueueForUser)
// ---------------------------------------------------------------------------

const mockDocuments: DocumentRecord[] = [];

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(async () => ({
    collection(name: string) {
      if (name === "documents") {
        return {
          createIndexes: vi.fn(async () => undefined),
          find: vi.fn((query: Record<string, unknown>) => {
            const matches = mockDocuments.filter((doc) => {
              const entries = Object.entries(query);
              const docRecord = doc as unknown as Record<string, unknown>;
              return entries.every(([key, value]) => {
                if (key === "_id" && typeof value === "object" && value !== null && "$in" in value) {
                  const ids = (value as { $in: ObjectId[] }).$in.map(String);
                  return ids.includes(String(docRecord[key]));
                }
                return docRecord[key] === value;
              });
            });
            return {
              sort: () => ({
                limit: () => ({
                  toArray: async () => matches
                })
              }),
              toArray: async () => matches
            };
          })
        };
      }
      if (name === "duplicate_review_pairs") {
        return {
          createIndexes: vi.fn(async () => undefined),
          find: vi.fn(() => ({ toArray: async () => [] }))
        };
      }
      throw new Error(`Unexpected collection: ${name}`);
    }
  }))
}));

// ---------------------------------------------------------------------------
// Minimal document factory
// ---------------------------------------------------------------------------

function makeDoc(
  overrides: Partial<DocumentRecord> & { _id?: ObjectId; userId?: string }
): DocumentRecord {
  const id = overrides._id ?? new ObjectId();
  return {
    _id: id,
    userId: overrides.userId ?? "user-1",
    documentType: "BANK_TRANSFER_SLIP",
    sourceType: "UPLOAD",
    originalFilename: `doc-${String(id).slice(-4)}.jpg`,
    mimeType: "image/jpeg",
    fileSize: 100000,
    originalObject: { bucket: "b", key: "k" },
    normalizedObject: null,
    normalizedImage: null,
    status: "READY",
    duplicateStatus: "LIKELY_DUPLICATE",
    duplicateDecisionType: "LIKELY_DUPLICATE_REVIEW",
    duplicateDecisionReasons: [],
    matchedDocumentId: null,
    similarityScore: 0.97,
    reviewStatus: "PENDING",
    reviewedAt: null,
    reviewedMatchDocumentId: null,
    qualityStatus: "PASS",
    qualityWarnings: [],
    qualityMetrics: null,
    qualityCheckedAt: null,
    exactHash: "abc123",
    perceptualHash: "0000000000000000",
    notes: null,
    createdAt: new Date("2026-05-08T10:00:00Z"),
    updatedAt: new Date("2026-05-08T10:00:00Z"),
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// getReviewQueueForUser tests
// ---------------------------------------------------------------------------

describe("getReviewQueueForUser", () => {
  beforeEach(() => {
    mockDocuments.length = 0;
  });

  it("returns an empty array when no pending items exist", async () => {
    const result = await getReviewQueueForUser("user-1");
    expect(result).toEqual([]);
  });

  it("returns pending LIKELY_DUPLICATE items for the correct user", async () => {
    const matchedId = new ObjectId();
    const docId = new ObjectId();
    mockDocuments.push(
      makeDoc({ _id: matchedId, userId: "user-1", duplicateStatus: "NEW", reviewStatus: "NOT_REQUIRED" }),
      makeDoc({ _id: docId, userId: "user-1", matchedDocumentId: String(matchedId) })
    );

    const result = await getReviewQueueForUser("user-1");

    expect(result).toHaveLength(1);
    expect(String(result[0].document._id)).toBe(String(docId));
    expect(String(result[0].matchedDocument?._id)).toBe(String(matchedId));
  });

  it("returns null for matchedDocument when it belongs to another user", async () => {
    const matchedId = new ObjectId();
    const docId = new ObjectId();
    // Matched doc belongs to a different user — not returned by the batch query
    mockDocuments.push(
      makeDoc({ _id: matchedId, userId: "other-user", duplicateStatus: "NEW", reviewStatus: "NOT_REQUIRED" }),
      makeDoc({ _id: docId, userId: "user-1", matchedDocumentId: String(matchedId) })
    );

    const result = await getReviewQueueForUser("user-1");

    expect(result).toHaveLength(1);
    expect(result[0].matchedDocument).toBeNull();
  });

  it("excludes documents that are not LIKELY_DUPLICATE", async () => {
    mockDocuments.push(
      makeDoc({ duplicateStatus: "NEW", reviewStatus: "NOT_REQUIRED" }),
      makeDoc({ duplicateStatus: "EXACT_DUPLICATE", reviewStatus: "NOT_REQUIRED" })
    );

    const result = await getReviewQueueForUser("user-1");
    expect(result).toHaveLength(0);
  });

  it("excludes documents that are already reviewed (not PENDING)", async () => {
    mockDocuments.push(
      makeDoc({ reviewStatus: "CONFIRMED_DUPLICATE" }),
      makeDoc({ reviewStatus: "CONFIRMED_DISTINCT" })
    );

    const result = await getReviewQueueForUser("user-1");
    expect(result).toHaveLength(0);
  });

  it("handles missing matchedDocumentId gracefully", async () => {
    mockDocuments.push(makeDoc({ matchedDocumentId: null }));

    const result = await getReviewQueueForUser("user-1");

    expect(result).toHaveLength(1);
    expect(result[0].matchedDocument).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// reviewValuesMatch (compare page logic)
// ---------------------------------------------------------------------------

describe("reviewValuesMatch", () => {
  it("treats two nulls as matching (both absent — not a conflict)", () => {
    expect(reviewValuesMatch(null, null)).toBe(true);
  });

  it("treats one-sided null as non-matching when one side has a value", () => {
    expect(reviewValuesMatch("500.00", null)).toBe(false);
    expect(reviewValuesMatch(null, "500.00")).toBe(false);
  });

  it("matches identical values", () => {
    expect(reviewValuesMatch("500.00", "500.00")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(reviewValuesMatch("016126175244BTF00250", "016126175244btf00250")).toBe(true);
  });

  it("ignores leading/trailing whitespace", () => {
    expect(reviewValuesMatch("  500.00  ", "500.00")).toBe(true);
  });

  it("detects genuinely different values", () => {
    expect(reviewValuesMatch("500.00", "750.00")).toBe(false);
    expect(reviewValuesMatch("016126175244BTF00250", "016121214623BTF04629")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getImageReadField / getImageReadConfidence / isLowConfidence helpers
// ---------------------------------------------------------------------------

describe("review field helpers", () => {
  const doc = makeDoc({
    slipImageRead: {
      stage: "SLIP_IMAGE_READ",
      algorithm: "slip-image-read-v1",
      status: "COMPLETED",
      result: "EXTRACTED",
      readAt: new Date(),
      rawOcrText: null,
      notes: [],
      warnings: [],
      extractedFields: {
        amount: { value: "500.00", confidence: "MEDIUM", source: "regex-amount" },
        receiverName: { value: "สมชาย ใจดี", confidence: "HIGH", source: "regex-name" },
        senderName: { value: "test sender", confidence: "LOW", source: "regex-name-label" },
        dateTime: { value: "6 พ.ค.69 17:52", confidence: "HIGH", source: "regex-datetime" },
        transactionReference: { value: "016126175244BTF00250", confidence: "HIGH", source: "regex-reference-full" },
        senderBank: { value: "KBANK", confidence: "LOW", source: "regex-bank" },
        receiverBank: { value: null, confidence: "NONE", source: "no-match" },
        senderAccountTail: { value: null, confidence: "NONE", source: "no-match" },
        receiverAccountTail: { value: null, confidence: "NONE", source: "no-match" }
      }
    }
  });

  it("retrieves field values correctly", () => {
    expect(getImageReadField(doc, "amount")).toBe("500.00");
    expect(getImageReadField(doc, "receiverName")).toBe("สมชาย ใจดี");
    expect(getImageReadField(doc, "senderName")).toBe("test sender");
    expect(getImageReadField(doc, "transactionReference")).toBe("016126175244BTF00250");
  });

  it("returns null for absent confidence (NONE) when value is also null", () => {
    // receiverBank has NONE confidence and null value — confidence helper returns null
    const docNoConf = makeDoc({
      slipImageRead: {
        stage: "SLIP_IMAGE_READ",
        algorithm: "slip-image-read-v1",
        status: "COMPLETED",
        result: "EXTRACTED",
        readAt: new Date(),
        rawOcrText: null,
        notes: [],
        warnings: [],
        extractedFields: {
          amount: { value: null, confidence: "NONE", source: "no-match" },
          receiverName: { value: null, confidence: "NONE", source: "no-match" },
          senderName: { value: null, confidence: "NONE", source: "no-match" },
          dateTime: { value: null, confidence: "NONE", source: "no-match" },
          transactionReference: { value: null, confidence: "NONE", source: "no-match" },
          senderBank: { value: null, confidence: "NONE", source: "no-match" },
          receiverBank: { value: null, confidence: "NONE", source: "no-match" },
          senderAccountTail: { value: null, confidence: "NONE", source: "no-match" },
          receiverAccountTail: { value: null, confidence: "NONE", source: "no-match" }
        }
      }
    });
    expect(getImageReadConfidence(docNoConf, "amount")).toBeNull();
  });

  it("returns lowercased confidence string", () => {
    expect(getImageReadConfidence(doc, "amount")).toBe("medium");
    expect(getImageReadConfidence(doc, "receiverName")).toBe("high");
  });

  it("identifies LOW confidence fields", () => {
    // senderName was set to LOW confidence in the doc fixture
    expect(isLowConfidence(doc, "senderName")).toBe(true);
    expect(isLowConfidence(doc, "amount")).toBe(false);
    expect(isLowConfidence(doc, "receiverName")).toBe(false);
  });

  it("returns null field values when slipImageRead is absent", () => {
    const emptyDoc = makeDoc({ slipImageRead: null });
    expect(getImageReadField(emptyDoc, "amount")).toBeNull();
    expect(getImageReadConfidence(emptyDoc, "amount")).toBeNull();
    expect(isLowConfidence(emptyDoc, "amount")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// REVIEW_FIELD_LABELS — verify labels are present and readable
// ---------------------------------------------------------------------------

describe("REVIEW_FIELD_LABELS", () => {
  it("has human-readable labels for all review fields", () => {
    expect(REVIEW_FIELD_LABELS.amount).toBe("Amount");
    expect(REVIEW_FIELD_LABELS.receiverName).toBe("Receiver");
    expect(REVIEW_FIELD_LABELS.senderName).toBe("Sender");
    expect(REVIEW_FIELD_LABELS.dateTime).toBe("Date / time");
    expect(REVIEW_FIELD_LABELS.transactionReference).toBe("Reference");
  });
});

// ---------------------------------------------------------------------------
// Semantic guardrails — reviewValuesMatch does NOT invent new truth
// ---------------------------------------------------------------------------

describe("reviewValuesMatch semantic guardrails", () => {
  it("does not normalise OCR confusions — that is handled separately at assessment time", () => {
    // The compare helper is for display only; it does raw string comparison.
    // OCR normalisation (O→0 etc.) is the responsibility of normalizeReferenceForCompare
    // in slip-ocr-normalization.ts during duplicate assessment, not here.
    expect(reviewValuesMatch("016126175244BTF00250", "O16126175244BTF00250")).toBe(false);
  });

  it("does not claim semantic equivalence for structurally different values", () => {
    expect(reviewValuesMatch("016126175244BTF00250", "016121214623BTF04629")).toBe(false);
  });
});
