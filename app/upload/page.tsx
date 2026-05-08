import { UploadForm } from "@/components/upload-form";
import { requireUser } from "@/lib/session";

export default async function UploadPage() {
  await requireUser();

  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[0.8fr_1.2fr]">
      <div>
        <h1 className="text-3xl font-semibold">Upload document</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Add a bank transfer slip, deposit/payment slip, cheque, or unknown paper financial document image.
        </p>
        <div className="mt-5 rounded-lg border border-line bg-white p-4 text-sm leading-6 text-slate-600">
          Duplicate matching is active within your account. The app compares exact file hashes first, then uses a
          normalized image fingerprint to mark likely duplicates.
        </div>
      </div>
      <UploadForm />
    </section>
  );
}
