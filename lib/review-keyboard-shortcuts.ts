export type ReviewKeyboardShortcutAction =
  | "confirm-duplicate"
  | "confirm-distinct"
  | "next-item"
  | "previous-item";

interface ShortcutTargetLike {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
}

export function getReviewKeyboardShortcutAction(key: string): ReviewKeyboardShortcutAction | null {
  if (key === "1") return "confirm-duplicate";
  if (key === "2") return "confirm-distinct";
  if (key === "ArrowRight") return "next-item";
  if (key === "ArrowLeft") return "previous-item";
  return null;
}

export function isReviewKeyboardShortcutBlocked(input: {
  target: ShortcutTargetLike | null;
  hasOpenDialog: boolean;
}) {
  if (input.hasOpenDialog) return true;

  const target = input.target;
  if (!target) return false;

  const tagName = target.tagName?.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  return Boolean(target.isContentEditable || target.closest?.("[contenteditable='true'], [contenteditable='']"));
}
