import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { resolveDuplicateDecision, resolveExactDuplicateDecision } from "../lib/duplicate-detection";

describe("resolveExactDuplicateDecision", () => {
  it("marks uploads as new when no existing document has the same exact hash", () => {
    expect(resolveExactDuplicateDecision(null)).toEqual({
      duplicateStatus: "NEW",
      duplicateDecisionType: "NEW_UPLOAD",
      duplicateDecisionReasons: [],
      matchedDocumentId: null,
      similarityScore: null
    });
  });

  it("marks uploads as exact duplicates when a matching document exists", () => {
    const existingId = new ObjectId();

    expect(resolveExactDuplicateDecision({ _id: existingId })).toEqual({
      duplicateStatus: "EXACT_DUPLICATE",
      duplicateDecisionType: "EXACT_DUPLICATE",
      duplicateDecisionReasons: [],
      matchedDocumentId: String(existingId),
      similarityScore: 1
    });
  });

  it("keeps exact duplicates higher priority than likely duplicates", () => {
    const exactId = new ObjectId();

    expect(
      resolveDuplicateDecision({
        exactMatch: { _id: exactId },
        nearMatch: {
          matchedDocumentId: String(new ObjectId()),
          similarityScore: 0.9375
        }
      })
    ).toEqual({
      duplicateStatus: "EXACT_DUPLICATE",
      duplicateDecisionType: "EXACT_DUPLICATE",
      duplicateDecisionReasons: [],
      matchedDocumentId: String(exactId),
      similarityScore: 1
    });
  });

  it("marks likely duplicates when there is no exact match but a perceptual match exists", () => {
    const nearId = String(new ObjectId());

    expect(
      resolveDuplicateDecision({
        exactMatch: null,
        nearMatch: {
          matchedDocumentId: nearId,
          similarityScore: 0.9375
        }
      })
    ).toEqual({
      duplicateStatus: "LIKELY_DUPLICATE",
      duplicateDecisionType: "LIKELY_DUPLICATE_REVIEW",
      duplicateDecisionReasons: ["IMAGE_SIMILARITY_ONLY"],
      matchedDocumentId: nearId,
      similarityScore: 0.9375
    });
  });
});
