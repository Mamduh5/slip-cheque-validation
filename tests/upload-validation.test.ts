import { describe, expect, it } from "vitest";
import {
  detectUploadMimeType,
  getUploadExtensionForMimeType,
  validateUploadFile,
  validateUploadFileContent
} from "../lib/upload-validation";

function createFile(input: { size: number; type: string; name?: string }) {
  return new File([new Uint8Array(input.size)], input.name ?? "document.jpg", {
    type: input.type
  });
}

describe("validateUploadFile", () => {
  it("accepts supported image files", () => {
    expect(validateUploadFile(createFile({ size: 1024, type: "image/jpeg" }))).toBeNull();
    expect(validateUploadFile(createFile({ size: 1024, type: "image/png" }))).toBeNull();
    expect(validateUploadFile(createFile({ size: 1024, type: "image/webp" }))).toBeNull();
  });

  it("rejects unsupported MIME types", () => {
    expect(validateUploadFile(createFile({ size: 1024, type: "application/pdf" }))).toContain(
      "Unsupported file type"
    );
  });

  it("rejects empty files", () => {
    expect(validateUploadFile(createFile({ size: 0, type: "image/jpeg" }))).toBe("The selected file is empty.");
  });

  it("detects supported image signatures", () => {
    expect(detectUploadMimeType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectUploadMimeType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectUploadMimeType(Buffer.from("RIFF0000WEBP", "ascii"))).toBe("image/webp");
  });

  it("rejects mismatched or unknown image content", () => {
    expect(validateUploadFileContent(Buffer.from("not an image"), "image/jpeg")).toContain(
      "does not match"
    );
    expect(validateUploadFileContent(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/png")).toContain(
      "does not match"
    );
  });

  it("accepts content that matches the declared image type", () => {
    expect(validateUploadFileContent(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg")).toBeNull();
  });

  it("maps accepted upload MIME types to storage extensions", () => {
    expect(getUploadExtensionForMimeType("image/jpeg")).toBe("jpg");
    expect(getUploadExtensionForMimeType("image/png")).toBe("png");
    expect(getUploadExtensionForMimeType("image/webp")).toBe("webp");
    expect(getUploadExtensionForMimeType("application/pdf")).toBeNull();
  });
});
