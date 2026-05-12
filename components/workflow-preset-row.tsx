import Link from "next/link";

export interface WorkflowPresetLink {
  id: string;
  label: string;
  description: string;
  href: string;
}

export function WorkflowPresetRow({
  label,
  presets,
  activePresetId
}: {
  label: string;
  presets: WorkflowPresetLink[];
  activePresetId: string | null;
}) {
  return (
    <div className="mb-4 rounded-lg border border-line bg-white p-3" data-testid="workflow-presets">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {presets.map((preset) => {
          const active = preset.id === activePresetId;

          return (
            <Link
              className={`shrink-0 rounded-md border px-3 py-2 text-sm transition ${
                active
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-white text-slate-700 hover:border-slate-400"
              }`}
              data-testid={`workflow-preset-${preset.id}`}
              href={preset.href}
              key={preset.id}
              aria-current={active ? "page" : undefined}
            >
              <span className="block font-medium">{preset.label}</span>
              <span className={`mt-0.5 block text-[11px] ${active ? "text-white/80" : "text-slate-500"}`}>
                {preset.description}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

