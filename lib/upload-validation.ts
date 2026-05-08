import { z } from "zod";
import { appConfig } from "@/lib/env";
import { documentTypes, sourceTypes } from "@/lib/models";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

export const uploadFieldsSchema = z.object({
  documentType: z.enum(documentTypes),
  sourceType: z.enum(sourceTypes)
});

export function validateUploadFile(file: File) {
  const maxBytes = appConfig.upload.maxUploadMb * 1024 * 1024;

  if (!allowedMimeTypes.includes(file.type)) {
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
