import sharp from "sharp";
import type { DocumentRecord } from "@/lib/models";

export const dhashAlgorithm = "dhash-64-v1";
export const dhashBits = 64;
export const likelyDuplicateHammingThreshold = 8;

export interface PerceptualMatch {
  document: Pick<DocumentRecord, "_id" | "perceptualHash" | "createdAt">;
  hammingDistance: number;
  similarityScore: number;
}

export async function calculateDHash(buffer: Buffer) {
  const pixels = await sharp(buffer, { failOn: "error" })
    .resize(9, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  let hash = 0n;

  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const left = pixels[y * 9 + x];
      const right = pixels[y * 9 + x + 1];
      hash = (hash << 1n) | (left > right ? 1n : 0n);
    }
  }

  return hash.toString(16).padStart(16, "0");
}

export function hammingDistanceHex(left: string, right: string) {
  if (!/^[0-9a-f]{16}$/i.test(left) || !/^[0-9a-f]{16}$/i.test(right)) {
    throw new Error("Expected two 64-bit perceptual hashes encoded as 16 hex characters.");
  }

  let distance = 0;

  for (let index = 0; index < left.length; index += 1) {
    const xor = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    distance += bitCountNibble(xor);
  }

  return distance;
}

export function similarityScoreFromHammingDistance(distance: number) {
  return Number((1 - distance / dhashBits).toFixed(4));
}

export function selectBestPerceptualMatch(
  candidates: Array<Pick<DocumentRecord, "_id" | "perceptualHash" | "createdAt">>,
  perceptualHash: string,
  threshold = likelyDuplicateHammingThreshold
): PerceptualMatch | null {
  const matches = candidates
    .filter((candidate) => candidate.perceptualHash)
    .map((candidate) => {
      const hammingDistance = hammingDistanceHex(perceptualHash, candidate.perceptualHash as string);

      return {
        document: candidate,
        hammingDistance,
        similarityScore: similarityScoreFromHammingDistance(hammingDistance)
      };
    })
    .filter((match) => match.hammingDistance <= threshold)
    .sort((left, right) => {
      if (left.hammingDistance !== right.hammingDistance) {
        return left.hammingDistance - right.hammingDistance;
      }

      const createdAtComparison = left.document.createdAt.getTime() - right.document.createdAt.getTime();

      if (createdAtComparison !== 0) {
        return createdAtComparison;
      }

      return String(left.document._id).localeCompare(String(right.document._id));
    });

  return matches[0] ?? null;
}

function bitCountNibble(value: number) {
  return [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][value];
}
