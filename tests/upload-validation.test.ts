import { describe, expect, it } from "vitest";
import { validateUploadFile } from "../lib/upload-validation";

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
});
