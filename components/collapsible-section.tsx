"use client";

import { useState } from "react";

interface CollapsibleSectionProps {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ label, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-line">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            clipRule="evenodd"
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          />
        </svg>
      </button>
      {open && <div className="border-t border-line bg-slate-50 p-4">{children}</div>}
    </div>
  );
}
