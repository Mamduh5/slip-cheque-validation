import { describe, expect, it } from "vitest";
import { getSelectedPageItems } from "../lib/review-selection";

describe("review selection helpers", () => {
  it("keeps bulk selection scoped to currently visible page items", () => {
    const selected = getSelectedPageItems(
      [
        { documentId: "visible-1", filename: "visible one" },
        { documentId: "visible-2", filename: "visible two" }
      ],
      ["visible-2", "hidden-1"]
    );

    expect(selected).toEqual([{ documentId: "visible-2", filename: "visible two" }]);
  });
});
