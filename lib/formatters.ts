import type { DuplicateStatus, ReviewStatus } from "@/lib/models";
import { translate, type SupportedLocale } from "@/lib/i18n";

export type DocumentReviewFilter = "all" | "pending" | "confirmed-duplicate" | "confirmed-distinct";

export function formatDuplicateStatus(status: DuplicateStatus, locale: SupportedLocale = "en") {
  return translate(locale, `statuses.duplicate.${status}`);
}

export function formatReviewStatus(status: ReviewStatus, locale: SupportedLocale = "en") {
  return translate(locale, `statuses.review.${status}`);
}

export function formatQualityStatus(status: "PASS" | "WARN" | "FAIL", locale: SupportedLocale = "en") {
  return translate(locale, `quality.status.${status}`);
}
