import type { QualityMetrics, QualityWarningCode } from "@/lib/models";
import {
  brightLuminanceThreshold,
  blurrySharpnessThreshold,
  darkLuminanceThreshold,
  recommendedMinDimension
} from "@/lib/quality-thresholds";

export interface LocalPreviewState {
  fileName: string;
  fileSizeLabel: string;
  mimeType: string;
  previewUrl: string;
  advisoryWarnings: QualityWarningCode[];
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

export function getClientAdvisoryWarnings(metrics: QualityMetrics): QualityWarningCode[] {
  const warnings: QualityWarningCode[] = [];

  if (metrics.width < recommendedMinDimension || metrics.height < recommendedMinDimension) {
    warnings.push("IMAGE_TOO_SMALL");
  }

  if (metrics.sharpness < blurrySharpnessThreshold) {
    warnings.push("BLURRY_IMAGE");
  }

  if (metrics.meanLuminance < darkLuminanceThreshold) {
    warnings.push("TOO_DARK");
  } else if (metrics.meanLuminance > brightLuminanceThreshold) {
    warnings.push("TOO_BRIGHT");
  }

  return warnings;
}

export function buildLocalPreviewState(input: {
  file: Pick<File, "name" | "size" | "type">;
  previewUrl: string;
  advisoryWarnings?: QualityWarningCode[];
}): LocalPreviewState {
  return {
    fileName: input.file.name || "Selected image",
    fileSizeLabel: formatFileSize(input.file.size),
    mimeType: input.file.type || "image/*",
    previewUrl: input.previewUrl,
    advisoryWarnings: input.advisoryWarnings ?? []
  };
}

export function replaceLocalPreviewState(input: {
  file: Pick<File, "name" | "size" | "type">;
  previewUrl: string;
  advisoryWarnings?: QualityWarningCode[];
}) {
  return buildLocalPreviewState(input);
}

export function getUploadRecoveryPrompt(input: {
  serverError?: string;
  qualityWarnings?: QualityWarningCode[];
}) {
  return {
    message: input.serverError ?? "Upload failed. Choose another image and try again.",
    canChooseAnother: true,
    warningCount: input.qualityWarnings?.length ?? 0
  };
}
