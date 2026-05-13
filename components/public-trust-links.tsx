import Link from "next/link";

export function PublicTrustLinks() {
  return (
    <nav aria-label="Support and policy links" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-500">
      <Link className="font-medium text-accent hover:text-accent-dark" href="/support">
        Support
      </Link>
      <Link className="font-medium text-accent hover:text-accent-dark" href="/privacy">
        Privacy
      </Link>
      <Link className="font-medium text-accent hover:text-accent-dark" href="/retention">
        Retention
      </Link>
    </nav>
  );
}
