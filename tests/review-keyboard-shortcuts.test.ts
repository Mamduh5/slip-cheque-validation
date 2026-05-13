import { describe, expect, it } from "vitest";
import {
  getReviewKeyboardShortcutAction,
  isReviewKeyboardShortcutBlocked
} from "../lib/review-keyboard-shortcuts";

describe("review keyboard shortcuts", () => {
  it("maps supported keys to review actions", () => {
    expect(getReviewKeyboardShortcutAction("1")).toBe("confirm-duplicate");
    expect(getReviewKeyboardShortcutAction("2")).toBe("confirm-distinct");
    expect(getReviewKeyboardShortcutAction("ArrowRight")).toBe("next-item");
    expect(getReviewKeyboardShortcutAction("ArrowLeft")).toBe("previous-item");
    expect(getReviewKeyboardShortcutAction("Enter")).toBeNull();
  });

  it("blocks shortcuts while typing or editing content", () => {
    expect(isReviewKeyboardShortcutBlocked({ target: { tagName: "TEXTAREA" }, hasOpenDialog: false })).toBe(true);
    expect(isReviewKeyboardShortcutBlocked({ target: { tagName: "input" }, hasOpenDialog: false })).toBe(true);
    expect(isReviewKeyboardShortcutBlocked({ target: { isContentEditable: true }, hasOpenDialog: false })).toBe(true);
    expect(
      isReviewKeyboardShortcutBlocked({
        target: { closest: (selector) => selector.includes("contenteditable") ? {} : null },
        hasOpenDialog: false
      })
    ).toBe(true);
  });

  it("blocks shortcuts while a dialog is open", () => {
    expect(isReviewKeyboardShortcutBlocked({ target: { tagName: "BODY" }, hasOpenDialog: true })).toBe(true);
  });

  it("allows shortcuts from ordinary page targets", () => {
    expect(isReviewKeyboardShortcutBlocked({ target: { tagName: "DIV" }, hasOpenDialog: false })).toBe(false);
  });
});
