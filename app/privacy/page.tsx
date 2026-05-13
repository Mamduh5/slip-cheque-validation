import { PublicTrustLinks } from "@/components/public-trust-links";

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h1 className="text-3xl font-semibold">Privacy</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Document Registry Checker is intended for authorized document validation workflows. Only upload documents you
          are permitted to process for your organization.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          A formal privacy notice is not configured in this application yet. Follow your organization&apos;s approved
          policy for document handling, access, and reviewer accountability.
        </p>
      </div>
      <div className="mt-5">
        <PublicTrustLinks />
      </div>
    </section>
  );
}
