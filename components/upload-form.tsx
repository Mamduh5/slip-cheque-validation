"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  documentTypeOptions,
  formatDocumentType,
  getDocumentTypeDescription,
  getDocumentTypeGuidance
} from "@/lib/document-types";
import type { DocumentType, QualityStatus, QualityWarningCode, SourceType } from "@/lib/models";
import { qualityWarningLabels } from "@/lib/quality-thresholds";
import { buildLocalPreviewState, getClientAdvisoryWarnings, type LocalPreviewState } from "@/lib/upload-preview";

interface UploadResponse {
  documentId?: string;
  error?: string;
  qualityStatus?: QualityStatus;
  qualityWarnings?: QualityWarningCode[];
}

export function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("UNKNOWN");
  const [sourceType, setSourceType] = useState<SourceType>("CAMERA");
  const [error, setError] = useState<string | null>(null);
  const [qualityWarnings, setQualityWarnings] = useState<QualityWarningCode[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<LocalPreviewState | null>(null);
  const [isAnalyzingPreview, setIsAnalyzingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedTypeGuidance = getDocumentTypeGuidance(documentType);

  useEffect(() => {
    return () => {
      if (selectedPreview?.previewUrl) {
        URL.revokeObjectURL(selectedPreview.previewUrl);
      }
    };
  }, [selectedPreview?.previewUrl]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setError(null);
    setQualityWarnings([]);

    if (!file) {
      setSelectedPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedPreview(buildLocalPreviewState({ file, previewUrl }));
    setIsAnalyzingPreview(true);

    try {
      const advisoryWarnings = await analyzeImagePreview(previewUrl);
      setSelectedPreview((current) =>
        current?.previewUrl === previewUrl ? { ...current, advisoryWarnings } : current
      );
    } catch {
      setSelectedPreview((current) =>
        current?.previewUrl === previewUrl ? { ...current, advisoryWarnings: [] } : current
      );
    } finally {
      setIsAnalyzingPreview(false);
    }
  }

  function chooseAnotherImage() {
    setError(null);
    setQualityWarnings([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setQualityWarnings([]);

    if (!selectedPreview) {
      setError("Take a photo or choose an image before uploading.");
      return;
    }

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
    <form
      className="space-y-5 rounded-lg border border-line bg-white p-5 shadow-sm"
      data-testid="upload-form"
      onSubmit={handleSubmit}
    >
      <fieldset>
        <legend className="mb-2 block text-sm font-medium">Document type</legend>
        <div className="grid gap-2 sm:grid-cols-2" data-testid="document-type-options">
          {documentTypeOptions.map((type) => (
            <label
              className={`cursor-pointer rounded-md border p-3 text-sm transition ${
                documentType === type
                  ? "border-accent bg-sky-50 text-slate-950"
                  : "border-line bg-white text-slate-700 hover:border-slate-400"
              }`}
              key={type}
            >
              <input
                className="sr-only"
                type="radio"
                name="documentType"
                value={type}
                checked={documentType === type}
                data-testid={`document-type-${type}`}
                onChange={() => setDocumentType(type)}
              />
              <span className="block font-medium">{formatDocumentType(type)}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{getDocumentTypeDescription(type)}</span>
            </label>
          ))}
        </div>
        <div
          className="mt-3 rounded-md border border-line bg-slate-50 p-3 text-sm leading-6 text-slate-600"
          data-testid="document-type-guidance"
        >
          <p className="font-medium text-slate-800">{selectedTypeGuidance.title}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {selectedTypeGuidance.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </fieldset>
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
          Take a photo or choose an image
        </label>
        <input
          ref={fileInputRef}
          className="focus-ring w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4"
          id="file"
          name="file"
          type="file"
          data-testid="document-file-input"
          accept="image/jpeg,image/png,image/webp"
          capture={sourceType === "CAMERA" ? "environment" : undefined}
          onChange={handleFileChange}
          required
        />
        <p className="mt-2 text-xs text-slate-500">
          Use the camera on phones, or select an existing JPEG, PNG, or WebP image.
        </p>
      </div>

      {selectedPreview ? (
        <div className="overflow-hidden rounded-md border border-line bg-white" data-testid="selected-image-preview">
          <div className="border-b border-line px-3 py-2">
            <p className="text-sm font-medium">Preview before upload</p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {selectedPreview.fileName} | {selectedPreview.fileSizeLabel} | {selectedPreview.mimeType}
            </p>
          </div>
          <div className="relative bg-slate-100" data-testid="preview-framing-aid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="max-h-[420px] w-full object-contain"
              data-testid="selected-image-preview-img"
              src={selectedPreview.previewUrl}
              alt="Selected document preview"
            />
            <div className="pointer-events-none absolute inset-3 rounded-sm border border-white/70 shadow-[0_0_0_9999px_rgba(15,23,42,0.08)]">
              <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-emerald-500" />
              <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-emerald-500" />
              <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-emerald-500" />
              <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-emerald-500" />
            </div>
          </div>
          <div className="space-y-3 border-t border-line p-3">
            <div
              className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950"
              data-testid="preview-checklist"
            >
              <p className="font-medium">Before uploading, check the photo.</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                <li>All corners are visible.</li>
                <li>The paper fills most of the frame.</li>
                <li>Text and edges look sharp.</li>
                <li>There is no heavy glare or shadow.</li>
              </ul>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              <p className="font-medium text-slate-800">Advisory preview check</p>
              <p className="mt-1">
                These local hints are only a preview. The server performs the final quality check after upload.
              </p>
              {isAnalyzingPreview ? (
                <p className="mt-2 text-xs text-slate-500">Checking the preview...</p>
              ) : selectedPreview.advisoryWarnings.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2 text-xs text-orange-900">
                  {selectedPreview.advisoryWarnings.map((warning) => (
                    <li key={warning} className="rounded-full border border-orange-200 bg-orange-50 px-2 py-1">
                      {qualityWarningLabels[warning]}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-green-700">No obvious preview issues found.</p>
              )}
            </div>
            <button
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:border-slate-400 sm:w-auto"
              type="button"
              data-testid="replace-image-button"
              onClick={chooseAnotherImage}
              disabled={isSubmitting}
            >
              Retake or choose another image
            </button>
          </div>
        </div>
      ) : null}

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
        <div
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          data-testid="upload-error-message"
        >
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
        data-testid="upload-submit-button"
        disabled={isSubmitting || !selectedPreview}
      >
        {isSubmitting ? "Uploading..." : selectedPreview ? "Upload selected image" : "Choose an image first"}
      </button>
    </form>
  );
}

async function analyzeImagePreview(previewUrl: string) {
  const image = await loadPreviewImage(previewUrl);
  const maxDimension = 256;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return [];
  }

  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const grayscale = new Uint8Array(width * height);
  let luminanceSum = 0;

  for (let index = 0; index < grayscale.length; index += 1) {
    const offset = index * 4;
    const luminance = Math.round(
      imageData.data[offset] * 0.299 + imageData.data[offset + 1] * 0.587 + imageData.data[offset + 2] * 0.114
    );
    grayscale[index] = luminance;
    luminanceSum += luminance;
  }

  return getClientAdvisoryWarnings({
    width: image.naturalWidth,
    height: image.naturalHeight,
    meanLuminance: Number((luminanceSum / grayscale.length).toFixed(2)),
    sharpness: Number(calculateClientSharpness(grayscale, width, height).toFixed(2))
  });
}

function loadPreviewImage(previewUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image preview could not be loaded."));
    image.src = previewUrl;
  });
}

function calculateClientSharpness(pixels: Uint8Array, width: number, height: number) {
  if (width < 3 || height < 3) {
    return 0;
  }

  const values: number[] = [];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = pixels[y * width + x] * 4;
      const top = pixels[(y - 1) * width + x];
      const bottom = pixels[(y + 1) * width + x];
      const left = pixels[y * width + x - 1];
      const right = pixels[y * width + x + 1];
      values.push(center - top - bottom - left - right);
    }
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}
