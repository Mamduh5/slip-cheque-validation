import sharp from "sharp";
import type { QualityMetrics, QualityStatus, QualityWarningCode } from "@/lib/models";
import {
  brightLuminanceThreshold,
  blurrySharpnessThreshold,
  darkLuminanceThreshold,
  minUsableDimension,
  qualityWarningLabels,
  recommendedMinDimension
} from "@/lib/quality-thresholds";

export interface ImageQualityAssessment {
  qualityStatus: QualityStatus;
  qualityWarnings: QualityWarningCode[];
  qualityMetrics: QualityMetrics;
  qualityCheckedAt: Date;
}

export class ImageQualityFailureError extends Error {
  constructor(public assessment: ImageQualityAssessment) {
    super("The selected image is too small to be useful. Retake it closer and include the full document.");
    this.name = "ImageQualityFailureError";
  }
}

export async function assessImageQuality(buffer: Buffer, checkedAt = new Date()): Promise<ImageQualityAssessment> {
  const image = sharp(buffer, { failOn: "error" }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const grayscale = await image
    .clone()
    .resize({
      width: 512,
      height: 512,
      fit: "inside",
      withoutEnlargement: true
    })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const metrics = calculateQualityMetrics({
    pixels: grayscale.data,
    width: grayscale.info.width,
    height: grayscale.info.height,
    originalWidth: width,
    originalHeight: height
  });
  const qualityWarnings: QualityWarningCode[] = [];
  let qualityStatus: QualityStatus = "PASS";

  if (
    width < minUsableDimension ||
    height < minUsableDimension ||
    width * height < minUsableDimension * minUsableDimension
  ) {
    qualityWarnings.push("IMAGE_TOO_SMALL");
    qualityStatus = "FAIL";
  } else {
    if (width < recommendedMinDimension || height < recommendedMinDimension) {
      qualityWarnings.push("IMAGE_TOO_SMALL");
    }

    if (metrics.sharpness < blurrySharpnessThreshold) {
      qualityWarnings.push("BLURRY_IMAGE");
    }

    if (metrics.meanLuminance < darkLuminanceThreshold) {
      qualityWarnings.push("TOO_DARK");
    } else if (metrics.meanLuminance > brightLuminanceThreshold) {
      qualityWarnings.push("TOO_BRIGHT");
    }

    if (qualityWarnings.length > 0) {
      qualityStatus = "WARN";
    }
  }

  return {
    qualityStatus,
    qualityWarnings,
    qualityMetrics: metrics,
    qualityCheckedAt: checkedAt
  };
}

export function calculateQualityMetrics(input: {
  pixels: Buffer;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}): QualityMetrics {
  let luminanceSum = 0;

  for (const value of input.pixels) {
    luminanceSum += value;
  }

  return {
    width: input.originalWidth,
    height: input.originalHeight,
    meanLuminance: Number((luminanceSum / input.pixels.length).toFixed(2)),
    sharpness: Number(calculateLaplacianVariance(input.pixels, input.width, input.height).toFixed(2))
  };
}

export function calculateLaplacianVariance(pixels: Buffer, width: number, height: number) {
  if (width < 3 || height < 3) {
    return 0;
  }

  const values: number[] = [];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = pixels[y * width + x] * 4;
      const top = pixels[(y - 1) * width + x];
      const bottom = pixels[(y + 1) * width + x];
      const left = pixels[y * width + x - 1];
      const right = pixels[y * width + x + 1];
      values.push(center - top - bottom - left - right);
    }
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return variance;
}

export function formatQualityWarning(code: QualityWarningCode) {
  return qualityWarningLabels[code];
}
