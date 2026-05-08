"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function AuthNav({
  isSignedIn,
  userName
}: {
  isSignedIn: boolean;
  userName?: string | null;
}) {
  if (!isSignedIn) {
    return (
      <nav className="flex items-center gap-2 text-sm">
        <Link className="rounded-md px-3 py-2 hover:bg-white" href="/login">
          Log in
        </Link>
        <Link
          className="rounded-md bg-accent px-3 py-2 font-medium text-white hover:bg-accent-dark"
          href="/register"
        >
          Register
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-2 text-sm">
      <span className="hidden max-w-44 truncate text-slate-600 sm:inline">{userName}</span>
      <Link className="rounded-md px-3 py-2 hover:bg-white" href="/dashboard">
        Dashboard
      </Link>
      <button
        className="rounded-md border border-line bg-white px-3 py-2 hover:border-slate-400"
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign out
      </button>
    </nav>
  );
}
