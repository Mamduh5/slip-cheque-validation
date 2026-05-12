"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  buildBatchOutcome,
  formatBatchSummary,
  summarizeBatch,
  type BatchUploadLifecycleStatus
} from "@/lib/batch-upload";
import {
  documentTypeOptions,
  formatDocumentType,
  getDocumentTypeDescription,
  getDocumentTypeGuidance
} from "@/lib/document-types";
import type {
  DocumentType,
  DuplicateDecisionReason,
  DuplicateDecisionType,
  DuplicateStatus,
  QualityStatus,
  QualityWarningCode,
  ReviewStatus,
  SourceType
} from "@/lib/models";
import { qualityWarningLabels } from "@/lib/quality-thresholds";
import { buildLocalPreviewState, getClientAdvisoryWarnings, type LocalPreviewState } from "@/lib/upload-preview";

interface UploadResponse {
  documentId?: string;
  error?: string;
  duplicateStatus?: DuplicateStatus;
  duplicateDecisionType?: DuplicateDecisionType | null;
  duplicateDecisionReasons?: DuplicateDecisionReason[];
  matchedDocumentId?: string | null;
  similarityScore?: number | null;
  reviewStatus?: ReviewStatus;
  qualityStatus?: QualityStatus;
  qualityWarnings?: QualityWarningCode[];
}

interface SelectedUploadItem {
  id: string;
  file: File;
  preview: LocalPreviewState;
  status: BatchUploadLifecycleStatus;
  error: string | null;
  result: UploadResponse | null;
  qualityWarnings: QualityWarningCode[];
}

function makeUploadItem(file: File): SelectedUploadItem {
  const previewUrl = URL.createObjectURL(file);

  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    preview: buildLocalPreviewState({ file, previewUrl }),
    status: "waiting",
    error: null,
    result: null,
    qualityWarnings: []
  };
}

function statusToneClasses(tone: ReturnType<typeof buildBatchOutcome>["tone"]) {
  switch (tone) {
    case "positive":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "warning":
      return "border-orange-200 bg-orange-50 text-orange-900";
    case "danger":
      return "border-red-200 bg-red-50 text-red-800";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function isInFlight(status: BatchUploadLifecycleStatus) {
  return status === "uploading" || status === "processing";
}

export function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionTokenRef = useRef(0);
  const selectedItemsRef = useRef<SelectedUploadItem[]>([]);
  const [documentType, setDocumentType] = useState<DocumentType>("UNKNOWN");
  const [sourceType, setSourceType] = useState<SourceType>("CAMERA");
  const [error, setError] = useState<string | null>(null);
  const [formQualityWarnings, setFormQualityWarnings] = useState<QualityWarningCode[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedUploadItem[]>([]);
  const [isAnalyzingPreview, setIsAnalyzingPreview] = useState(false);
  const selectedTypeGuidance = getDocumentTypeGuidance(documentType);
  const isSubmitting = selectedItems.some((item) => isInFlight(item.status));
  const selectedPreview = selectedItems[0]?.preview ?? null;
  const batchSummary = useMemo(
    () =>
      selectedItems.length > 0
        ? formatBatchSummary(
            summarizeBatch(
              selectedItems.map((item) => ({
                status: item.status,
                duplicateStatus: item.result?.duplicateStatus,
                duplicateDecisionType: item.result?.duplicateDecisionType,
                reviewStatus: item.result?.reviewStatus,
                qualityStatus: item.result?.qualityStatus,
                error: item.error
              }))
            )
          )
        : [],
    [selectedItems]
  );
  const retryableItems = selectedItems.filter((item) => buildBatchOutcome({
    status: item.status,
    qualityStatus: item.result?.qualityStatus,
    error: item.error
  }).retryable);

  useEffect(() => {
    selectedItemsRef.current = selectedItems;
  }, [selectedItems]);

  useEffect(() => {
    return () => {
      for (const item of selectedItemsRef.current) {
        URL.revokeObjectURL(item.preview.previewUrl);
      }
    };
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    const token = selectionTokenRef.current + 1;
    selectionTokenRef.current = token;
    setError(null);
    setFormQualityWarnings([]);

    if (files.length === 0) {
      revokeSelectedPreviews();
      setSelectedItems([]);
      return;
    }

    revokeSelectedPreviews();
    const nextItems = files.map(makeUploadItem);
    setSelectedItems(nextItems);
    setIsAnalyzingPreview(true);

    try {
      const analyzedItems = await Promise.all(
        nextItems.map(async (item) => {
          try {
            const advisoryWarnings = await analyzeImagePreview(item.preview.previewUrl);
            return { id: item.id, advisoryWarnings };
          } catch {
            return { id: item.id, advisoryWarnings: [] };
          }
        })
      );

      if (selectionTokenRef.current !== token) {
        return;
      }

      setSelectedItems((current) =>
        current.map((item) => {
          const analyzed = analyzedItems.find((candidate) => candidate.id === item.id);
          return analyzed ? { ...item, preview: { ...item.preview, advisoryWarnings: analyzed.advisoryWarnings } } : item;
        })
      );
    } finally {
      if (selectionTokenRef.current === token) {
        setIsAnalyzingPreview(false);
      }
    }
  }

  function revokeSelectedPreviews() {
    for (const item of selectedItemsRef.current) {
      URL.revokeObjectURL(item.preview.previewUrl);
    }
  }

  function chooseAnotherImage() {
    setError(null);
    setFormQualityWarnings([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  function removeItem(itemId: string) {
    setError(null);
    setFormQualityWarnings([]);
    setSelectedItems((current) => {
      const removed = current.find((item) => item.id === itemId);
      if (removed) {
        URL.revokeObjectURL(removed.preview.previewUrl);
      }
      return current.filter((item) => item.id !== itemId);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFormQualityWarnings([]);

    if (selectedItems.length === 0) {
      setError("Take a photo or choose one or more images before uploading.");
      return;
    }

    const waitingIds = selectedItems.filter((item) => item.status === "waiting").map((item) => item.id);

    if (waitingIds.length === 0) {
      setError("There are no waiting files to upload.");
      return;
    }

    const uploaded = await uploadItems(waitingIds);

    if (selectedItems.length === 1 && uploaded[0]?.documentId) {
      router.push(`/documents/${uploaded[0].documentId}`);
      router.refresh();
    }
  }

  async function retryItem(itemId: string) {
    setError(null);
    setFormQualityWarnings([]);
    const uploaded = await uploadItems([itemId]);

    if (selectedItems.length === 1 && uploaded[0]?.documentId) {
      router.push(`/documents/${uploaded[0].documentId}`);
      router.refresh();
    }
  }

  async function retryFailedItems() {
    setError(null);
    setFormQualityWarnings([]);
    await uploadItems(retryableItems.map((item) => item.id));
  }

  async function uploadItems(itemIds: string[]) {
    const uploaded: UploadResponse[] = [];

    for (const itemId of itemIds) {
      const item = selectedItems.find((candidate) => candidate.id === itemId);

      if (!item) {
        continue;
      }

      setSelectedItems((current) =>
        current.map((candidate) =>
          candidate.id === itemId
            ? { ...candidate, status: "uploading", error: null, result: null, qualityWarnings: [] }
            : candidate
        )
      );

      const formData = new FormData();
      formData.set("documentType", documentType);
      formData.set("sourceType", sourceType);
      formData.set("file", item.file);

      let response: Response;

      try {
        response = await fetch("/api/documents", {
          method: "POST",
          body: formData
        });
      } catch {
        if (selectedItems.length === 1) {
          setError("Upload failed. Check your connection and try again.");
          setFormQualityWarnings([]);
        }
        setSelectedItems((current) =>
          current.map((candidate) =>
            candidate.id === itemId
              ? { ...candidate, status: "failed", error: "Upload failed. Check your connection and try again." }
              : candidate
          )
        );
        continue;
      }

      setSelectedItems((current) =>
        current.map((candidate) => (candidate.id === itemId ? { ...candidate, status: "processing" } : candidate))
      );

      const payload = (await response.json().catch(() => null)) as UploadResponse | null;

      if (!response.ok || !payload?.documentId) {
        const isQualityRejected = response.status === 422 || payload?.qualityStatus === "FAIL";
        if (selectedItems.length === 1) {
          setError(payload?.error ?? "Upload failed.");
          setFormQualityWarnings(payload?.qualityWarnings ?? []);
        }
        setSelectedItems((current) =>
          current.map((candidate) =>
            candidate.id === itemId
              ? {
                  ...candidate,
                  status: isQualityRejected ? "rejected" : "failed",
                  error: payload?.error ?? "Upload failed.",
                  result: payload,
                  qualityWarnings: payload?.qualityWarnings ?? []
                }
              : candidate
          )
        );
        continue;
      }

      if (payload.qualityStatus === "WARN") {
        window.sessionStorage.setItem(
          `document-quality-${payload.documentId}`,
          JSON.stringify(payload.qualityWarnings ?? [])
        );
      }

      setSelectedItems((current) =>
        current.map((candidate) =>
          candidate.id === itemId
            ? {
                ...candidate,
                status: "completed",
                error: null,
                result: payload,
                qualityWarnings: payload.qualityWarnings ?? []
              }
            : candidate
        )
      );
      uploaded.push(payload);
    }

    return uploaded;
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
          Take photos or choose images
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
          multiple
          onChange={handleFileChange}
          required
        />
        <p className="mt-2 text-xs text-slate-500">
          Use the camera on phones, or select one or more JPEG, PNG, or WebP images.
        </p>
      </div>

      {selectedItems.length > 0 ? (
        <div className="rounded-md border border-line bg-white" data-testid="selected-files-panel">
          <div className="flex flex-col gap-1 border-b border-line px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Selected files</p>
              <p className="text-xs text-slate-500">{selectedItems.length} file{selectedItems.length === 1 ? "" : "s"} ready</p>
            </div>
            {retryableItems.length > 0 ? (
              <button
                className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="retry-failed-batch-button"
                onClick={retryFailedItems}
                disabled={isSubmitting}
              >
                Retry failed/rejected
              </button>
            ) : null}
          </div>
          <ul className="divide-y divide-line" data-testid="selected-files-list">
            {selectedItems.map((item) => {
              const outcome = buildBatchOutcome({
                status: item.status,
                duplicateStatus: item.result?.duplicateStatus,
                duplicateDecisionType: item.result?.duplicateDecisionType,
                reviewStatus: item.result?.reviewStatus,
                qualityStatus: item.result?.qualityStatus,
                error: item.error
              });
              const canReview =
                item.result?.documentId &&
                (item.result.duplicateDecisionType === "LIKELY_DUPLICATE_REVIEW" ||
                  item.result.duplicateStatus === "LIKELY_DUPLICATE") &&
                item.result.reviewStatus === "PENDING";

              return (
                <li className="p-3" data-testid="selected-file-item" key={item.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.preview.fileName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.preview.fileSizeLabel} | {item.preview.mimeType}
                      </p>
                      <div
                        className={`mt-2 inline-flex max-w-full rounded-full border px-2 py-1 text-xs font-medium ${statusToneClasses(outcome.tone)}`}
                        data-testid="batch-item-outcome"
                      >
                        <span className="truncate">{outcome.label}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{outcome.description}</p>
                      {item.qualityWarnings.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-2 text-xs text-orange-900">
                          {item.qualityWarnings.map((warning) => (
                            <li key={warning} className="rounded-full border border-orange-200 bg-orange-50 px-2 py-1">
                              {qualityWarningLabels[warning]}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {item.result?.documentId ? (
                        <Link
                          className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium hover:border-slate-400"
                          href={`/documents/${item.result.documentId}`}
                        >
                          Open detail
                        </Link>
                      ) : null}
                      {canReview ? (
                        <Link
                          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-dark"
                          href={`/review/${item.result?.documentId}`}
                        >
                          Compare/review
                        </Link>
                      ) : null}
                      {outcome.retryable ? (
                        <button
                          className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          data-testid="retry-file-button"
                          onClick={() => retryItem(item.id)}
                          disabled={isSubmitting}
                        >
                          Retry
                        </button>
                      ) : null}
                      <button
                        className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        data-testid="remove-file-button"
                        onClick={() => removeItem(item.id)}
                        disabled={isInFlight(item.status)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

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
              Retake or choose other images
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

      {batchSummary.length > 0 ? (
        <div
          className="rounded-md border border-line bg-slate-50 p-3 text-sm text-slate-700"
          data-testid="batch-summary"
        >
          <p className="font-medium text-slate-900">Batch summary</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {batchSummary.map((part) => (
              <span key={part} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs">
                {part}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          data-testid="upload-error-message"
        >
          <p className="font-medium">
            {formQualityWarnings.length > 0 ? "Image rejected due to quality issues" : "Upload failed"}
          </p>
          <p className="mt-1">{error}</p>
          {formQualityWarnings.length > 0 ? (
            <>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {formQualityWarnings.map((warning) => (
                  <li key={warning}>{qualityWarningLabels[warning]}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-red-700">
                Retake or choose another image that meets the capture tips above.
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      {isSubmitting ? (
        <div
          className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"
          data-testid="upload-progress-indicator"
        >
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700" />
            <span className="font-medium">Uploading selected files</span>
          </div>
          <p className="mt-2 text-xs text-sky-800">Each file is handled separately.</p>
        </div>
      ) : null}

      <button
        className="focus-ring w-full rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        data-testid="upload-submit-button"
        disabled={isSubmitting || selectedItems.length === 0 || selectedItems.every((item) => item.status !== "waiting")}
      >
        {isSubmitting
          ? "Uploading selected files"
          : selectedItems.length === 0
            ? "Choose images first"
            : selectedItems.length === 1
              ? "Upload selected image"
              : `Upload ${selectedItems.filter((item) => item.status === "waiting").length} files`}
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
