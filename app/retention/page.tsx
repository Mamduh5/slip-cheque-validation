import { PublicTrustLinks } from "@/components/public-trust-links";

export default function RetentionPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h1 className="text-3xl font-semibold">Retention</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Uploaded documents and review records remain available for operational review unless your deployment applies a
          separate retention process.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Automatic deletion rules are not configured in this application yet. Follow your organization&apos;s retention
          policy for cleanup, export, or removal requests.
        </p>
      </div>
      <div className="mt-5">
        <PublicTrustLinks />
      </div>
    </section>
  );
}
