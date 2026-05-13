import { describe, expect, it } from "vitest";
import { localizeKnownUserMessage } from "../lib/user-message-localization";

describe("localizeKnownUserMessage", () => {
  it("maps known upload validation messages", () => {
    expect(
      localizeKnownUserMessage(
        "The selected file content does not match a supported JPEG, PNG, or WebP image.",
        "en",
        "feedbackErrors.uploadFailed"
      )
    ).toBe("The selected file content does not match a supported JPEG, PNG, or WebP image.");

    expect(
      localizeKnownUserMessage(
        "The selected file content does not match a supported JPEG, PNG, or WebP image.",
        "th",
        "feedbackErrors.uploadFailed"
      )
    ).toBe("เนื้อหาไฟล์ที่เลือกไม่ตรงกับภาพ JPEG, PNG หรือ WebP ที่รองรับ");
  });

  it("preserves dynamic values for mapped messages", () => {
    expect(localizeKnownUserMessage("File is too large. Maximum size is 10 MB.", "th", "feedbackErrors.uploadFailed")).toBe(
      "ไฟล์ใหญ่เกินไป ขนาดสูงสุดคือ 10 MB"
    );
  });

  it("uses the scoped fallback for unknown backend messages", () => {
    expect(localizeKnownUserMessage("Temporary upload failure.", "th", "feedbackErrors.uploadFailed")).toBe("อัปโหลดไม่สำเร็จ");
    expect(localizeKnownUserMessage(undefined, "en", "feedbackErrors.reviewFailed")).toBe("Review could not be saved.");
  });
});
