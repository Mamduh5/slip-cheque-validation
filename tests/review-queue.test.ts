import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getReviewQueueExportForUser, getReviewQueueForUser } from "../lib/documents";
import {
  reviewValuesMatch,
  getImageReadField,
  getImageReadConfidence,
  getReviewFieldDisplayValue,
  isLowConfidence,
  REVIEW_FIELD_LABELS
} from "../lib/review-helpers";
import type { DocumentRecord, ImageReadTransferFields } from "../lib/models";

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
          countDocuments: vi.fn(async (query: Record<string, unknown>) => {
            return mockDocuments.filter((doc) => matchesQuery(doc, query)).length;
          }),
          find: vi.fn((query: Record<string, unknown>) => {
            const matches = mockDocuments.filter((doc) => {
              return matchesQuery(doc, query);
            });
            let sorted = [...matches];
            let skipCount = 0;
            let limitCount: number | null = null;
            const cursor = {
              sort(sort: Record<string, 1 | -1>) {
                sorted = sortDocuments(sorted, sort);
                return cursor;
              },
              skip(value: number) {
                skipCount = value;
                return cursor;
              },
              limit(value: number) {
                limitCount = value;
                return cursor;
              },
              toArray: async () => {
                const skipped = sorted.slice(skipCount);
                return limitCount === null ? skipped : skipped.slice(0, limitCount);
              }
            };
            return {
              ...cursor
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

function matchesQuery(doc: DocumentRecord, query: Record<string, unknown>) {
  const docRecord = doc as unknown as Record<string, unknown>;
  return Object.entries(query).every(([key, value]) => {
    if (key === "_id" && typeof value === "object" && value !== null && "$in" in value) {
      const ids = (value as { $in: ObjectId[] }).$in.map(String);
      return ids.includes(String(docRecord[key]));
    }
    return docRecord[key] === value;
  });
}

function sortDocuments(documents: DocumentRecord[], sort: Record<string, 1 | -1>) {
  return [...documents].sort((left, right) => {
    for (const [field, direction] of Object.entries(sort)) {
      const leftValue = left[field as keyof DocumentRecord];
      const rightValue = right[field as keyof DocumentRecord];
      const comparison =
        leftValue instanceof Date && rightValue instanceof Date
          ? leftValue.getTime() - rightValue.getTime()
          : Number(leftValue ?? -1) - Number(rightValue ?? -1);

      if (comparison !== 0 && Number.isFinite(comparison)) {
        return direction === 1 ? comparison : -comparison;
      }

      const stringComparison = String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
      if (stringComparison !== 0) {
        return direction === 1 ? stringComparison : -stringComparison;
      }
    }

    return 0;
  });
}

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
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("returns pending LIKELY_DUPLICATE items for the correct user", async () => {
    const matchedId = new ObjectId();
    const docId = new ObjectId();
    mockDocuments.push(
      makeDoc({ _id: matchedId, userId: "user-1", duplicateStatus: "NEW", reviewStatus: "NOT_REQUIRED" }),
      makeDoc({ _id: docId, userId: "user-1", matchedDocumentId: String(matchedId) })
    );

    const result = await getReviewQueueForUser("user-1");

    expect(result.items).toHaveLength(1);
    expect(String(result.items[0].document._id)).toBe(String(docId));
    expect(String(result.items[0].matchedDocument?._id)).toBe(String(matchedId));
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

    expect(result.items).toHaveLength(1);
    expect(result.items[0].matchedDocument).toBeNull();
  });

  it("excludes documents that are not LIKELY_DUPLICATE", async () => {
    mockDocuments.push(
      makeDoc({ duplicateStatus: "NEW", reviewStatus: "NOT_REQUIRED" }),
      makeDoc({ duplicateStatus: "EXACT_DUPLICATE", reviewStatus: "NOT_REQUIRED" })
    );

    const result = await getReviewQueueForUser("user-1");
    expect(result.items).toHaveLength(0);
  });

  it("excludes documents that are already reviewed (not PENDING)", async () => {
    mockDocuments.push(
      makeDoc({ reviewStatus: "CONFIRMED_DUPLICATE" }),
      makeDoc({ reviewStatus: "CONFIRMED_DISTINCT" })
    );

    const result = await getReviewQueueForUser("user-1");
    expect(result.items).toHaveLength(0);
  });

  it("handles missing matchedDocumentId gracefully", async () => {
    mockDocuments.push(makeDoc({ matchedDocumentId: null }));

    const result = await getReviewQueueForUser("user-1");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].matchedDocument).toBeNull();
  });

  it("sorts review queue by highest similarity", async () => {
    const lower = new ObjectId();
    const higher = new ObjectId();
    mockDocuments.push(
      makeDoc({ _id: lower, originalFilename: "lower.jpg", similarityScore: 0.84 }),
      makeDoc({ _id: higher, originalFilename: "higher.jpg", similarityScore: 0.98 })
    );

    const result = await getReviewQueueForUser("user-1", { sort: "highest-similarity" });

    expect(result.items.map((item) => item.document.originalFilename)).toEqual(["higher.jpg", "lower.jpg"]);
  });

  it("paginates review queue results", async () => {
    for (let index = 0; index < 12; index += 1) {
      mockDocuments.push(
        makeDoc({
          originalFilename: `doc-${index}.jpg`,
          createdAt: new Date(`2026-05-08T10:${String(index).padStart(2, "0")}:00Z`)
        })
      );
    }

    const result = await getReviewQueueForUser("user-1", { page: 2, pageSize: 5 });

    expect(result.total).toBe(12);
    expect(result.totalPages).toBe(3);
    expect(result.items).toHaveLength(5);
    expect(result.page).toBe(2);
  });

  it("searches review queue extracted fields and keeps owner scoping", async () => {
    mockDocuments.push(
      makeDoc({
        userId: "user-1",
        originalFilename: "target.jpg",
        slipImageRead: makeSlipImageRead({ amount: "500.00", receiverName: "Alice Receiver" })
      }),
      makeDoc({
        userId: "user-1",
        originalFilename: "other.jpg",
        slipImageRead: makeSlipImageRead({ amount: "750.00", receiverName: "Other Receiver" })
      }),
      makeDoc({
        userId: "other-user",
        originalFilename: "leak.jpg",
        slipImageRead: makeSlipImageRead({ amount: "500.00", receiverName: "Alice Receiver" })
      })
    );

    const result = await getReviewQueueForUser("user-1", { searchQuery: "500" });

    expect(result.total).toBe(1);
    expect(result.items[0].document.originalFilename).toBe("target.jpg");
  });

  it("combines review queue search and sorting", async () => {
    mockDocuments.push(
      makeDoc({
        originalFilename: "lower-match.jpg",
        similarityScore: 0.82,
        slipImageRead: makeSlipImageRead({ receiverName: "Shared Receiver" })
      }),
      makeDoc({
        originalFilename: "higher-match.jpg",
        similarityScore: 0.97,
        slipImageRead: makeSlipImageRead({ receiverName: "Shared Receiver" })
      }),
      makeDoc({
        originalFilename: "non-match.jpg",
        similarityScore: 0.99,
        slipImageRead: makeSlipImageRead({ receiverName: "Other Receiver" })
      })
    );

    const result = await getReviewQueueForUser("user-1", {
      searchQuery: "Shared Receiver",
      sort: "highest-similarity"
    });

    expect(result.items.map((item) => item.document.originalFilename)).toEqual([
      "higher-match.jpg",
      "lower-match.jpg"
    ]);
  });

  it("exports the full searched and sorted review queue without pagination", async () => {
    for (let index = 0; index < 12; index += 1) {
      mockDocuments.push(
        makeDoc({
          originalFilename: `match-${index}.jpg`,
          similarityScore: index / 20,
          slipImageRead: makeSlipImageRead({ receiverName: "Export Receiver" })
        })
      );
    }

    const rows = await getReviewQueueExportForUser("user-1", {
      searchQuery: "Export Receiver",
      sort: "highest-similarity"
    });

    expect(rows).toHaveLength(12);
    expect(rows[0].document.originalFilename).toBe("match-11.jpg");
    expect(rows.at(-1)?.document.originalFilename).toBe("match-0.jpg");
  });
});

function makeSlipImageRead(overrides: Partial<Record<keyof ImageReadTransferFields, string>>) {
  return {
    stage: "SLIP_IMAGE_READ" as const,
    algorithm: "slip-image-read-v1" as const,
    status: "COMPLETED" as const,
    result: "EXTRACTED" as const,
    readAt: new Date(),
    rawOcrText: null,
    notes: [],
    warnings: [],
    extractedFields: {
      amount: { value: overrides.amount ?? null, confidence: "HIGH" as const, source: "test" },
      receiverName: { value: overrides.receiverName ?? null, confidence: "HIGH" as const, source: "test" },
      senderName: { value: overrides.senderName ?? null, confidence: "HIGH" as const, source: "test" },
      dateTime: { value: overrides.dateTime ?? null, confidence: "HIGH" as const, source: "test" },
      transactionReference: { value: overrides.transactionReference ?? null, confidence: "HIGH" as const, source: "test" },
      senderBank: { value: overrides.senderBank ?? null, confidence: "HIGH" as const, source: "test" },
      receiverBank: { value: overrides.receiverBank ?? null, confidence: "HIGH" as const, source: "test" },
      senderAccountTail: { value: overrides.senderAccountTail ?? null, confidence: "HIGH" as const, source: "test" },
      receiverAccountTail: { value: overrides.receiverAccountTail ?? null, confidence: "HIGH" as const, source: "test" }
    }
  };
}

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

  it("keeps LOW confidence values available for compare display", () => {
    expect(getReviewFieldDisplayValue(doc, "senderName")).toEqual({
      value: "test sender",
      confidence: "low",
      isLowConfidence: true
    });
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
