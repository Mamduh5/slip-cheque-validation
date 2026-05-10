import jsQR from "jsqr";
import sharp from "sharp";
import type { QrDecodeAnalysisResult, QrCandidateAnalysisResult } from "@/lib/models";

const decodeAlgorithm = "jsqr-decode-v1" as const;

export async function attemptQrDecode(input: {
  normalizedBuffer: Buffer;
  qrCandidateAnalysis: QrCandidateAnalysisResult | null;
  decodedAt?: Date;
}): Promise<QrDecodeAnalysisResult> {
  const decodedAt = input.decodedAt ?? new Date();

  if (!input.qrCandidateAnalysis) {
    return {
      stage: "QR_DECODE",
      algorithm: decodeAlgorithm,
      status: "NOT_APPLICABLE",
      result: "NO_QR_DECODED",
      decodedAt,
      rawDecodedText: null,
      decodedTextLength: null,
      sourceImageType: null,
      notes: ["QR decode was not attempted because QR candidate analysis is not available."]
    };
  }

  if (input.qrCandidateAnalysis.status !== "COMPLETED") {
    return {
      stage: "QR_DECODE",
      algorithm: decodeAlgorithm,
      status: "SKIPPED",
      result: "NO_QR_DECODED",
      decodedAt,
      rawDecodedText: null,
      decodedTextLength: null,
      sourceImageType: null,
      notes: ["QR decode was skipped because QR candidate analysis did not complete successfully."]
    };
  }

  if (input.qrCandidateAnalysis.result !== "CANDIDATE_FOUND") {
    return {
      stage: "QR_DECODE",
      algorithm: decodeAlgorithm,
      status: "SKIPPED",
      result: "NO_QR_DECODED",
      decodedAt,
      rawDecodedText: null,
      decodedTextLength: null,
      sourceImageType: null,
      notes: ["QR decode was skipped because no plausible QR candidate was found."]
    };
  }

  try {
    const decodeResult = await decodeQrFromNormalizedImage(input.normalizedBuffer);

    if (decodeResult.success) {
      return {
        stage: "QR_DECODE",
        algorithm: decodeAlgorithm,
        status: "COMPLETED",
        result: "QR_DECODED",
        decodedAt,
        rawDecodedText: decodeResult.text,
        decodedTextLength: decodeResult.text.length,
        sourceImageType: "normalized-image",
        notes: ["QR content was successfully decoded from the normalized image."]
      };
    }

    return {
      stage: "QR_DECODE",
      algorithm: decodeAlgorithm,
      status: "COMPLETED",
      result: "NO_QR_DECODED",
      decodedAt,
      rawDecodedText: null,
      decodedTextLength: null,
      sourceImageType: "normalized-image",
      notes: [
        "QR decode was attempted on the normalized image but no valid QR code was found.",
        "A QR-like region was detected but the content could not be decoded."
      ]
    };
  } catch {
    return {
      stage: "QR_DECODE",
      algorithm: decodeAlgorithm,
      status: "FAILED",
      result: "NO_QR_DECODED",
      decodedAt,
      rawDecodedText: null,
      decodedTextLength: null,
      sourceImageType: null,
      notes: ["QR decode failed due to an error processing the normalized image."]
    };
  }
}

async function decodeQrFromNormalizedImage(
  buffer: Buffer
): Promise<{ success: true; text: string } | { success: false }> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const clampedData = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  const qrResult = jsQR(clampedData, info.width, info.height);

  if (qrResult?.data) {
    return {
      success: true,
      text: qrResult.data
    };
  }

  return { success: false };
}
