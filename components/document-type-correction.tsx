"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  documentTypeOptions,
  formatDocumentType,
  getDocumentTypeDescription
} from "@/lib/document-types";
import { createTranslator, type SupportedLocale } from "@/lib/i18n";
import type { DocumentType } from "@/lib/models";

interface DocumentTypeCorrectionProps {
  documentId: string;
  currentDocumentType: DocumentType;
  locale?: SupportedLocale;
}

export function DocumentTypeCorrection({ documentId, currentDocumentType, locale = "en" }: DocumentTypeCorrectionProps) {
  const router = useRouter();
  const t = createTranslator(locale);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>(currentDocumentType);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function cancelEdit() {
    setSelectedType(currentDocumentType);
    setIsEditing(false);
    setError(null);
  }

  async function saveDocumentType() {
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    const response = await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ documentType: selectedType })
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; documentTypeLabel?: string } | null;

    setIsSaving(false);

    if (!response.ok) {
      setError(payload?.error ?? t("documentTypeCorrection.error"));
      return;
    }

    setSuccess(t("documentTypeCorrection.success", { type: formatDocumentType(selectedType, locale) }));
    setIsEditing(false);
    router.refresh();
  }

  return (
    <div className="mt-3 rounded-md border border-line bg-white p-3" data-testid="document-type-correction">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("documentTypeCorrection.title")}</p>
          <p className="mt-1 text-sm font-medium">{formatDocumentType(currentDocumentType, locale)}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {t("documentTypeCorrection.helper")}
          </p>
        </div>
        {!isEditing ? (
          <button
            className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:border-slate-400"
            type="button"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setIsEditing(true);
            }}
          >
            {t("documentTypeCorrection.change")}
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {documentTypeOptions.map((type) => (
              <label
                className={`cursor-pointer rounded-md border p-3 text-sm ${
                  selectedType === type
                    ? "border-accent bg-sky-50 text-slate-950"
                    : "border-line bg-white text-slate-700 hover:border-slate-400"
                }`}
                key={type}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="correctedDocumentType"
                  value={type}
                  checked={selectedType === type}
                  data-testid={`correct-document-type-${type}`}
                  onChange={() => setSelectedType(type)}
                />
                <span className="block font-medium">{formatDocumentType(type, locale)}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{getDocumentTypeDescription(type, locale)}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={isSaving}
              onClick={saveDocumentType}
            >
              {isSaving ? t("documentTypeCorrection.saving") : t("documentTypeCorrection.save")}
            </button>
            <button
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={isSaving}
              onClick={cancelEdit}
            >
              {t("documentTypeCorrection.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {success ? <p className="mt-3 text-sm text-green-700">{success}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
