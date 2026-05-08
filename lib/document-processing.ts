import { normalizeDocumentImage } from "@/lib/image-normalization";
import { ImageQualityFailureError, assessImageQuality } from "@/lib/image-quality";
import { calculateDHash } from "@/lib/perceptual-hash";
import { putNormalizedDocumentObject } from "@/lib/object-storage";
import type { DocumentRecord } from "@/lib/models";

export class DocumentImageProcessingError extends Error {
  constructor() {
    super("The uploaded image could not be decoded for duplicate checking.");
    this.name = "DocumentImageProcessingError";
  }
}

export interface ProcessedDocumentImage {
  normalizedObject: NonNullable<DocumentRecord["normalizedObject"]>;
  normalizedImage: NonNullable<DocumentRecord["normalizedImage"]>;
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
  buffer: Buffer;
}): Promise<ProcessedDocumentImage> {
  try {
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

    return {
      normalizedObject,
      normalizedImage: normalized.metadata,
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
