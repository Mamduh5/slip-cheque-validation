import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { resolveExactDuplicateDecision } from "../lib/duplicate-detection";

describe("resolveExactDuplicateDecision", () => {
  it("marks uploads as new when no existing document has the same exact hash", () => {
    expect(resolveExactDuplicateDecision(null)).toEqual({
      duplicateStatus: "NEW",
      matchedDocumentId: null,
      similarityScore: null
    });
  });

  it("marks uploads as exact duplicates when a matching document exists", () => {
    const existingId = new ObjectId();

    expect(resolveExactDuplicateDecision({ _id: existingId })).toEqual({
      duplicateStatus: "EXACT_DUPLICATE",
      matchedDocumentId: String(existingId),
      similarityScore: 1
    });
  });
});
