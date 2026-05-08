import sharp from "sharp";
import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { normalizeDocumentImage, normalizedImageAlgorithm, normalizedImageMaxDimension } from "../lib/image-normalization";
import {
  calculateDHash,
  hammingDistanceHex,
  selectBestPerceptualMatch,
  similarityScoreFromHammingDistance
} from "../lib/perceptual-hash";

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
});
