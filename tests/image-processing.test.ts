import sharp from "sharp";
import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { assessImageQuality } from "../lib/image-quality";
import { normalizeDocumentImage, normalizedImageAlgorithm, normalizedImageMaxDimension } from "../lib/image-normalization";
import {
  calculateDHash,
  hammingDistanceHex,
  selectBestPerceptualMatch,
  similarityScoreFromHammingDistance
} from "../lib/perceptual-hash";
import { analyzeQrCandidateFromNormalizedImage } from "../lib/qr-candidate-analysis";

async function createTestImage(input: { width: number; height: number; left?: number; right?: number }) {
  const left = input.left ?? 32;
  const right = input.right ?? 220;
  const pixels = Buffer.alloc(input.width * input.height * 3);

  for (let y = 0; y < input.height; y += 1) {
    for (let x = 0; x < input.width; x += 1) {
      const value = x < input.width / 2 ? left : right;
      const offset = (y * input.width + x) * 3;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
    }
  }

  return sharp(pixels, {
    raw: {
      width: input.width,
      height: input.height,
      channels: 3
    }
  })
    .png()
    .toBuffer();
}

async function createSolidImage(input: { width: number; height: number; value: number }) {
  const pixels = Buffer.alloc(input.width * input.height * 3, input.value);

  return sharp(pixels, {
    raw: {
      width: input.width,
      height: input.height,
      channels: 3
    }
  })
    .png()
    .toBuffer();
}

async function createTransferSlipLikeImageWithQrCandidate() {
  const width = 900;
  const height = 650;
  const pixels = Buffer.alloc(width * height * 3, 246);
  const qrX = 560;
  const qrY = 120;
  const moduleSize = 10;
  const modules = 17;

  function setBlock(x: number, y: number, size: number, value: number) {
    for (let yy = y; yy < y + size; yy += 1) {
      for (let xx = x; xx < x + size; xx += 1) {
        if (xx < 0 || xx >= width || yy < 0 || yy >= height) {
          continue;
        }

        const offset = (yy * width + xx) * 3;
        pixels[offset] = value;
        pixels[offset + 1] = value;
        pixels[offset + 2] = value;
      }
    }
  }

  for (let y = 80; y < 570; y += 1) {
    setBlock(80, y, 2, 218);
    setBlock(820, y, 2, 218);
  }

  for (let x = 80; x < 822; x += 1) {
    setBlock(x, 80, 2, 218);
    setBlock(x, 570, 2, 218);
  }

  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      const inFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= modules - 7) ||
        (row >= modules - 7 && col < 7);
      const finderRing =
        inFinder &&
        (row % 6 === 0 || col % 6 === 0 || (row % 6 >= 2 && row % 6 <= 4 && col % 6 >= 2 && col % 6 <= 4));
      const dataModule = (row * 3 + col * 5 + row * col) % 4 < 2;
      const value = finderRing || (!inFinder && dataModule) ? 8 : 246;
      setBlock(qrX + col * moduleSize, qrY + row * moduleSize, moduleSize, value);
    }
  }

  return sharp(pixels, {
    raw: {
      width,
      height,
      channels: 3
    }
  })
    .png()
    .toBuffer();
}

describe("image normalization and perceptual hashing", () => {
  it("normalizes supported images into bounded grayscale WebP derivatives", async () => {
    const source = await createTestImage({ width: 1600, height: 900 });
    const normalized = await normalizeDocumentImage(source);

    expect(normalized.metadata).toMatchObject({
      width: normalizedImageMaxDimension,
      height: 576,
      mimeType: "image/webp",
      algorithm: normalizedImageAlgorithm
    });
    expect(normalized.metadata.fileSize).toBe(normalized.buffer.length);
    await expect(sharp(normalized.buffer).metadata()).resolves.toMatchObject({
      format: "webp",
      width: normalizedImageMaxDimension,
      height: 576
    });
  });

  it("generates stable 64-bit dHash values", async () => {
    const source = await createTestImage({ width: 64, height: 64 });
    const normalized = await normalizeDocumentImage(source);

    await expect(calculateDHash(normalized.buffer)).resolves.toMatch(/^[0-9a-f]{16}$/);
    await expect(calculateDHash(normalized.buffer)).resolves.toBe(await calculateDHash(normalized.buffer));
  });

  it("computes Hamming distance and similarity from perceptual hashes", () => {
    expect(hammingDistanceHex("0000000000000000", "000000000000000f")).toBe(4);
    expect(similarityScoreFromHammingDistance(4)).toBe(0.9375);
  });

  it("selects the best deterministic perceptual candidate by distance, then age, then id", () => {
    const oldestId = new ObjectId("000000000000000000000001");
    const newerId = new ObjectId("000000000000000000000002");
    const sameDistanceOlderId = new ObjectId("000000000000000000000003");

    const match = selectBestPerceptualMatch(
      [
        {
          _id: newerId,
          perceptualHash: "0000000000000001",
          createdAt: new Date("2026-05-08T10:00:02.000Z")
        },
        {
          _id: sameDistanceOlderId,
          perceptualHash: "0000000000000001",
          createdAt: new Date("2026-05-08T10:00:02.000Z")
        },
        {
          _id: oldestId,
          perceptualHash: "0000000000000003",
          createdAt: new Date("2026-05-08T10:00:00.000Z")
        }
      ],
      "0000000000000000"
    );

    expect(match?.document._id).toEqual(newerId);
    expect(match?.hammingDistance).toBe(1);

    const tieBreakMatch = selectBestPerceptualMatch(
      [
        {
          _id: newerId,
          perceptualHash: "0000000000000001",
          createdAt: new Date("2026-05-08T10:00:02.000Z")
        },
        {
          _id: sameDistanceOlderId,
          perceptualHash: "0000000000000001",
          createdAt: new Date("2026-05-08T10:00:02.000Z")
        }
      ],
      "0000000000000000"
    );

    expect(tieBreakMatch?.document._id).toEqual(newerId);
  });

  it("fails clearly unusable tiny images", async () => {
    const tiny = await createSolidImage({ width: 120, height: 120, value: 128 });

    await expect(assessImageQuality(tiny)).resolves.toMatchObject({
      qualityStatus: "FAIL",
      qualityWarnings: ["IMAGE_TOO_SMALL"],
      qualityMetrics: {
        width: 120,
        height: 120
      }
    });
  });

  it("warns for dark and bright exposure", async () => {
    const dark = await createSolidImage({ width: 1000, height: 800, value: 20 });
    const bright = await createSolidImage({ width: 1000, height: 800, value: 240 });

    await expect(assessImageQuality(dark)).resolves.toMatchObject({
      qualityStatus: "WARN",
      qualityWarnings: expect.arrayContaining(["TOO_DARK"])
    });
    await expect(assessImageQuality(bright)).resolves.toMatchObject({
      qualityStatus: "WARN",
      qualityWarnings: expect.arrayContaining(["TOO_BRIGHT"])
    });
  });

  it("warns when blur reduces the sharpness heuristic", async () => {
    const sharpSource = await createTestImage({ width: 1000, height: 800, left: 0, right: 255 });
    const blurred = await sharp(sharpSource).blur(12).png().toBuffer();
    const sharpAssessment = await assessImageQuality(sharpSource);
    const blurredAssessment = await assessImageQuality(blurred);

    expect(sharpAssessment.qualityMetrics.sharpness).toBeGreaterThan(blurredAssessment.qualityMetrics.sharpness);
    expect(blurredAssessment.qualityWarnings).toContain("BLURRY_IMAGE");
  });

  it("finds a plausible QR candidate in a normalized transfer-slip image without decoding content", async () => {
    const source = await createTransferSlipLikeImageWithQrCandidate();
    const normalized = await normalizeDocumentImage(source);
    const analysis = await analyzeQrCandidateFromNormalizedImage(
      normalized.buffer,
      new Date("2026-05-08T10:00:00.000Z")
    );

    expect(analysis).toMatchObject({
      stage: "QR_CANDIDATE",
      algorithm: "qr-candidate-heuristic-v1",
      status: "COMPLETED",
      result: "CANDIDATE_FOUND"
    });
    expect(analysis.candidateCount).toBeGreaterThan(0);
    expect(analysis.bestCandidate?.confidence).toBeGreaterThanOrEqual(0.52);
    expect(analysis.notes.join(" ")).toContain("not decoded");
  });

  it("records no QR candidate for a plain normalized document image", async () => {
    const source = await createSolidImage({ width: 900, height: 650, value: 246 });
    const normalized = await normalizeDocumentImage(source);
    const analysis = await analyzeQrCandidateFromNormalizedImage(
      normalized.buffer,
      new Date("2026-05-08T10:00:00.000Z")
    );

    expect(analysis).toMatchObject({
      status: "COMPLETED",
      result: "NO_CANDIDATE_FOUND",
      candidateCount: 0,
      bestCandidate: null
    });
  });
});
