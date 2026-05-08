import { getDb } from "@/lib/mongodb";
import type { DuplicateReviewPairRecord, ReviewPairDecision } from "@/lib/models";

let indexesReady = false;

async function ensureReviewPairIndexes() {
  if (indexesReady) {
    return;
  }

  const db = await getDb();
  await db.collection<DuplicateReviewPairRecord>("duplicate_review_pairs").createIndexes([
    {
      key: { userId: 1, documentAId: 1, documentBId: 1 },
      name: "duplicate_review_pairs_user_pair",
      unique: true
    },
    {
      key: { userId: 1, decision: 1 },
      name: "duplicate_review_pairs_user_decision"
    }
  ]);
  indexesReady = true;
}

export function normalizeReviewPair(input: {
  documentId: string;
  matchedDocumentId: string;
}) {
  const [documentAId, documentBId] = [input.documentId, input.matchedDocumentId].sort();

  return {
    documentAId,
    documentBId
  };
}

export async function upsertReviewedPair(input: {
  userId: string;
  documentId: string;
  matchedDocumentId: string;
  decision: ReviewPairDecision;
  reviewedByUserId: string;
  reviewedAt: Date;
}) {
  await ensureReviewPairIndexes();

  const pair = normalizeReviewPair(input);
  const db = await getDb();

  await db.collection<DuplicateReviewPairRecord>("duplicate_review_pairs").updateOne(
    {
      userId: input.userId,
      ...pair
    },
    {
      $set: {
        decision: input.decision,
        reviewedByUserId: input.reviewedByUserId,
        reviewedAt: input.reviewedAt,
        updatedAt: input.reviewedAt
      },
      $setOnInsert: {
        userId: input.userId,
        ...pair,
        createdAt: input.reviewedAt
      }
    },
    { upsert: true }
  );
}

export async function getReviewedPair(input: {
  userId: string;
  documentId: string;
  matchedDocumentId: string;
}) {
  await ensureReviewPairIndexes();

  const pair = normalizeReviewPair(input);
  const db = await getDb();

  return db.collection<DuplicateReviewPairRecord>("duplicate_review_pairs").findOne({
    userId: input.userId,
    ...pair
  });
}

export async function filterUnreviewedCandidatePairs<T extends { _id?: unknown }>(input: {
  userId: string;
  documentId: string;
  candidates: T[];
}) {
  await ensureReviewPairIndexes();

  if (input.candidates.length === 0) {
    return input.candidates;
  }

  const db = await getDb();
  const pairFilters = input.candidates
    .filter((candidate) => candidate._id)
    .map((candidate) => normalizeReviewPair({
      documentId: input.documentId,
      matchedDocumentId: String(candidate._id)
    }));

  if (pairFilters.length === 0) {
    return input.candidates;
  }

  const reviewedPairs = await db
    .collection<DuplicateReviewPairRecord>("duplicate_review_pairs")
    .find({
      userId: input.userId,
      $or: pairFilters
    })
    .toArray();
  const reviewedPairKeys = new Set(
    reviewedPairs.map((pair) => `${pair.documentAId}:${pair.documentBId}`)
  );

  return input.candidates.filter((candidate) => {
    if (!candidate._id) {
      return false;
    }

    const pair = normalizeReviewPair({
      documentId: input.documentId,
      matchedDocumentId: String(candidate._id)
    });

    return !reviewedPairKeys.has(`${pair.documentAId}:${pair.documentBId}`);
  });
}
