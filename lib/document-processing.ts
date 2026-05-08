import { normalizeDocumentImage } from "@/lib/image-normalization";
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
      perceptualHash
    };
  } catch {
    throw new DocumentImageProcessingError();
  }
}
