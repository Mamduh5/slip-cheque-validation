import sharp from "sharp";
import type { QrCandidateAnalysisResult } from "@/lib/models";

const analysisAlgorithm = "qr-candidate-heuristic-v1" as const;
const analysisSize = 192;
const windowSizes = [32, 40, 56, 72];
const minCandidateConfidence = 0.52;

type RawImage = {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
};

type CandidateWindow = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

export async function analyzeQrCandidateFromNormalizedImage(
  normalizedBuffer: Buffer,
  checkedAt = new Date()
): Promise<QrCandidateAnalysisResult> {
  try {
    const raw = await decodeForAnalysis(normalizedBuffer);
    const candidates = findQrLikeWindows(raw);
    const bestCandidate = candidates[0] ?? null;

    return {
      stage: "QR_CANDIDATE",
      algorithm: analysisAlgorithm,
      status: "COMPLETED",
      result: bestCandidate ? "CANDIDATE_FOUND" : "NO_CANDIDATE_FOUND",
      checkedAt,
      candidateCount: candidates.length,
      bestCandidate: bestCandidate
        ? {
            ...bestCandidate,
            confidence: roundConfidence(bestCandidate.confidence),
            source: "normalized-image"
          }
        : null,
      notes: bestCandidate
        ? ["A QR-like high-contrast square region was found. QR content was not decoded."]
        : ["No QR-like high-contrast square region was found. QR content was not decoded."]
    };
  } catch {
    return {
      stage: "QR_CANDIDATE",
      algorithm: analysisAlgorithm,
      status: "FAILED",
      result: "ANALYSIS_SKIPPED",
      checkedAt,
      candidateCount: 0,
      bestCandidate: null,
      notes: ["QR-candidate analysis could not process the normalized image."]
    };
  }
}

async function decodeForAnalysis(buffer: Buffer): Promise<RawImage> {
  const { data, info } = await sharp(buffer)
    .resize(analysisSize, analysisSize, {
      fit: "inside",
      withoutEnlargement: true
    })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels
  };
}

function findQrLikeWindows(image: RawImage) {
  const candidates: CandidateWindow[] = [];

  for (const size of windowSizes) {
    if (size > image.width || size > image.height) {
      continue;
    }

    const stride = Math.max(8, Math.floor(size / 4));

    for (let y = 0; y <= image.height - size; y += stride) {
      for (let x = 0; x <= image.width - size; x += stride) {
        const confidence = scoreWindow(image, x, y, size);

        if (confidence >= minCandidateConfidence) {
          candidates.push({
            x,
            y,
            width: size,
            height: size,
            confidence
          });
        }
      }
    }
  }

  return candidates
    .sort((left, right) => right.confidence - left.confidence || left.y - right.y || left.x - right.x)
    .slice(0, 5);
}

function scoreWindow(image: RawImage, startX: number, startY: number, size: number) {
  let darkPixels = 0;
  let min = 255;
  let max = 0;
  let horizontalTransitions = 0;
  let verticalTransitions = 0;

  for (let y = startY; y < startY + size; y += 1) {
    for (let x = startX; x < startX + size; x += 1) {
      const value = pixelAt(image, x, y);
      const isDark = value < 128;

      if (isDark) {
        darkPixels += 1;
      }

      min = Math.min(min, value);
      max = Math.max(max, value);

      if (x > startX) {
        const previous = pixelAt(image, x - 1, y) < 128;
        if (previous !== isDark) {
          horizontalTransitions += 1;
        }
      }

      if (y > startY) {
        const previous = pixelAt(image, x, y - 1) < 128;
        if (previous !== isDark) {
          verticalTransitions += 1;
        }
      }
    }
  }

  const area = size * size;
  const darkRatio = darkPixels / area;
  const transitionSlots = size * (size - 1) * 2;
  const transitionDensity = (horizontalTransitions + verticalTransitions) / transitionSlots;
  const contrast = (max - min) / 255;
  const balanceScore = clamp(1 - Math.abs(darkRatio - 0.45) / 0.35, 0, 1);
  const transitionScore = clamp((transitionDensity - 0.12) / 0.28, 0, 1);
  const contrastScore = clamp((contrast - 0.45) / 0.45, 0, 1);

  return balanceScore * 0.35 + transitionScore * 0.45 + contrastScore * 0.2;
}

function pixelAt(image: RawImage, x: number, y: number) {
  return image.data[(y * image.width + x) * image.channels];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundConfidence(value: number) {
  return Math.round(value * 1000) / 1000;
}
