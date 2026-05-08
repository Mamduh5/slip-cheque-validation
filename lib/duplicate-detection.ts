import type { DocumentRecord } from "@/lib/models";

export interface ExactDuplicateMatch {
  matchedDocumentId: string;
  similarityScore: 1;
}

export interface ExactDuplicateDecision {
  duplicateStatus: "NEW" | "EXACT_DUPLICATE";
  matchedDocumentId: string | null;
  similarityScore: number | null;
}

export function resolveExactDuplicateDecision(
  existingDocument: Pick<DocumentRecord, "_id"> | null
): ExactDuplicateDecision {
  if (!existingDocument?._id) {
    return {
      duplicateStatus: "NEW",
      matchedDocumentId: null,
      similarityScore: null
    };
  }

  return {
    duplicateStatus: "EXACT_DUPLICATE",
    matchedDocumentId: String(existingDocument._id),
    similarityScore: 1
  };
}
