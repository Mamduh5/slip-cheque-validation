import type { QualityWarningCode } from "@/lib/models";
import { translate, type SupportedLocale } from "@/lib/i18n";

export const minUsableDimension = 240;
export const recommendedMinDimension = 800;
export const darkLuminanceThreshold = 45;
export const brightLuminanceThreshold = 225;
export const blurrySharpnessThreshold = 55;

export const qualityWarningLabels: Record<QualityWarningCode, string> = {
  IMAGE_TOO_SMALL: "Image is small. Retake closer if possible.",
  BLURRY_IMAGE: "Image may be blurry. Keep the camera steady.",
  TOO_DARK: "Image is dark. Use brighter, even lighting.",
  TOO_BRIGHT: "Image is bright. Avoid glare and direct reflections."
};

export function formatQualityWarningLabel(code: QualityWarningCode, locale: SupportedLocale = "en") {
  return translate(locale, `quality.warnings.${code}`);
}
