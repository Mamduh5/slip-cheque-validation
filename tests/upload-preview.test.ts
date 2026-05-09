import { describe, expect, it } from "vitest";
import {
  buildLocalPreviewState,
  formatFileSize,
  getClientAdvisoryWarnings,
  getUploadRecoveryPrompt,
  replaceLocalPreviewState
} from "../lib/upload-preview";

function createFileLike(input: { name: string; size: number; type: string }) {
  return new File([new Uint8Array(input.size)], input.name, {
    type: input.type
  });
}

describe("upload preview helpers", () => {
  it("builds selected image preview metadata after file selection", () => {
    const preview = buildLocalPreviewState({
      file: createFileLike({ name: "slip.jpg", size: 1536, type: "image/jpeg" }),
      previewUrl: "blob:preview"
    });

    expect(preview).toEqual({
      fileName: "slip.jpg",
      fileSizeLabel: "1.5 KB",
      mimeType: "image/jpeg",
      previewUrl: "blob:preview",
      advisoryWarnings: []
    });
  });

  it("replaces preview state when the user retakes or reselects", () => {
    const first = buildLocalPreviewState({
      file: createFileLike({ name: "first.jpg", size: 1024, type: "image/jpeg" }),
      previewUrl: "blob:first"
    });
    const replacement = replaceLocalPreviewState({
      file: createFileLike({ name: "second.webp", size: 2048, type: "image/webp" }),
      previewUrl: "blob:second",
      advisoryWarnings: ["TOO_DARK"]
    });

    expect(first.previewUrl).toBe("blob:first");
    expect(replacement).toMatchObject({
      fileName: "second.webp",
      fileSizeLabel: "2.0 KB",
      mimeType: "image/webp",
      previewUrl: "blob:second",
      advisoryWarnings: ["TOO_DARK"]
    });
  });

  it("creates advisory warnings for small, blurry, dark, and bright preview metrics", () => {
    expect(
      getClientAdvisoryWarnings({
        width: 640,
        height: 480,
        meanLuminance: 120,
        sharpness: 120
      })
    ).toEqual(["IMAGE_TOO_SMALL"]);

    expect(
      getClientAdvisoryWarnings({
        width: 1200,
        height: 1000,
        meanLuminance: 20,
        sharpness: 12
      })
    ).toEqual(["BLURRY_IMAGE", "TOO_DARK"]);

    expect(
      getClientAdvisoryWarnings({
        width: 1200,
        height: 1000,
        meanLuminance: 240,
        sharpness: 120
      })
    ).toEqual(["TOO_BRIGHT"]);
  });

  it("keeps a recovery path after server quality failure", () => {
    expect(
      getUploadRecoveryPrompt({
        serverError: "The selected image is too small to be useful.",
        qualityWarnings: ["IMAGE_TOO_SMALL"]
      })
    ).toEqual({
      message: "The selected image is too small to be useful.",
      canChooseAnother: true,
      warningCount: 1
    });
  });

  it("formats file sizes for preview metadata", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.00 MB");
  });
});
