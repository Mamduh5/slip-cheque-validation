import Link from "next/link";
import { DocumentStatusPill } from "@/components/document-status-pill";
import { getRecentDocumentsForUser } from "@/lib/documents";
import { requireUser } from "@/lib/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const documents = await getRecentDocumentsForUser(user.id);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Recent uploads and placeholder duplicate-check state.
          </p>
        </div>
        <Link
          className="rounded-md bg-accent px-4 py-2 text-center font-medium text-white hover:bg-accent-dark"
          href="/upload"
        >
          Upload document
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">No documents yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Upload a paper financial document image to create the first registry record.
          </p>
          <Link
            className="mt-5 inline-flex rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark"
            href="/upload"
          >
            Start upload
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-line px-4 py-3 text-sm font-medium text-slate-600 sm:grid-cols-[1.2fr_0.7fr_0.7fr_auto]">
            <span>Document</span>
            <span className="hidden sm:block">Type</span>
            <span className="hidden sm:block">Uploaded</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-line">
            {documents.map((document) => (
              <Link
                className="grid grid-cols-[1fr_auto] gap-3 px-4 py-4 hover:bg-slate-50 sm:grid-cols-[1.2fr_0.7fr_0.7fr_auto]"
                href={`/documents/${String(document._id)}`}
                key={String(document._id)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{document.originalFilename}</span>
                  <span className="block text-xs text-slate-500">{document.mimeType}</span>
                </span>
                <span className="hidden text-sm text-slate-600 sm:block">
                  {document.documentType.replaceAll("_", " ")}
                </span>
                <span className="hidden text-sm text-slate-600 sm:block">{formatDate(document.createdAt)}</span>
                <DocumentStatusPill status={document.duplicateStatus} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
