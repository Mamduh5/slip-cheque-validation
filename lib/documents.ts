import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { resolveExactDuplicateDecision } from "@/lib/duplicate-detection";
import type {
  DocumentRecord,
  DocumentType,
  DuplicateStatus,
  SourceType
} from "@/lib/models";
import { putOriginalDocumentObject } from "@/lib/object-storage";
import type { ExactDuplicateDecision } from "@/lib/duplicate-detection";

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
    { key: { duplicateStatus: 1 }, name: "documents_duplicate_status" }
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
  exactHash: string;
  duplicateDecision: ExactDuplicateDecision;
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
    status: "UPLOADED",
    duplicateStatus: input.duplicateDecision.duplicateStatus,
    matchedDocumentId: input.duplicateDecision.matchedDocumentId,
    similarityScore: input.duplicateDecision.similarityScore,
    exactHash: input.exactHash,
    perceptualHash: null,
    notes: null,
    createdAt: input.now,
    updatedAt: input.now
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

  const now = new Date();
  const documentId = new ObjectId();
  const exactHash = calculateSha256(input.buffer);
  const db = await getDb();
  const existingExactMatch = await db
    .collection<DocumentRecord>("documents")
    .findOne({ exactHash }, { sort: { createdAt: 1 } });
  const duplicateDecision = resolveExactDuplicateDecision(existingExactMatch);
  const objectKey = buildDocumentObjectKey({
    userId: input.userId,
    documentId: String(documentId),
    originalFilename: input.originalFilename
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
    exactHash,
    duplicateDecision
  });

  await db.collection<DocumentRecord>("documents").insertOne(record);
  await db.collection("audit_logs").insertOne({
    userId: input.userId,
    action:
      record.duplicateStatus === "EXACT_DUPLICATE"
        ? "DOCUMENT_EXACT_DUPLICATE_UPLOADED"
        : "DOCUMENT_NEW_UPLOADED",
    targetType: "document",
    targetId: String(documentId),
    metadata: {
      exactHash,
      matchedDocumentId: record.matchedDocumentId
    },
    createdAt: now
  });

  return record;
}

export async function getRecentDocumentsForUser(userId: string, limit = 12) {
  await ensureDocumentIndexes();

  const db = await getDb();
  return db
    .collection<DocumentRecord>("documents")
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
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

export function formatDuplicateStatus(status: DuplicateStatus) {
  return status.replaceAll("_", " ");
}
