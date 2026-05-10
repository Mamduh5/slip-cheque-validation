import { UploadForm } from "@/components/upload-form";
import { requireUser } from "@/lib/session";

export default async function UploadPage() {
  await requireUser();

  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-5">
        <h1 className="text-3xl font-semibold">Upload document</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Add a bank transfer slip, deposit/payment slip, cheque, or unknown paper financial document image.
        </p>
        <div
          className="rounded-lg border border-line bg-white p-4 text-sm leading-6 text-slate-600"
          data-testid="capture-guidance"
        >
          <h2 className="text-base font-semibold text-slate-900">Frame the paper clearly</h2>
          <p className="mt-2">
            These aids help you take a cleaner photo. They are guidance only; server-side quality checks still make the
            final call after upload.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Place the document on a flat surface.</li>
            <li>Include all corners.</li>
            <li>Avoid glare and shadows.</li>
            <li>Keep the image sharp.</li>
            <li>Fill most of the frame.</li>
          </ul>
        </div>
        <div className="rounded-lg border border-line bg-slate-950 p-4 text-sm text-white" data-testid="framing-guide-card">
          <p className="font-medium">Phone photo framing guide</p>
          <div className="relative mt-3 aspect-[4/3] rounded-md border border-white/20 bg-slate-800">
            <div className="absolute inset-6 rounded-sm border border-dashed border-white/40" />
            <div className="absolute inset-x-12 top-10 h-2 rounded-full bg-white/80" />
            <div className="absolute inset-x-12 top-20 h-2 rounded-full bg-white/60" />
            <div className="absolute inset-x-12 bottom-12 h-16 rounded-sm border border-white/50" />
            <span className="absolute left-6 top-6 h-8 w-8 border-l-2 border-t-2 border-emerald-300" />
            <span className="absolute right-6 top-6 h-8 w-8 border-r-2 border-t-2 border-emerald-300" />
            <span className="absolute bottom-6 left-6 h-8 w-8 border-b-2 border-l-2 border-emerald-300" />
            <span className="absolute bottom-6 right-6 h-8 w-8 border-b-2 border-r-2 border-emerald-300" />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-300">
            Aim to keep the paper inside the corner marks with all edges visible. This is not document detection.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 text-sm leading-6 text-slate-600">
          Duplicate matching is active within your account. The app compares exact file hashes first, then uses a
          normalized image fingerprint to mark likely duplicates.
        </div>
      </div>
      <UploadForm />
    </section>
  );
}
