"use client";

import { ChangeEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supportedLocales, type SupportedLocale } from "@/lib/i18n";

const localeLabels: Record<SupportedLocale, string> = {
  en: "English",
  th: "ไทย"
};

export function LanguageSwitcher({ locale }: { locale: SupportedLocale }) {
  const router = useRouter();
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedLocale(locale);
  }, [locale]);

  async function handleLocaleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as SupportedLocale;

    setSelectedLocale(nextLocale);

    const response = await fetch("/api/locale", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ locale: nextLocale })
    });

    if (!response.ok) {
      setSelectedLocale(locale);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <span className="hidden sm:inline">Language</span>
      <select
        className="focus-ring rounded-md border border-line bg-white px-2 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-50"
        value={selectedLocale}
        onChange={handleLocaleChange}
        disabled={isPending}
        aria-label="Language"
      >
        {supportedLocales.map((supportedLocale) => (
          <option key={supportedLocale} value={supportedLocale}>
            {localeLabels[supportedLocale]}
          </option>
        ))}
      </select>
    </label>
  );
}
