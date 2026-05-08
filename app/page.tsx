import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-20">
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">
          Paper financial document registry
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
          Check whether an uploaded paper document already exists.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
          This v1 scaffold stores uploaded document images, records intake metadata, and leaves a clear path for
          exact and near-duplicate detection later.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className="rounded-md bg-accent px-5 py-3 text-center font-medium text-white hover:bg-accent-dark"
            href="/register"
          >
            Create account
          </Link>
          <Link
            className="rounded-md border border-line bg-white px-5 py-3 text-center font-medium hover:border-slate-400"
            href="/login"
          >
            Log in
          </Link>
        </div>
      </div>
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="space-y-4">
          {[
            ["Upload", "Take a phone photo or select an existing image."],
            ["Register", "Store original image and intake metadata in MongoDB and MinIO."],
            ["Prepare", "Create duplicate-check placeholders for later processing."]
          ].map(([title, body]) => (
            <div className="rounded-md border border-line p-4" key={title}>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
