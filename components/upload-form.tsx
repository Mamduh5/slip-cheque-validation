"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { QualityStatus, QualityWarningCode, SourceType } from "@/lib/models";

const qualityWarningLabels: Record<QualityWarningCode, string> = {
  IMAGE_TOO_SMALL: "Image is small. Retake closer if possible.",
  BLURRY_IMAGE: "Image may be blurry. Keep the camera steady.",
  TOO_DARK: "Image is dark. Use brighter, even lighting.",
  TOO_BRIGHT: "Image is bright. Avoid glare and direct reflections."
};

interface UploadResponse {
  documentId?: string;
  error?: string;
  qualityStatus?: QualityStatus;
  qualityWarnings?: QualityWarningCode[];
}

export function UploadForm() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<SourceType>("CAMERA");
  const [error, setError] = useState<string | null>(null);
  const [qualityWarnings, setQualityWarnings] = useState<QualityWarningCode[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setQualityWarnings([]);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/documents", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json().catch(() => null)) as UploadResponse | null;

    setIsSubmitting(false);

    if (!response.ok || !payload?.documentId) {
      setError(payload?.error ?? "Upload failed.");
      setQualityWarnings(payload?.qualityWarnings ?? []);
      return;
    }

    if (payload.qualityStatus === "WARN") {
      window.sessionStorage.setItem(
        `document-quality-${payload.documentId}`,
        JSON.stringify(payload.qualityWarnings ?? [])
      );
    }

    router.push(`/documents/${payload.documentId}`);
    router.refresh();
  }

  return (
    <form className="space-y-5 rounded-lg border border-line bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="documentType">
          Document type
        </label>
        <select
          className="focus-ring w-full rounded-md border border-line bg-white px-3 py-2"
          id="documentType"
          name="documentType"
          defaultValue="UNKNOWN"
        >
          <option value="UNKNOWN">Unknown</option>
          <option value="BANK_TRANSFER_SLIP">Bank transfer slip</option>
          <option value="DEPOSIT_PAYMENT_SLIP">Deposit or payment slip</option>
          <option value="CHEQUE">Paper cheque</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="sourceType">
          Source
        </label>
        <select
          className="focus-ring w-full rounded-md border border-line bg-white px-3 py-2"
          id="sourceType"
          name="sourceType"
          value={sourceType}
          onChange={(event) => setSourceType(event.target.value as SourceType)}
        >
          <option value="CAMERA">Camera photo</option>
          <option value="UPLOAD">Existing image file</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="file">
          Image
        </label>
        <input
          className="focus-ring w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4"
          id="file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture={sourceType === "CAMERA" ? "environment" : undefined}
          required
        />
        <p className="mt-2 text-xs text-slate-500">JPEG, PNG, or WebP up to the configured upload limit.</p>
      </div>
      <div className="rounded-md border border-line bg-slate-50 p-3 text-sm leading-6 text-slate-600">
        <p className="font-medium text-slate-800">Capture tips</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Place the document on a flat surface.</li>
          <li>Include all corners inside the image.</li>
          <li>Avoid glare, deep shadows, and motion blur.</li>
          <li>Retake if text or edges look soft.</li>
        </ul>
      </div>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p>{error}</p>
          {qualityWarnings.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {qualityWarnings.map((warning) => (
                <li key={warning}>{qualityWarningLabels[warning]}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <button
        className="focus-ring w-full rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Uploading..." : "Upload document"}
      </button>
    </form>
  );
}
