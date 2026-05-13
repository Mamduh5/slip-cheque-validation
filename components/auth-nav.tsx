"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { isHeaderNavItemActive, type HeaderNavItem } from "@/lib/header-nav";

function navLinkClasses(isActive: boolean) {
  return isActive
    ? "rounded-md bg-white px-3 py-2 font-semibold text-accent shadow-sm ring-1 ring-line"
    : "rounded-md px-3 py-2 text-slate-700 hover:bg-white hover:text-ink";
}

function navCurrent(isActive: boolean) {
  return isActive ? "page" : undefined;
}

export function AuthNav({
  isSignedIn,
  userName
}: {
  isSignedIn: boolean;
  userName?: string | null;
}) {
  const pathname = usePathname();

  function isActive(item: HeaderNavItem) {
    return isHeaderNavItemActive(item, pathname);
  }

  if (!isSignedIn) {
    return (
      <nav className="flex items-center gap-2 text-sm" aria-label="Public navigation">
        <Link className={navLinkClasses(isActive("login"))} href="/login" aria-current={navCurrent(isActive("login"))}>
          Log in
        </Link>
        <Link
          className={
            isActive("register")
              ? "rounded-md bg-accent px-3 py-2 font-semibold text-white shadow-sm"
              : "rounded-md bg-accent px-3 py-2 font-medium text-white hover:bg-accent-dark"
          }
          href="/register"
          aria-current={navCurrent(isActive("register"))}
        >
          Register
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex flex-wrap items-center justify-end gap-2 text-sm" aria-label="Main navigation">
      <span className="hidden max-w-44 truncate text-slate-600 sm:inline">{userName}</span>
      <Link
        className={navLinkClasses(isActive("dashboard"))}
        href="/dashboard"
        aria-current={navCurrent(isActive("dashboard"))}
      >
        Dashboard
      </Link>
      <Link className={navLinkClasses(isActive("review"))} href="/review" aria-current={navCurrent(isActive("review"))}>
        Review
      </Link>
      <Link className={navLinkClasses(isActive("upload"))} href="/upload" aria-current={navCurrent(isActive("upload"))}>
        Upload
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
