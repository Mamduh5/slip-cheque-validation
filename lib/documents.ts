import "server-only";

import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { getDocumentProcessingProfile } from "@/lib/document-processing-profiles";
import { formatDocumentType, getDocumentTypeProcessingProfile } from "@/lib/document-types";
import { getDb } from "@/lib/mongodb";
import {
  resolveDuplicateDecision,
  type SuppressedNearDuplicate
} from "@/lib/duplicate-detection";
import { processUploadedDocumentImage } from "@/lib/document-processing";
import {
  hammingDistanceHex,
  likelyDuplicateHammingThreshold,
  selectBestPerceptualMatch,
  similarityScoreFromHammingDistance
} from "@/lib/perceptual-hash";
import { documentMatchesExtractedFieldSearch } from "@/lib/extracted-field-search";
import { filterUnreviewedCandidatePairs, upsertReviewedPair } from "@/lib/review-pairs";
import { assessTransferSlipDuplicateCandidate } from "@/lib/transfer-slip-duplicate-assessment";
import type {
  DocumentRecord,
  DocumentType,
  DuplicateDecisionReason,
  DuplicateDecisionType,
  DuplicateStatus,
  ReviewPairDecision,
  ReviewStatus,
  SourceType
} from "@/lib/models";
import { putOriginalDocumentObject } from "@/lib/object-storage";
import type { DuplicateDecision } from "@/lib/duplicate-detection";
import type { DocumentReviewFilter } from "@/lib/formatters";

let indexesReady = false;

export type ReviewQueueSort = "newest" | "oldest" | "highest-similarity" | "lowest-similarity";

export interface ReviewQueueOptions {
  searchQuery?: string;
  sort?: ReviewQueueSort;
  page?: number;
  pageSize?: number;
}

export interface ReviewQueueResult {
  items: Array<{ document: DocumentRecord; matchedDocument: DocumentRecord | null }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: ReviewQueueSort;
  searchQuery: string;
}

export interface ExportDocumentResult {
  document: DocumentRecord;
  matchedDocument: DocumentRecord | null;
}

const exportResultLimit = 5000;

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
    { key: { userId: 1, reviewStatus: 1, createdAt: -1 }, name: "documents_user_review_status_created_at" },
    {
      key: { userId: 1, duplicateStatus: 1, reviewStatus: 1, similarityScore: -1, createdAt: -1 },
      name: "documents_user_review_queue_similarity_created_at"
    }
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
  slipVerification: DocumentRecord["slipVerification"];
  slipImageRead: DocumentRecord["slipImageRead"];
  exactHash: string;
  perceptualHash: string | null;
  qualityStatus: DocumentRecord["qualityStatus"];
  qualityWarnings: DocumentRecord["qualityWarnings"];
  qualityMetrics: DocumentRecord["qualityMetrics"];
  qualityCheckedAt: DocumentRecord["qualityCheckedAt"];
  duplicateDecision: DuplicateDecision;
  notes?: string | null;
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
    slipVerification: input.slipVerification,
    slipImageRead: input.slipImageRead,
    status: input.perceptualHash ? "READY" : "UPLOADED",
    duplicateStatus: input.duplicateDecision.duplicateStatus,
    duplicateDecisionType: input.duplicateDecision.duplicateDecisionType,
    duplicateDecisionReasons: input.duplicateDecision.duplicateDecisionReasons,
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
    notes: input.notes ?? null,
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

export interface DuplicateMatchResult {
  matchedDocumentId: string | null;
  similarityScore: number | null;
  suppressionNote?: string;
  suppressionReasons?: DuplicateDecisionReason[];
}

export async function findDuplicateMatchForUser(input: {
  userId: string;
  documentId: ObjectId;
  perceptualHash: string;
  documentType: DocumentType;
  qrDecode: DocumentRecord["qrDecode"];
  transferMetadata: DocumentRecord["transferMetadata"];
  slipImageRead: DocumentRecord["slipImageRead"];
  excludeDocumentId?: ObjectId;
}): Promise<DuplicateMatchResult | null> {
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
        createdAt: 1,
        qrDecode: 1,
        transferMetadata: 1,
        slipImageRead: 1
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

  const matches = unreviewedCandidates
    .filter((candidate) => candidate.perceptualHash)
    .map((candidate) => {
      const distance = hammingDistanceHex(input.perceptualHash, candidate.perceptualHash as string);

      return {
        document: candidate,
        hammingDistance: distance,
        similarityScore: similarityScoreFromHammingDistance(distance)
      };
    })
    .filter((match) => match.hammingDistance <= likelyDuplicateHammingThreshold)
    .sort((left, right) => {
      if (left.hammingDistance !== right.hammingDistance) {
        return left.hammingDistance - right.hammingDistance;
      }

      const createdAtComparison =
        left.document.createdAt.getTime() - right.document.createdAt.getTime();

      if (createdAtComparison !== 0) {
        return createdAtComparison;
      }

      return String(left.document._id).localeCompare(String(right.document._id));
    });

  if (matches.length === 0) {
    return null;
  }

  // For transfer slips, run structured assessment when we have parsed metadata or useful image-read fields
  const hasStructuredEvidence =
    input.transferMetadata?.result === "PARSED" ||
    (input.slipImageRead?.result === "EXTRACTED" || input.slipImageRead?.result === "PARTIAL");

  if (input.documentType === "BANK_TRANSFER_SLIP" && hasStructuredEvidence) {
    for (const match of matches) {
      const assessment = assessTransferSlipDuplicateCandidate(
        { qrDecode: input.qrDecode, transferMetadata: input.transferMetadata, slipImageRead: input.slipImageRead },
        {
          qrDecode: match.document.qrDecode,
          transferMetadata: match.document.transferMetadata,
          slipImageRead: match.document.slipImageRead
        }
      );
      if (assessment.result !== "CONFLICT") {
        return {
          matchedDocumentId: String(match.document._id),
          similarityScore: match.similarityScore
        };
      }
    }

    // All top candidates had strong conflicts
    const firstConflict = assessTransferSlipDuplicateCandidate(
      { qrDecode: input.qrDecode, transferMetadata: input.transferMetadata, slipImageRead: input.slipImageRead },
      {
        qrDecode: matches[0].document.qrDecode,
        transferMetadata: matches[0].document.transferMetadata,
        slipImageRead: matches[0].document.slipImageRead
      }
    );

    return {
      matchedDocumentId: null,
      similarityScore: null,
      suppressionNote: firstConflict.notes,
      suppressionReasons: firstConflict.reasonCodes
    };
  }

  // Non-transfer-slip or no parsed metadata: return best perceptual match
  const best = matches[0];

  return {
    matchedDocumentId: String(best.document._id),
    similarityScore: best.similarityScore
  };
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
  const duplicateMatch =
    existingExactMatch === null
      ? await findDuplicateMatchForUser({
          userId: input.userId,
          documentId,
          perceptualHash: processedImage.perceptualHash,
          documentType: input.documentType,
          qrDecode: processedImage.qrDecode,
          transferMetadata: processedImage.transferMetadata,
          slipImageRead: processedImage.slipImageRead,
          excludeDocumentId: documentId
        })
      : null;
  const duplicateDecision = resolveDuplicateDecision({
    exactMatch: existingExactMatch,
    nearMatch:
      duplicateMatch?.matchedDocumentId != null
        ? {
            matchedDocumentId: duplicateMatch.matchedDocumentId,
            similarityScore: duplicateMatch.similarityScore as number
          }
        : null,
    suppressedNearDuplicate:
      duplicateMatch &&
      duplicateMatch.matchedDocumentId == null &&
      duplicateMatch.suppressionReasons
        ? { duplicateDecisionReasons: duplicateMatch.suppressionReasons }
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
    slipVerification: processedImage.slipVerification,
    slipImageRead: processedImage.slipImageRead,
    exactHash,
    perceptualHash: processedImage.perceptualHash,
    qualityStatus: processedImage.qualityStatus,
    qualityWarnings: processedImage.qualityWarnings,
    qualityMetrics: processedImage.qualityMetrics,
    qualityCheckedAt: processedImage.qualityCheckedAt,
    duplicateDecision,
    notes: duplicateMatch?.suppressionNote ?? null
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
      slipVerification: record.slipVerification
        ? {
            status: record.slipVerification.status,
            result: record.slipVerification.result,
            evidenceCategory: record.slipVerification.evidenceCategory
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


function normalizePage(value: number | undefined) {
  return Number.isInteger(value) && value && value > 0 ? value : 1;
}

function normalizePageSize(value: number | undefined) {
  if (!Number.isInteger(value) || !value || value <= 0) return 10;
  return Math.min(value, 50);
}

function reviewQueueSort(sort: ReviewQueueSort): Record<string, 1 | -1> {
  switch (sort) {
    case "oldest":
      return { createdAt: 1, _id: 1 };
    case "highest-similarity":
      return { similarityScore: -1, createdAt: -1, _id: -1 };
    case "lowest-similarity":
      return { similarityScore: 1, createdAt: -1, _id: -1 };
    default:
      return { createdAt: -1, _id: -1 };
  }
}

function sortReviewDocuments(documents: DocumentRecord[], sort: ReviewQueueSort): DocumentRecord[] {
  return [...documents].sort((left, right) => {
    if (sort === "oldest") {
      return left.createdAt.getTime() - right.createdAt.getTime() || String(left._id).localeCompare(String(right._id));
    }

    if (sort === "highest-similarity" || sort === "lowest-similarity") {
      const leftScore = left.similarityScore ?? -1;
      const rightScore = right.similarityScore ?? -1;
      const scoreComparison = leftScore - rightScore;
      if (scoreComparison !== 0) {
        return sort === "highest-similarity" ? -scoreComparison : scoreComparison;
      }
    }

    return right.createdAt.getTime() - left.createdAt.getTime() || String(right._id).localeCompare(String(left._id));
  });
}

async function getMatchedDocumentsForUser(documents: DocumentRecord[], userId: string) {
  const db = await getDb();
  const validMatchedIds = documents
    .filter((d) => d.matchedDocumentId && ObjectId.isValid(d.matchedDocumentId))
    .map((d) => new ObjectId(d.matchedDocumentId as string));

  if (validMatchedIds.length === 0) {
    return new Map<string, DocumentRecord>();
  }

  const matchedDocs = await db
    .collection<DocumentRecord>("documents")
    .find({ _id: { $in: validMatchedIds }, userId })
    .toArray();

  return new Map(matchedDocs.map((d) => [String(d._id), d]));
}

export async function getReviewQueueForUser(userId: string, options: ReviewQueueOptions = {}): Promise<ReviewQueueResult> {
  await ensureDocumentIndexes();
  const db = await getDb();
  const sort = options.sort ?? "newest";
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(options.pageSize);
  const searchQuery = (options.searchQuery ?? "").trim();
  const query = { userId, duplicateStatus: "LIKELY_DUPLICATE" as const, reviewStatus: "PENDING" as const };
  let pending: DocumentRecord[];
  let total: number;

  if (searchQuery) {
    const searchCandidates = await db
      .collection<DocumentRecord>("documents")
      .find(query)
      .sort(reviewQueueSort(sort))
      .limit(500)
      .toArray();
    const filtered = sortReviewDocuments(
      searchCandidates.filter((document) => documentMatchesExtractedFieldSearch(document, searchQuery)),
      sort
    );
    total = filtered.length;
    pending = filtered.slice((page - 1) * pageSize, page * pageSize);
  } else {
    total = await db.collection<DocumentRecord>("documents").countDocuments(query);
    pending = await db
      .collection<DocumentRecord>("documents")
      .find(query)
      .sort(reviewQueueSort(sort))
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();
  }

  const matchedById = await getMatchedDocumentsForUser(pending, userId);

  return {
    items: pending.map((doc) => ({
      document: doc,
      matchedDocument: doc.matchedDocumentId ? (matchedById.get(doc.matchedDocumentId) ?? null) : null
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    sort,
    searchQuery
  };
}

export async function getReviewQueueExportForUser(
  userId: string,
  options: Pick<ReviewQueueOptions, "searchQuery" | "sort"> = {}
): Promise<ExportDocumentResult[]> {
  await ensureDocumentIndexes();
  const db = await getDb();
  const sort = options.sort ?? "newest";
  const searchQuery = (options.searchQuery ?? "").trim();
  const query = { userId, duplicateStatus: "LIKELY_DUPLICATE" as const, reviewStatus: "PENDING" as const };
  const candidates = await db
    .collection<DocumentRecord>("documents")
    .find(query)
    .sort(reviewQueueSort(sort))
    .limit(exportResultLimit)
    .toArray();
  const documents = searchQuery
    ? sortReviewDocuments(
        candidates.filter((document) => documentMatchesExtractedFieldSearch(document, searchQuery)),
        sort
      )
    : candidates;
  const matchedById = await getMatchedDocumentsForUser(documents, userId);

  return documents.map((document) => ({
    document,
    matchedDocument: document.matchedDocumentId ? (matchedById.get(document.matchedDocumentId) ?? null) : null
  }));
}

function buildRecentDocumentsQuery(
  userId: string,
  input: {
    reviewFilter?: DocumentReviewFilter;
    documentType?: DocumentType;
    duplicateStatus?: DuplicateStatus;
    duplicateDecisionType?: DuplicateDecisionType;
  }
) {
  const query: {
    userId: string;
    reviewStatus?: ReviewStatus;
    documentType?: DocumentType;
    duplicateStatus?: DuplicateStatus;
    duplicateDecisionType?: DuplicateDecisionType;
  } = { userId };
  const reviewFilter = input.reviewFilter ?? "all";

  if (reviewFilter === "pending") {
    query.reviewStatus = "PENDING";
  } else if (reviewFilter === "confirmed-duplicate") {
    query.reviewStatus = "CONFIRMED_DUPLICATE";
  } else if (reviewFilter === "confirmed-distinct") {
    query.reviewStatus = "CONFIRMED_DISTINCT";
  }

  if (input.documentType) {
    query.documentType = input.documentType;
  }

  if (input.duplicateStatus) {
    query.duplicateStatus = input.duplicateStatus;
  }

  if (input.duplicateDecisionType) {
    query.duplicateDecisionType = input.duplicateDecisionType;
  }

  return query;
}

export async function getRecentDocumentsForUser(
  userId: string,
  input: {
    limit?: number;
    reviewFilter?: DocumentReviewFilter;
    documentType?: DocumentType;
    duplicateStatus?: DuplicateStatus;
    duplicateDecisionType?: DuplicateDecisionType;
    searchQuery?: string;
  } = {}
) {
  await ensureDocumentIndexes();

  const db = await getDb();
  const query = buildRecentDocumentsQuery(userId, input);
  const searchQuery = input.searchQuery?.trim();
  const baseCursor = db
    .collection<DocumentRecord>("documents")
    .find(query)
    .sort({ createdAt: -1 });

  if (searchQuery) {
    const candidates = await baseCursor.limit(200).toArray();
    return candidates
      .filter((document) => documentMatchesExtractedFieldSearch(document, searchQuery))
      .slice(0, input.limit ?? 12);
  }

  return baseCursor.limit(input.limit ?? 12).toArray();
}

export async function getDashboardExportDocumentsForUser(
  userId: string,
  input: {
    reviewFilter?: DocumentReviewFilter;
    documentType?: DocumentType;
    duplicateStatus?: DuplicateStatus;
    duplicateDecisionType?: DuplicateDecisionType;
    searchQuery?: string;
  } = {}
): Promise<ExportDocumentResult[]> {
  await ensureDocumentIndexes();

  const db = await getDb();
  const query = buildRecentDocumentsQuery(userId, input);
  const searchQuery = input.searchQuery?.trim();
  const candidates = await db
    .collection<DocumentRecord>("documents")
    .find(query)
    .sort({ createdAt: -1 })
    .limit(exportResultLimit)
    .toArray();
  const documents = searchQuery
    ? candidates.filter((document) => documentMatchesExtractedFieldSearch(document, searchQuery))
    : candidates;
  const matchedById = await getMatchedDocumentsForUser(documents, userId);

  return documents.map((document) => ({
    document,
    matchedDocument: document.matchedDocumentId ? (matchedById.get(document.matchedDocumentId) ?? null) : null
  }));
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
        slipImageRead: null,
        slipVerification: null,
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
      slipImageReadReset: document.slipImageRead ? true : false,
      slipVerificationReset: document.slipVerification ? true : false,
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

export { formatDocumentType } from "@/lib/document-types";
export { formatDuplicateStatus, formatReviewStatus, formatQualityStatus } from "@/lib/formatters";

function reviewStatusForDuplicateDecision(status: DuplicateDecision["duplicateStatus"]): ReviewStatus {
  return status === "LIKELY_DUPLICATE" ? "PENDING" : "NOT_REQUIRED";
}
