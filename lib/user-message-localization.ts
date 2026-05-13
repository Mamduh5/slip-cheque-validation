import { translate, type SupportedLocale, type TranslationKey, type TranslationValues } from "@/lib/i18n";

const exactErrorKeys: Record<string, TranslationKey> = {
  "Authentication required.": "feedbackErrors.authRequired",
  "Document not found.": "feedbackErrors.documentNotFound",
  "Choose a valid document type.": "feedbackErrors.invalidDocumentType",
  "Choose a valid review decision.": "feedbackErrors.invalidReviewDecision",
  "Choose pending review items and a valid review decision.": "feedbackErrors.invalidBulkReview",
  "Only pending likely duplicates can be reviewed.": "feedbackErrors.reviewNotPending",
  "Review requires a matched document.": "feedbackErrors.reviewNeedsMatch",
  "Matched document not found.": "feedbackErrors.matchedDocumentNotFound",
  "Invalid document metadata.": "feedbackErrors.uploadInvalidMetadata",
  "Upload an image file.": "feedbackErrors.uploadImageRequired",
  "Unsupported file type. Use JPEG, PNG, or WebP.": "feedbackErrors.uploadUnsupportedFileType",
  "The selected file is empty.": "feedbackErrors.uploadEmptyFile",
  "The selected file content does not match a supported JPEG, PNG, or WebP image.":
    "feedbackErrors.uploadContentMismatch",
  "The selected image is too small to be useful. Retake it closer and include the full document.":
    "feedbackErrors.uploadQualityTooSmall",
  "The uploaded image could not be decoded for duplicate checking.": "feedbackErrors.uploadDecodeFailed"
};

export function localizeKnownUserMessage(
  message: string | null | undefined,
  locale: SupportedLocale,
  fallbackKey: TranslationKey,
  fallbackValues?: TranslationValues
) {
  if (!message) {
    return translate(locale, fallbackKey, fallbackValues);
  }

  const exactKey = exactErrorKeys[message];

  if (exactKey) {
    return translate(locale, exactKey);
  }

  const fileTooLargeMatch = message.match(/^File is too large\. Maximum size is ([\d.]+) MB\.$/);

  if (fileTooLargeMatch) {
    return translate(locale, "feedbackErrors.uploadFileTooLarge", { maxMb: fileTooLargeMatch[1] });
  }

  return translate(locale, fallbackKey, fallbackValues);
}
