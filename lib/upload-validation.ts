import { z } from "zod";
import { appConfig } from "@/lib/env";
import { documentTypes, sourceTypes } from "@/lib/models";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export const uploadFieldsSchema = z.object({
  documentType: z.enum(documentTypes),
  sourceType: z.enum(sourceTypes)
});

export function validateUploadFile(file: File) {
  const maxBytes = appConfig.upload.maxUploadMb * 1024 * 1024;
  const mimeType = file.type.toLowerCase();

  if (!allowedMimeTypes.includes(mimeType)) {
    return `Unsupported file type. Use JPEG, PNG, or WebP.`;
  }

  if (file.size <= 0) {
    return "The selected file is empty.";
  }

  if (file.size > maxBytes) {
    return `File is too large. Maximum size is ${appConfig.upload.maxUploadMb} MB.`;
  }

  return null;
}

export function getUploadExtensionForMimeType(mimeType: string) {
  return extensionByMimeType[mimeType.toLowerCase()] ?? null;
}

export function validateUploadFileContent(buffer: Buffer, mimeType: string) {
  if (buffer.length === 0) {
    return "The selected file is empty.";
  }

  const detectedMimeType = detectUploadMimeType(buffer);

  if (!detectedMimeType || detectedMimeType !== mimeType.toLowerCase()) {
    return "The selected file content does not match a supported JPEG, PNG, or WebP image.";
  }

  return null;
}

export function detectUploadMimeType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}
