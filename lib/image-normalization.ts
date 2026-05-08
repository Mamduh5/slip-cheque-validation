import sharp from "sharp";
import type { NormalizedImageMetadata } from "@/lib/models";

export const normalizedImageAlgorithm = "normalized-webp-grayscale-v1" as const;
export const normalizedImageMaxDimension = 1024;

export interface NormalizedImageResult {
  buffer: Buffer;
  metadata: NormalizedImageMetadata;
}

export async function normalizeDocumentImage(buffer: Buffer): Promise<NormalizedImageResult> {
  const result = await sharp(buffer, { failOn: "error" })
    .rotate()
    .resize({
      width: normalizedImageMaxDimension,
      height: normalizedImageMaxDimension,
      fit: "inside",
      withoutEnlargement: true
    })
    .grayscale()
    .normalize()
    .webp({ quality: 85, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    metadata: {
      width: result.info.width,
      height: result.info.height,
      mimeType: "image/webp",
      fileSize: result.data.length,
      algorithm: normalizedImageAlgorithm
    }
  };
}
