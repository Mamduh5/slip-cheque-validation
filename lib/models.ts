import type { ObjectId } from "mongodb";

export const documentTypes = [
  "BANK_TRANSFER_SLIP",
  "DEPOSIT_PAYMENT_SLIP",
  "CHEQUE",
  "UNKNOWN"
] as const;

export const sourceTypes = ["CAMERA", "UPLOAD"] as const;
export const documentStatuses = ["UPLOADED", "PROCESSING", "READY", "FAILED"] as const;
export const duplicateStatuses = [
  "NOT_CHECKED",
  "PENDING",
  "NEW",
  "EXACT_DUPLICATE",
  "LIKELY_DUPLICATE",
  "DUPLICATE",
  "POSSIBLE_DUPLICATE",
  "ERROR"
] as const;

export const reviewStatuses = [
  "NOT_REQUIRED",
  "PENDING",
  "CONFIRMED_DUPLICATE",
  "CONFIRMED_DISTINCT"
] as const;

export const reviewPairDecisions = ["CONFIRMED_DUPLICATE", "CONFIRMED_DISTINCT"] as const;

export type DocumentType = (typeof documentTypes)[number];
export type SourceType = (typeof sourceTypes)[number];
export type DocumentStatus = (typeof documentStatuses)[number];
export type DuplicateStatus = (typeof duplicateStatuses)[number];
export type ReviewStatus = (typeof reviewStatuses)[number];
export type ReviewPairDecision = (typeof reviewPairDecisions)[number];

export interface AppUser {
  _id?: ObjectId;
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  passwordHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredObjectRef {
  bucket: string;
  key: string;
}

export interface NormalizedImageMetadata {
  width: number;
  height: number;
  mimeType: "image/webp";
  fileSize: number;
  algorithm: "normalized-webp-grayscale-v1";
}

export interface DocumentRecord {
  _id?: ObjectId;
  userId: string;
  documentType: DocumentType;
  sourceType: SourceType;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  originalObject: StoredObjectRef;
  normalizedObject: StoredObjectRef | null;
  normalizedImage: NormalizedImageMetadata | null;
  status: DocumentStatus;
  duplicateStatus: DuplicateStatus;
  matchedDocumentId: string | null;
  similarityScore: number | null;
  reviewStatus: ReviewStatus;
  reviewedAt: Date | null;
  reviewedMatchDocumentId: string | null;
  exactHash: string | null;
  perceptualHash: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogRecord {
  _id?: ObjectId;
  userId?: string;
  action: string;
  targetType: "document" | "user" | "system";
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface DuplicateReviewPairRecord {
  _id?: ObjectId;
  userId: string;
  documentAId: string;
  documentBId: string;
  decision: ReviewPairDecision;
  reviewedByUserId: string;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
