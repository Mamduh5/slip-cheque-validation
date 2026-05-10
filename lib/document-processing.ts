import { getTypeAwareProcessingPlan } from "@/lib/document-processing-profiles";
import { normalizeDocumentImage } from "@/lib/image-normalization";
import { ImageQualityFailureError, assessImageQuality } from "@/lib/image-quality";
import { calculateDHash } from "@/lib/perceptual-hash";
import { putNormalizedDocumentObject } from "@/lib/object-storage";
import { analyzeQrCandidateFromNormalizedImage } from "@/lib/qr-candidate-analysis";
import { attemptQrDecode } from "@/lib/qr-decode";
import { attemptTransferMetadataParse } from "@/lib/transfer-metadata-parse";
import type { DocumentRecord, DocumentType } from "@/lib/models";

export class DocumentImageProcessingError extends Error {
  constructor() {
    super("The uploaded image could not be decoded for duplicate checking.");
    this.name = "DocumentImageProcessingError";
  }
}

export interface ProcessedDocumentImage {
  normalizedObject: NonNullable<DocumentRecord["normalizedObject"]>;
  normalizedImage: NonNullable<DocumentRecord["normalizedImage"]>;
  processingProfile: NonNullable<DocumentRecord["processingProfile"]>;
  qrCandidateAnalysis: DocumentRecord["qrCandidateAnalysis"];
  qrDecode: DocumentRecord["qrDecode"];
  transferMetadata: DocumentRecord["transferMetadata"];
  perceptualHash: string;
  qualityStatus: DocumentRecord["qualityStatus"];
  qualityWarnings: DocumentRecord["qualityWarnings"];
  qualityMetrics: NonNullable<DocumentRecord["qualityMetrics"]>;
  qualityCheckedAt: NonNullable<DocumentRecord["qualityCheckedAt"]>;
}

export function buildNormalizedDocumentObjectKey(input: {
  userId: string;
  documentId: string;
}) {
  return `documents/${input.userId}/${input.documentId}/normalized.webp`;
}

export async function processUploadedDocumentImage(input: {
  userId: string;
  documentId: string;
  documentType: DocumentType;
  buffer: Buffer;
}): Promise<ProcessedDocumentImage> {
  try {
    const processingPlan = getTypeAwareProcessingPlan(input.documentType);
    const quality = await assessImageQuality(input.buffer);

    if (quality.qualityStatus === "FAIL") {
      throw new ImageQualityFailureError(quality);
    }

    const normalized = await normalizeDocumentImage(input.buffer);
    const normalizedObject = await putNormalizedDocumentObject({
      objectKey: buildNormalizedDocumentObjectKey({
        userId: input.userId,
        documentId: input.documentId
      }),
      buffer: normalized.buffer
    });
    const perceptualHash = await calculateDHash(normalized.buffer);
    const qrCandidateAnalysis =
      processingPlan.specializedBranch === "slip"
        ? await analyzeQrCandidateFromNormalizedImage(normalized.buffer)
        : null;
    const qrDecode =
      processingPlan.specializedBranch === "slip"
        ? await attemptQrDecode({
            normalizedBuffer: normalized.buffer,
            qrCandidateAnalysis
          })
        : null;
    const transferMetadata =
      processingPlan.specializedBranch === "slip"
        ? attemptTransferMetadataParse({
            qrDecode
          })
        : null;

    return {
      normalizedObject,
      normalizedImage: normalized.metadata,
      processingProfile: processingPlan.profile,
      qrCandidateAnalysis,
      qrDecode,
      transferMetadata,
      perceptualHash,
      qualityStatus: quality.qualityStatus,
      qualityWarnings: quality.qualityWarnings,
      qualityMetrics: quality.qualityMetrics,
      qualityCheckedAt: quality.qualityCheckedAt
    };
  } catch (error) {
    if (error instanceof ImageQualityFailureError) {
      throw error;
    }

    throw new DocumentImageProcessingError();
  }
}
