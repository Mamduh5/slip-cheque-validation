import { formatQualityStatus } from "@/lib/documents";
import type { SupportedLocale } from "@/lib/i18n";
import type { QualityStatus } from "@/lib/models";

export function QualityStatusPill({ status, locale = "en" }: { status: QualityStatus; locale?: SupportedLocale }) {
  const tone =
    status === "PASS"
      ? "border-green-200 bg-green-50 text-green-800"
      : status === "WARN"
        ? "border-orange-200 bg-orange-50 text-orange-800"
        : "border-red-200 bg-red-50 text-red-800";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {formatQualityStatus(status, locale)}
    </span>
  );
}
