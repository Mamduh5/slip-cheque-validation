import { formatReviewStatus } from "@/lib/documents";
import type { SupportedLocale } from "@/lib/i18n";
import type { ReviewStatus } from "@/lib/models";

export function ReviewStatusPill({ status, locale = "en" }: { status: ReviewStatus; locale?: SupportedLocale }) {
  const tone =
    status === "PENDING"
      ? "border-sky-200 bg-sky-50 text-sky-800"
      : status === "CONFIRMED_DUPLICATE"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : status === "CONFIRMED_DISTINCT"
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {formatReviewStatus(status, locale)}
    </span>
  );
}
