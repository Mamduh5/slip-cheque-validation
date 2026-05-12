import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkflowPresetRow } from "../components/workflow-preset-row";

describe("WorkflowPresetRow", () => {
  it("renders active preset state", () => {
    const markup = renderToStaticMarkup(
      createElement(WorkflowPresetRow, {
        label: "Quick views",
        activePresetId: "needs-review",
        presets: [
          { id: "recent", label: "Recent uploads", description: "Latest documents", href: "/dashboard" },
          {
            id: "needs-review",
            label: "Needs review",
            description: "Pending likely duplicates",
            href: "/dashboard?review=pending"
          }
        ]
      })
    );

    expect(markup).toContain("Quick views");
    expect(markup).toContain("Recent uploads");
    expect(markup).toContain("Needs review");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("workflow-preset-needs-review");
  });
});

