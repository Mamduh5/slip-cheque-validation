import { expect, test } from "@playwright/test";
import {
  cleanupE2eArtifacts,
  createValidDocumentImage,
  getE2eDocumentByFilename,
  originalObjectExists
} from "./e2e-fixtures";

const redPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64"
);
const bluePng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYPgPAAEDAQCp8aGQAAAAAElFTkSuQmCC",
  "base64"
);

test("authenticated user can preview and replace a selected image before upload", async ({ page }) => {
  await page.goto("/upload");

  await expect(page.getByRole("heading", { name: "Upload document" })).toBeVisible();
  await expect(page.getByTestId("capture-guidance")).toContainText("Frame the paper clearly");
  await expect(page.getByTestId("capture-guidance")).toContainText("Fill most of the frame");
  await expect(page.getByTestId("framing-guide-card")).toContainText("Phone photo framing guide");
  await expect(page.getByTestId("document-type-UNKNOWN")).toBeChecked();
  await page.getByText("Cheque", { exact: true }).click();
  await expect(page.getByTestId("document-type-CHEQUE")).toBeChecked();
  await expect(page.getByTestId("document-type-guidance")).toContainText("For cheques");

  const fileInput = page.getByTestId("document-file-input");
  await fileInput.setInputFiles({
    name: "first-slip.png",
    mimeType: "image/png",
    buffer: redPng
  });

  await expect(page.getByTestId("selected-image-preview")).toBeVisible();
  await expect(page.getByTestId("preview-framing-aid")).toBeVisible();
  await expect(page.getByTestId("preview-checklist")).toContainText("All corners are visible");
  await expect(page.getByTestId("preview-checklist")).toContainText("The paper fills most of the frame");
  await expect(page.getByText("Preview before upload")).toBeVisible();
  await expect(page.getByTestId("selected-image-preview").getByText("first-slip.png")).toBeVisible();
  await expect(page.getByText("Advisory preview check")).toBeVisible();
  await expect(page.getByText("Image is small. Retake closer if possible.")).toBeVisible();
  await expect(page.getByTestId("upload-submit-button")).toBeEnabled();

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("replace-image-button").click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "replacement-slip.png",
    mimeType: "image/png",
    buffer: bluePng
  });

  await expect(page.getByTestId("selected-image-preview").getByText("replacement-slip.png")).toBeVisible();
  await expect(page.getByTestId("selected-image-preview").getByText("first-slip.png")).toHaveCount(0);
});

test("server quality failure keeps the user in a recovery flow", async ({ page }) => {
  await page.route("**/api/documents", async (route) => {
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        error: "The selected image is too small to be useful. Retake it closer and include the full document.",
        qualityStatus: "FAIL",
        qualityWarnings: ["IMAGE_TOO_SMALL"],
        qualityMetrics: {
          width: 120,
          height: 120,
          meanLuminance: 128,
          sharpness: 20
        }
      })
    });
  });

  await page.goto("/upload");
  await page.getByTestId("document-file-input").setInputFiles({
    name: "tiny-slip.png",
    mimeType: "image/png",
    buffer: redPng
  });

  await expect(page.getByTestId("selected-image-preview")).toBeVisible();
  await page.getByTestId("upload-submit-button").click();

  await expect(
    page.getByTestId("upload-error-message").getByText(
      "The selected image is too small to be useful. Retake it closer and include the full document."
    )
  ).toBeVisible();
  await expect(
    page.getByTestId("upload-error-message").getByText("Image is small. Retake closer if possible.")
  ).toBeVisible();
  await expect(page.getByTestId("selected-image-preview")).toBeVisible();
  await expect(page.getByTestId("replace-image-button")).toBeEnabled();
});

test.describe.serial("real-service upload completion", () => {
  test.beforeEach(async () => {
    await cleanupE2eArtifacts();
  });

  test.afterEach(async () => {
    await cleanupE2eArtifacts();
  });

  test("authenticated user uploads a valid image through the real route", async ({ page }) => {
    const filename = `e2e-valid-upload-${Date.now()}.png`;
    const image = await createValidDocumentImage();

    await page.goto("/upload");
    await page.getByText("Bank transfer slip", { exact: true }).click();
    await page.getByTestId("document-file-input").setInputFiles({
      name: filename,
      mimeType: "image/png",
      buffer: image
    });

    await expect(page.getByTestId("selected-image-preview")).toBeVisible();
    await expect(page.getByTestId("selected-image-preview").getByText(filename)).toBeVisible();

    await page.getByTestId("upload-submit-button").click();
    await expect(page).toHaveURL(/\/documents\/[a-f0-9]{24}$/);
    await expect(page.getByRole("heading", { name: filename })).toBeVisible();
    await expect(page.getByText("Bank transfer slip").first()).toBeVisible();
    await expect(page.getByText("Transfer slip profile")).toBeVisible();
    await expect(page.getByText("QR candidate detection")).toBeVisible();
    await expect(page.getByText("New upload").first()).toBeVisible();
    await expect(page.getByText(/Good|Needs attention/).first()).toBeVisible();
    await expect(page.getByAltText("Uploaded financial document preview")).toBeVisible();

    await page.getByRole("button", { name: "Change document type" }).click();
    await page.getByTestId("correct-document-type-CHEQUE").check({ force: true });
    const correctionResponse = page.waitForResponse(
      (response) => response.url().includes("/api/documents/") && response.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: "Save type" }).click();
    expect((await correctionResponse).status()).toBe(200);
    await expect(page.getByTestId("document-type-correction")).toContainText("Cheque");
    await expect(page.getByTestId("document-type-correction")).toContainText("does not verify contents");
    await expect(page.getByText("Cheque profile")).toBeVisible();
    await page.getByRole("link", { name: "Back to dashboard" }).click();
    await expect(page.getByText(filename)).toBeVisible();
    await expect(page.getByText("Cheque").first()).toBeVisible();

    const document = await getE2eDocumentByFilename(filename);

    expect(document).toBeTruthy();
    expect(document).toMatchObject({
      userId: "e2e-user",
      originalFilename: filename,
      documentType: "CHEQUE",
      duplicateStatus: "NEW",
      reviewStatus: "NOT_REQUIRED",
      status: "READY"
    });
    expect(document?.qualityStatus).toMatch(/PASS|WARN/);
    await expect.poll(async () => (document ? originalObjectExists(document) : false)).toBe(true);
  });
});
