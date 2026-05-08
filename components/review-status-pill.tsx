import { formatReviewStatus } from "@/lib/documents";
import type { ReviewStatus } from "@/lib/models";

export function ReviewStatusPill({ status }: { status: ReviewStatus }) {
  const tone =
    status === "PENDING"
      ? "border-orange-200 bg-orange-50 text-orange-800"
      : status === "CONFIRMED_DUPLICATE"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : status === "CONFIRMED_DISTINCT"
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {formatReviewStatus(status)}
    </span>
  );
}
