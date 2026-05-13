import { expect, test } from "@playwright/test";

const redPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64"
);
const bluePng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYPgPAAEDAQCp8aGQAAAAAElFTkSuQmCC",
  "base64"
);

test("user can select multiple files and remove one before uploading", async ({ page }) => {
  await page.goto("/upload");

  await page.getByTestId("document-file-input").setInputFiles([
    {
      name: "first-slip.png",
      mimeType: "image/png",
      buffer: redPng
    },
    {
      name: "second-slip.png",
      mimeType: "image/png",
      buffer: bluePng
    }
  ]);

  await expect(page.getByTestId("selected-files-panel")).toBeVisible();
  await expect(page.getByTestId("selected-files-panel").getByText("first-slip.png")).toBeVisible();
  await expect(page.getByTestId("selected-files-panel").getByText("second-slip.png")).toBeVisible();
  await expect(page.getByTestId("upload-submit-button")).toHaveText("Upload 2 files");

  await page
    .getByTestId("selected-file-item")
    .filter({ hasText: "first-slip.png" })
    .getByTestId("remove-file-button")
    .click();

  await expect(page.getByTestId("selected-files-panel").getByText("first-slip.png")).toHaveCount(0);
  await expect(page.getByTestId("selected-files-panel").getByText("second-slip.png")).toBeVisible();
  await expect(page.getByTestId("upload-submit-button")).toHaveText("Upload selected image");
});

test("batch upload shows mixed outcomes, grouped counts, and retries only failed items", async ({ page }) => {
  let uploadCalls = 0;

  await page.route("**/api/documents", async (route) => {
    uploadCalls += 1;

    if (uploadCalls === 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          documentId: "aaaaaaaaaaaaaaaaaaaaaaaa",
          duplicateStatus: "EXACT_DUPLICATE",
          duplicateDecisionType: "EXACT_DUPLICATE",
          reviewStatus: "NOT_REQUIRED",
          qualityStatus: "PASS",
          qualityWarnings: []
        })
      });
      return;
    }

    if (uploadCalls === 2) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          documentId: "bbbbbbbbbbbbbbbbbbbbbbbb",
          duplicateStatus: "LIKELY_DUPLICATE",
          duplicateDecisionType: "LIKELY_DUPLICATE_REVIEW",
          reviewStatus: "PENDING",
          qualityStatus: "PASS",
          qualityWarnings: []
        })
      });
      return;
    }

    if (uploadCalls === 3) {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          error: "The selected image is too small to be useful.",
          qualityStatus: "FAIL",
          qualityWarnings: ["IMAGE_TOO_SMALL"]
        })
      });
      return;
    }

    if (uploadCalls === 4) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary upload failure." })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        documentId: `${uploadCalls}`.padStart(24, "c"),
        duplicateStatus: "NEW",
        duplicateDecisionType: "NEW_UPLOAD",
        reviewStatus: "NOT_REQUIRED",
        qualityStatus: "PASS",
        qualityWarnings: []
      })
    });
  });

  await page.goto("/upload");
  await page.getByTestId("document-file-input").setInputFiles([
    { name: "exact.png", mimeType: "image/png", buffer: redPng },
    { name: "review.png", mimeType: "image/png", buffer: bluePng },
    { name: "quality.png", mimeType: "image/png", buffer: redPng },
    { name: "failed.png", mimeType: "image/png", buffer: bluePng }
  ]);

  await page.getByTestId("upload-submit-button").click();
  await expect(page.getByTestId("upload-progress-indicator")).toBeVisible();
  await expect(page.getByTestId("selected-file-item").filter({ hasText: "exact.png" })).toContainText("Uploading");

  await expect(page.getByTestId("selected-file-item").filter({ hasText: "exact.png" })).toContainText(
    "Exact duplicate found"
  );
  await expect(page.getByTestId("selected-file-item").filter({ hasText: "review.png" })).toContainText(
    "Likely duplicate - review needed"
  );
  await expect(page.getByTestId("selected-file-item").filter({ hasText: "quality.png" })).toContainText(
    "Image rejected due to quality issues"
  );
  await expect(page.getByTestId("selected-file-item").filter({ hasText: "failed.png" })).toContainText("Upload failed");
  await expect(page.getByTestId("batch-summary")).toContainText("4 files in batch");
  await expect(page.getByTestId("batch-summary")).toContainText("2 completed");
  await expect(page.getByTestId("batch-summary")).toContainText("1 exact duplicate");
  await expect(page.getByTestId("batch-summary")).toContainText("1 need review");
  await expect(page.getByTestId("batch-summary")).toContainText("1 quality rejected");
  await expect(page.getByTestId("batch-summary")).toContainText("1 failed");

  await page.getByTestId("retry-failed-batch-button").click();

  await expect(page.getByTestId("selected-file-item").filter({ hasText: "quality.png" })).toContainText("New upload");
  await expect(page.getByTestId("selected-file-item").filter({ hasText: "failed.png" })).toContainText("New upload");
  await expect(page.getByTestId("batch-summary")).toContainText("4 completed");
  await expect(page.getByTestId("batch-summary")).not.toContainText("quality rejected");
  await expect(page.getByTestId("batch-summary")).not.toContainText("failed");
  expect(uploadCalls).toBe(6);
});

