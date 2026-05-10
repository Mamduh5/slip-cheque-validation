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

export const qualityStatuses = ["PASS", "WARN", "FAIL"] as const;
export const qualityWarningCodes = [
  "IMAGE_TOO_SMALL",
  "BLURRY_IMAGE",
  "TOO_DARK",
  "TOO_BRIGHT"
] as const;

export const documentProcessingBranches = ["TRANSFER_SLIP", "PAYMENT_SLIP", "CHEQUE", "GENERIC"] as const;
export const documentProcessingStageStatuses = ["ACTIVE", "PLANNED"] as const;
export const qrCandidateStageStatuses = ["NOT_APPLICABLE", "PENDING", "COMPLETED", "FAILED"] as const;
export const qrCandidateResults = [
  "ANALYSIS_SKIPPED",
  "NO_CANDIDATE_FOUND",
  "CANDIDATE_FOUND"
] as const;

export const qrDecodeStageStatuses = ["NOT_APPLICABLE", "SKIPPED", "COMPLETED", "FAILED"] as const;
export const qrDecodeOutcomes = ["NO_QR_DECODED", "QR_DECODED"] as const;
export const transferMetadataParseStageStatuses = ["NOT_APPLICABLE", "SKIPPED", "COMPLETED", "FAILED"] as const;
export const transferMetadataParseResults = [
  "PARSED",
  "UNSUPPORTED_FORMAT",
  "NO_STRUCTURED_METADATA",
  "PARSE_FAILED"
] as const;
export const transferMetadataPayloadFormats = [
  "THAI_QR_PAYMENT",
  "GENERIC_URL",
  "PLAIN_TEXT",
  "UNKNOWN_FORMAT"
] as const;
export const slipVerificationStageStatuses = ["NOT_APPLICABLE", "SKIPPED", "COMPLETED"] as const;
export const slipVerificationResults = [
  "NOT_VERIFIED",
  "UNSUPPORTED",
  "STRUCTURALLY_CONSISTENT",
  "STRUCTURALLY_INCONSISTENT"
] as const;
export const slipVerificationEvidenceCategories = ["NO_EVIDENCE", "LOCAL_STRUCTURAL_CHECK"] as const;

export type DocumentType = (typeof documentTypes)[number];
export type SourceType = (typeof sourceTypes)[number];
export type DocumentStatus = (typeof documentStatuses)[number];
export type DuplicateStatus = (typeof duplicateStatuses)[number];
export type ReviewStatus = (typeof reviewStatuses)[number];
export type ReviewPairDecision = (typeof reviewPairDecisions)[number];
export type QualityStatus = (typeof qualityStatuses)[number];
export type QualityWarningCode = (typeof qualityWarningCodes)[number];
export type DocumentProcessingBranch = (typeof documentProcessingBranches)[number];
export type DocumentProcessingStageStatus = (typeof documentProcessingStageStatuses)[number];
export type QrCandidateStageStatus = (typeof qrCandidateStageStatuses)[number];
export type QrCandidateResult = (typeof qrCandidateResults)[number];
export type QrDecodeStageStatus = (typeof qrDecodeStageStatuses)[number];
export type QrDecodeOutcome = (typeof qrDecodeOutcomes)[number];
export type TransferMetadataParseStageStatus = (typeof transferMetadataParseStageStatuses)[number];
export type TransferMetadataParseResult = (typeof transferMetadataParseResults)[number];
export type TransferMetadataPayloadFormat = (typeof transferMetadataPayloadFormats)[number];
export type SlipVerificationStageStatus = (typeof slipVerificationStageStatuses)[number];
export type SlipVerificationResult = (typeof slipVerificationResults)[number];
export type SlipVerificationEvidenceCategory = (typeof slipVerificationEvidenceCategories)[number];

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

export interface QualityMetrics {
  width: number;
  height: number;
  meanLuminance: number;
  sharpness: number;
}

export interface DocumentProcessingProfileSnapshot {
  name: string;
  label: string;
  branch: DocumentProcessingBranch;
  family: "transfer-slip" | "payment-slip" | "cheque" | "generic";
  description: string;
  currentStages: string[];
  futureStages: string[];
  plannedStages: Array<{
    key: string;
    label: string;
    status: DocumentProcessingStageStatus;
    description: string;
  }>;
  capabilities: {
    qrOrientedFuturePath: boolean;
    qrCandidateAnalysisImplemented: boolean;
    extractionImplemented: boolean;
    verificationImplemented: boolean;
  };
}

export interface QrCandidateAnalysisResult {
  stage: "QR_CANDIDATE";
  algorithm: "qr-candidate-heuristic-v1";
  status: QrCandidateStageStatus;
  result: QrCandidateResult;
  checkedAt: Date;
  candidateCount: number;
  bestCandidate: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    source: "normalized-image";
  } | null;
  notes: string[];
}

export interface QrDecodeAnalysisResult {
  stage: "QR_DECODE";
  algorithm: "jsqr-decode-v1";
  status: QrDecodeStageStatus;
  result: QrDecodeOutcome;
  decodedAt: Date;
  rawDecodedText: string | null;
  decodedTextLength: number | null;
  sourceImageType: "normalized-image" | "candidate-crop" | null;
  notes: string[];
}

export interface TransferMetadataFields {
  emvVersion: string | null;
  initiationMethod: string | null;
  merchantAccountInfo: {
    tag: string;
    applicationId: string | null;
    subtype: "PROMPTPAY" | "BILL_PAYMENT" | "UNKNOWN_THAI_QR";
    targetIdentifier: string | null;
    targetIdentifierType:
      | "PROMPTPAY_MOBILE"
      | "PROMPTPAY_NATIONAL_ID_OR_TAX_ID"
      | "PROMPTPAY_EWALLET"
      | "BILLER_ID"
      | "UNKNOWN";
    references: {
      reference1: string | null;
      reference2: string | null;
      reference3: string | null;
    };
  } | null;
  countryCode: string | null;
  currencyCode: string | null;
  amount: string | null;
  merchantName: string | null;
  merchantCity: string | null;
  crc: string | null;
  rawTopLevelTags: Record<string, string>;
}

export interface TransferMetadataParseAnalysisResult {
  stage: "TRANSFER_METADATA_PARSE";
  algorithm: "transfer-metadata-parse-v1";
  status: TransferMetadataParseStageStatus;
  result: TransferMetadataParseResult;
  payloadFormat: TransferMetadataPayloadFormat;
  parsedAt: Date;
  metadata: TransferMetadataFields | null;
  rawPayload: string | null;
  notes: string[];
  warnings: string[];
}

export interface SlipVerificationAnalysisResult {
  stage: "SLIP_VERIFICATION";
  algorithm: "slip-verification-scaffold-v1" | "slip-verification-local-structural-v1";
  status: SlipVerificationStageStatus;
  result: SlipVerificationResult;
  evidenceCategory: SlipVerificationEvidenceCategory;
  evaluatedAt: Date;
  notes: string[];
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
  processingProfile?: DocumentProcessingProfileSnapshot;
  qrCandidateAnalysis?: QrCandidateAnalysisResult | null;
  qrDecode?: QrDecodeAnalysisResult | null;
  transferMetadata?: TransferMetadataParseAnalysisResult | null;
  slipVerification?: SlipVerificationAnalysisResult | null;
  status: DocumentStatus;
  duplicateStatus: DuplicateStatus;
  matchedDocumentId: string | null;
  similarityScore: number | null;
  reviewStatus: ReviewStatus;
  reviewedAt: Date | null;
  reviewedMatchDocumentId: string | null;
  qualityStatus: QualityStatus;
  qualityWarnings: QualityWarningCode[];
  qualityMetrics: QualityMetrics | null;
  qualityCheckedAt: Date | null;
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
