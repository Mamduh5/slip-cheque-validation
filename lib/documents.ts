import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { getDocumentProcessingProfile } from "@/lib/document-processing-profiles";
import { formatDocumentType, getDocumentTypeProcessingProfile } from "@/lib/document-types";
import { getDb } from "@/lib/mongodb";
import { resolveDuplicateDecision } from "@/lib/duplicate-detection";
import { processUploadedDocumentImage } from "@/lib/document-processing";
import { selectBestPerceptualMatch } from "@/lib/perceptual-hash";
import { filterUnreviewedCandidatePairs, upsertReviewedPair } from "@/lib/review-pairs";
import type {
  DocumentRecord,
  DocumentType,
  DuplicateStatus,
  ReviewPairDecision,
  ReviewStatus,
  SourceType
} from "@/lib/models";
import { putOriginalDocumentObject } from "@/lib/object-storage";
import type { DuplicateDecision } from "@/lib/duplicate-detection";

let indexesReady = false;

async function ensureDocumentIndexes() {
  if (indexesReady) {
    return;
  }

  const db = await getDb();
  await db.collection<DocumentRecord>("documents").createIndexes([
    { key: { userId: 1, createdAt: -1 }, name: "documents_user_created_at" },
    { key: { exactHash: 1 }, name: "documents_exact_hash", sparse: true },
    { key: { exactHash: 1, createdAt: 1 }, name: "documents_exact_hash_created_at", sparse: true },
    {
      key: { userId: 1, exactHash: 1, createdAt: 1, _id: 1 },
      name: "documents_user_exact_hash_created_at_id",
      sparse: true
    },
    {
      key: { userId: 1, perceptualHash: 1, createdAt: 1, _id: 1 },
      name: "documents_user_perceptual_hash_created_at_id",
      sparse: true
    },
    { key: { duplicateStatus: 1 }, name: "documents_duplicate_status" },
    { key: { userId: 1, reviewStatus: 1, createdAt: -1 }, name: "documents_user_review_status_created_at" }
  ]);
  indexesReady = true;
}

export function calculateSha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function buildDocumentObjectKey(input: {
  userId: string;
  documentId: string;
  originalFilename: string;
}) {
  const extension = input.originalFilename.split(".").pop()?.toLowerCase();
  const suffix = extension ? `.${extension.replace(/[^a-z0-9]/g, "")}` : "";

  return `documents/${input.userId}/${input.documentId}/original${suffix}`;
}

export function buildUploadedDocumentRecord(input: {
  documentId: ObjectId;
  now: Date;
  userId: string;
  documentType: DocumentType;
  sourceType: SourceType;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  originalObject: DocumentRecord["originalObject"];
  normalizedObject: DocumentRecord["normalizedObject"];
  normalizedImage: DocumentRecord["normalizedImage"];
  processingProfile: NonNullable<DocumentRecord["processingProfile"]>;
  qrCandidateAnalysis: DocumentRecord["qrCandidateAnalysis"];
  qrDecode: DocumentRecord["qrDecode"];
  transferMetadata: DocumentRecord["transferMetadata"];
  exactHash: string;
  perceptualHash: string | null;
  qualityStatus: DocumentRecord["qualityStatus"];
  qualityWarnings: DocumentRecord["qualityWarnings"];
  qualityMetrics: DocumentRecord["qualityMetrics"];
  qualityCheckedAt: DocumentRecord["qualityCheckedAt"];
  duplicateDecision: DuplicateDecision;
}): DocumentRecord {
  return {
    _id: input.documentId,
    userId: input.userId,
    documentType: input.documentType,
    sourceType: input.sourceType,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    originalObject: input.originalObject,
    normalizedObject: input.normalizedObject,
    normalizedImage: input.normalizedImage,
    processingProfile: input.processingProfile,
    qrCandidateAnalysis: input.qrCandidateAnalysis,
    qrDecode: input.qrDecode,
    transferMetadata: input.transferMetadata,
    status: input.perceptualHash ? "READY" : "UPLOADED",
    duplicateStatus: input.duplicateDecision.duplicateStatus,
    matchedDocumentId: input.duplicateDecision.matchedDocumentId,
    similarityScore: input.duplicateDecision.similarityScore,
    reviewStatus: reviewStatusForDuplicateDecision(input.duplicateDecision.duplicateStatus),
    reviewedAt: null,
    reviewedMatchDocumentId: null,
    qualityStatus: input.qualityStatus,
    qualityWarnings: input.qualityWarnings,
    qualityMetrics: input.qualityMetrics,
    qualityCheckedAt: input.qualityCheckedAt,
    exactHash: input.exactHash,
    perceptualHash: input.perceptualHash,
    notes: null,
    createdAt: input.now,
    updatedAt: input.now
  };
}

export async function findEarliestExactMatchForUser(input: {
  userId: string;
  exactHash: string;
  excludeDocumentId?: ObjectId;
}) {
  const db = await getDb();
  const query: {
    userId: string;
    exactHash: string;
    _id?: { $ne: ObjectId };
  } = {
    userId: input.userId,
    exactHash: input.exactHash
  };

  if (input.excludeDocumentId) {
    query._id = { $ne: input.excludeDocumentId };
  }

  return db.collection<DocumentRecord>("documents").findOne(query, {
    sort: { createdAt: 1, _id: 1 }
  });
}

export async function findLikelyDuplicateMatchForUser(input: {
  userId: string;
  documentId: ObjectId;
  perceptualHash: string;
  excludeDocumentId?: ObjectId;
}) {
  const db = await getDb();
  const query: {
    userId: string;
    perceptualHash: { $ne: null };
    _id?: { $ne: ObjectId };
  } = {
    userId: input.userId,
    perceptualHash: { $ne: null }
  };

  if (input.excludeDocumentId) {
    query._id = { $ne: input.excludeDocumentId };
  }

  const candidates = await db
    .collection<DocumentRecord>("documents")
    .find(query, {
      projection: {
        _id: 1,
        perceptualHash: 1,
        createdAt: 1
      }
    })
    .sort({ createdAt: 1, _id: 1 })
    .limit(200)
    .toArray();
  const unreviewedCandidates = await filterUnreviewedCandidatePairs({
    userId: input.userId,
    documentId: String(input.documentId),
    candidates
  });

  return selectBestPerceptualMatch(unreviewedCandidates, input.perceptualHash);
}

export async function createUploadedDocument(input: {
  userId: string;
  documentType: DocumentType;
  sourceType: SourceType;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  buffer: Buffer;
}) {
  await ensureDocumentIndexes();
  const documentTypeProfile = getDocumentTypeProcessingProfile(input.documentType);

  const now = new Date();
  const documentId = new ObjectId();
  const exactHash = calculateSha256(input.buffer);
  const db = await getDb();
  const existingExactMatch = await findEarliestExactMatchForUser({
    userId: input.userId,
    exactHash,
    excludeDocumentId: documentId
  });
  const objectKey = buildDocumentObjectKey({
    userId: input.userId,
    documentId: String(documentId),
    originalFilename: input.originalFilename
  });

  const processedImage = await processUploadedDocumentImage({
    userId: input.userId,
    documentId: String(documentId),
    documentType: documentTypeProfile.type,
    buffer: input.buffer
  });
  const likelyDuplicateMatch =
    existingExactMatch === null
      ? await findLikelyDuplicateMatchForUser({
          userId: input.userId,
          documentId,
          perceptualHash: processedImage.perceptualHash,
          excludeDocumentId: documentId
        })
      : null;
  const duplicateDecision = resolveDuplicateDecision({
    exactMatch: existingExactMatch,
    nearMatch: likelyDuplicateMatch
      ? {
          matchedDocumentId: String(likelyDuplicateMatch.document._id),
          similarityScore: likelyDuplicateMatch.similarityScore
        }
      : null
  });
  const originalObject = await putOriginalDocumentObject({
    objectKey,
    buffer: input.buffer,
    mimeType: input.mimeType,
    originalFilename: input.originalFilename
  });

  const record = buildUploadedDocumentRecord({
    documentId,
    now,
    userId: input.userId,
    documentType: input.documentType,
    sourceType: input.sourceType,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    originalObject,
    normalizedObject: processedImage.normalizedObject,
    normalizedImage: processedImage.normalizedImage,
    processingProfile: processedImage.processingProfile,
    qrCandidateAnalysis: processedImage.qrCandidateAnalysis,
    qrDecode: processedImage.qrDecode,
    transferMetadata: processedImage.transferMetadata,
    exactHash,
    perceptualHash: processedImage.perceptualHash,
    qualityStatus: processedImage.qualityStatus,
    qualityWarnings: processedImage.qualityWarnings,
    qualityMetrics: processedImage.qualityMetrics,
    qualityCheckedAt: processedImage.qualityCheckedAt,
    duplicateDecision
  });

  await db.collection<DocumentRecord>("documents").insertOne(record);
  await db.collection("audit_logs").insertOne({
    userId: input.userId,
    action:
      record.duplicateStatus === "EXACT_DUPLICATE"
        ? "DOCUMENT_EXACT_DUPLICATE_UPLOADED"
        : record.duplicateStatus === "LIKELY_DUPLICATE"
          ? "DOCUMENT_LIKELY_DUPLICATE_UPLOADED"
        : "DOCUMENT_NEW_UPLOADED",
    targetType: "document",
    targetId: String(documentId),
    metadata: {
      exactHash,
      documentType: record.documentType,
      documentTypeLabel: formatDocumentType(record.documentType),
      processingProfileName: record.processingProfile?.name,
      processingProfileBranch: record.processingProfile?.branch,
      qrCandidateAnalysis: record.qrCandidateAnalysis
        ? {
            status: record.qrCandidateAnalysis.status,
            result: record.qrCandidateAnalysis.result,
            candidateCount: record.qrCandidateAnalysis.candidateCount
          }
        : null,
      transferMetadata: record.transferMetadata
        ? {
            status: record.transferMetadata.status,
            result: record.transferMetadata.result,
            payloadFormat: record.transferMetadata.payloadFormat
          }
        : null,
      perceptualHash: record.perceptualHash,
      matchedDocumentId: record.matchedDocumentId,
      qualityStatus: record.qualityStatus,
      qualityWarnings: record.qualityWarnings
    },
    createdAt: now
  });

  return record;
}

export type DocumentReviewFilter = "all" | "pending" | "confirmed-duplicate" | "confirmed-distinct";

export async function getRecentDocumentsForUser(
  userId: string,
  input: {
    limit?: number;
    reviewFilter?: DocumentReviewFilter;
  } = {}
) {
  await ensureDocumentIndexes();

  const db = await getDb();
  const query: {
    userId: string;
    reviewStatus?: ReviewStatus;
  } = { userId };
  const reviewFilter = input.reviewFilter ?? "all";

  if (reviewFilter === "pending") {
    query.reviewStatus = "PENDING";
  } else if (reviewFilter === "confirmed-duplicate") {
    query.reviewStatus = "CONFIRMED_DUPLICATE";
  } else if (reviewFilter === "confirmed-distinct") {
    query.reviewStatus = "CONFIRMED_DISTINCT";
  }

  return db
    .collection<DocumentRecord>("documents")
    .find(query)
    .sort({ createdAt: -1 })
    .limit(input.limit ?? 12)
    .toArray();
}

export async function getDocumentForUser(id: string, userId: string) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  return db.collection<DocumentRecord>("documents").findOne({
    _id: new ObjectId(id),
    userId
  });
}

export async function updateDocumentTypeForUser(input: {
  documentId: string;
  userId: string;
  documentType: DocumentType;
}) {
  await ensureDocumentIndexes();

  const document = await getDocumentForUser(input.documentId, input.userId);

  if (!document?._id) {
    return null;
  }

  if (document.documentType === input.documentType) {
    return document;
  }

  const now = new Date();
  const db = await getDb();
  const oldDocumentType = document.documentType;
  const oldDuplicateStatus = document.duplicateStatus;
  const oldReviewStatus = document.reviewStatus;
  const oldQualityStatus = document.qualityStatus;
  const oldProcessingProfile = document.processingProfile ?? getDocumentProcessingProfile(document.documentType);
  const newProcessingProfile = getDocumentProcessingProfile(input.documentType);

  await db.collection<DocumentRecord>("documents").updateOne(
    {
      _id: document._id,
      userId: input.userId
    },
    {
      $set: {
        documentType: input.documentType,
        processingProfile: newProcessingProfile,
        qrCandidateAnalysis: null,
        qrDecode: null,
        transferMetadata: null,
        updatedAt: now
      }
    }
  );

  await db.collection("audit_logs").insertOne({
    userId: input.userId,
    action: "DOCUMENT_TYPE_UPDATED",
    targetType: "document",
    targetId: String(document._id),
    metadata: {
      oldDocumentType,
      oldDocumentTypeLabel: formatDocumentType(oldDocumentType),
      newDocumentType: input.documentType,
      newDocumentTypeLabel: formatDocumentType(input.documentType),
      oldProcessingProfileName: oldProcessingProfile.name,
      newProcessingProfileName: newProcessingProfile.name,
      qrCandidateAnalysisReset: document.qrCandidateAnalysis ? true : false,
      changedByUserId: input.userId,
      unchangedDuplicateStatus: oldDuplicateStatus,
      unchangedReviewStatus: oldReviewStatus,
      unchangedQualityStatus: oldQualityStatus
    },
    createdAt: now
  });

  return getDocumentForUser(input.documentId, input.userId);
}

export class DocumentReviewError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "DocumentReviewError";
  }
}

export async function reviewLikelyDuplicateDocument(input: {
  documentId: string;
  userId: string;
  decision: ReviewPairDecision;
}) {
  await ensureDocumentIndexes();

  const document = await getDocumentForUser(input.documentId, input.userId);

  if (!document) {
    throw new DocumentReviewError("Document not found.", 404);
  }

  if (document.duplicateStatus !== "LIKELY_DUPLICATE" || document.reviewStatus !== "PENDING") {
    throw new DocumentReviewError("Only pending likely duplicates can be reviewed.", 409);
  }

  if (!document.matchedDocumentId) {
    throw new DocumentReviewError("Review requires a matched document.", 409);
  }

  const matchedDocument = await getDocumentForUser(document.matchedDocumentId, input.userId);

  if (!matchedDocument) {
    throw new DocumentReviewError("Matched document not found.", 409);
  }

  const now = new Date();
  const db = await getDb();

  await db.collection<DocumentRecord>("documents").updateOne(
    {
      _id: document._id,
      userId: input.userId,
      duplicateStatus: "LIKELY_DUPLICATE",
      reviewStatus: "PENDING"
    },
    {
      $set: {
        reviewStatus: input.decision,
        reviewedAt: now,
        reviewedMatchDocumentId: document.matchedDocumentId,
        updatedAt: now
      }
    }
  );

  await upsertReviewedPair({
    userId: input.userId,
    documentId: String(document._id),
    matchedDocumentId: document.matchedDocumentId,
    decision: input.decision,
    reviewedByUserId: input.userId,
    reviewedAt: now
  });

  await db.collection("audit_logs").insertOne({
    userId: input.userId,
    action:
      input.decision === "CONFIRMED_DUPLICATE"
        ? "DOCUMENT_REVIEW_CONFIRMED_DUPLICATE"
        : "DOCUMENT_REVIEW_CONFIRMED_DISTINCT",
    targetType: "document",
    targetId: String(document._id),
    metadata: {
      matchedDocumentId: document.matchedDocumentId,
      machineDuplicateStatus: document.duplicateStatus,
      similarityScore: document.similarityScore
    },
    createdAt: now
  });

  return getDocumentForUser(input.documentId, input.userId);
}

export function formatDuplicateStatus(status: DuplicateStatus) {
  const labels: Record<DuplicateStatus, string> = {
    NOT_CHECKED: "Not checked",
    PENDING: "Checking",
    NEW: "New upload",
    EXACT_DUPLICATE: "Exact duplicate",
    LIKELY_DUPLICATE: "Likely duplicate",
    DUPLICATE: "Duplicate",
    POSSIBLE_DUPLICATE: "Possible duplicate",
    ERROR: "Check failed"
  };

  return labels[status];
}

export function formatReviewStatus(status: ReviewStatus) {
  const labels: Record<ReviewStatus, string> = {
    NOT_REQUIRED: "Not required",
    PENDING: "Pending review",
    CONFIRMED_DUPLICATE: "Confirmed duplicate",
    CONFIRMED_DISTINCT: "Confirmed distinct"
  };

  return labels[status];
}

export function formatQualityStatus(status: DocumentRecord["qualityStatus"]) {
  const labels: Record<DocumentRecord["qualityStatus"], string> = {
    PASS: "Good",
    WARN: "Needs attention",
    FAIL: "Unusable"
  };

  return labels[status];
}

export { formatDocumentType };

function reviewStatusForDuplicateDecision(status: DuplicateDecision["duplicateStatus"]): ReviewStatus {
  return status === "LIKELY_DUPLICATE" ? "PENDING" : "NOT_REQUIRED";
}
