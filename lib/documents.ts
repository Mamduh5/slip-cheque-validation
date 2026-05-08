import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type {
  DocumentRecord,
  DocumentType,
  DuplicateStatus,
  SourceType
} from "@/lib/models";
import { putOriginalDocumentObject } from "@/lib/object-storage";

let indexesReady = false;

async function ensureDocumentIndexes() {
  if (indexesReady) {
    return;
  }

  const db = await getDb();
  await db.collection<DocumentRecord>("documents").createIndexes([
    { key: { userId: 1, createdAt: -1 }, name: "documents_user_created_at" },
    { key: { exactHash: 1 }, name: "documents_exact_hash", sparse: true },
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

  const record: DocumentRecord = {
    _id: documentId,
    userId: input.userId,
    documentType: input.documentType,
    sourceType: input.sourceType,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    originalObject,
    status: "UPLOADED",
    duplicateStatus: "NOT_CHECKED",
    matchedDocumentId: null,
    similarityScore: null,
    exactHash,
    perceptualHash: null,
    notes: null,
    createdAt: now,
    updatedAt: now
  };

  const db = await getDb();
  await db.collection<DocumentRecord>("documents").insertOne(record);

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
