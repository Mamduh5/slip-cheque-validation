import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentStatusPill } from "@/components/document-status-pill";
import { getDocumentForUser } from "@/lib/documents";
import { requireUser } from "@/lib/session";

function formatBytes(bytes: number) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 1 ? 2 : 3)} MB`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const document = await getDocumentForUser(id, user.id);

  if (!document) {
    notFound();
  }

  const matchedDocument =
    document.matchedDocumentId === null
      ? null
      : await getDocumentForUser(document.matchedDocumentId, user.id);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <Link className="text-sm font-medium text-accent hover:text-accent-dark" href="/dashboard">
        Back to dashboard
      </Link>
      <div className="mt-5 rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{document.originalFilename}</h1>
            <p className="mt-2 text-sm text-slate-600">Uploaded {formatDate(document.createdAt)}</p>
          </div>
          <DocumentStatusPill status={document.duplicateStatus} />
        </div>

        <div className="mt-6 overflow-hidden rounded-md border border-line bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="max-h-[520px] w-full object-contain"
            src={`/api/documents/${String(document._id)}/original`}
            alt="Uploaded financial document preview"
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            ["Document type", document.documentType.replaceAll("_", " ")],
            ["Source", document.sourceType],
            ["Processing status", document.status],
            ["MIME type", document.mimeType],
            ["File size", formatBytes(document.fileSize)],
            ["Duplicate status", document.duplicateStatus.replaceAll("_", " ")],
            ["Similarity score", document.similarityScore === null ? "Not available" : String(document.similarityScore)],
            ["Perceptual hash", document.perceptualHash ?? "Not generated"]
          ].map(([label, value]) => (
            <div className="rounded-md border border-line p-3" key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 break-words text-sm">{value}</dd>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-md border border-line p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Matched document</dt>
          <dd className="mt-1 break-words text-sm">
            {matchedDocument ? (
              <Link className="font-medium text-accent hover:text-accent-dark" href={`/documents/${String(matchedDocument._id)}`}>
                {matchedDocument.originalFilename}
              </Link>
            ) : document.matchedDocumentId ? (
              <span>{document.matchedDocumentId}</span>
            ) : (
              "None"
            )}
          </dd>
        </div>

        <div className="mt-6 rounded-md border border-line bg-slate-50 p-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Exact hash</dt>
          <dd className="mt-1 break-all font-mono text-xs">{document.exactHash ?? "Not calculated"}</dd>
        </div>
      </div>
    </section>
  );
}
