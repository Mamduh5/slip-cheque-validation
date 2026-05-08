import { formatDuplicateStatus } from "@/lib/documents";
import type { DuplicateStatus } from "@/lib/models";

export function DocumentStatusPill({ status }: { status: DuplicateStatus }) {
  const tone =
    status === "NEW"
      ? "border-green-200 bg-green-50 text-green-800"
      : status === "DUPLICATE" || status === "POSSIBLE_DUPLICATE"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {formatDuplicateStatus(status)}
    </span>
  );
}
