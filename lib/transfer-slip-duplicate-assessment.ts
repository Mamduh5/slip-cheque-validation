import type { DocumentRecord } from "@/lib/models";

export interface TransferSlipDuplicateAssessment {
  result: "MATCH" | "CONFLICT" | "INSUFFICIENT_EVIDENCE";
  conflicts: string[];
  positiveEvidence: string[];
  notes: string;
}

function isNonEmpty(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value.trim().length > 0;
}

export function assessTransferSlipDuplicateCandidate(
  newDoc: {
    qrDecode: DocumentRecord["qrDecode"];
    transferMetadata: DocumentRecord["transferMetadata"];
  },
  candidate: {
    qrDecode: DocumentRecord["qrDecode"];
    transferMetadata: DocumentRecord["transferMetadata"];
  }
): TransferSlipDuplicateAssessment {
  const conflicts: string[] = [];
  const definitiveMatches: string[] = [];

  // Definitive positive: identical raw QR payload
  if (isNonEmpty(newDoc.qrDecode?.rawDecodedText) && isNonEmpty(candidate.qrDecode?.rawDecodedText)) {
    if (newDoc.qrDecode.rawDecodedText === candidate.qrDecode.rawDecodedText) {
      definitiveMatches.push("identical raw QR payload");
    } else {
      conflicts.push("different raw QR payload");
    }
  }

  // Definitive positive: identical raw transfer metadata payload
  if (isNonEmpty(newDoc.transferMetadata?.rawPayload) && isNonEmpty(candidate.transferMetadata?.rawPayload)) {
    if (newDoc.transferMetadata.rawPayload === candidate.transferMetadata.rawPayload) {
      definitiveMatches.push("identical transfer metadata payload");
    } else {
      conflicts.push("different transfer metadata payload");
    }
  }

  const newMeta = newDoc.transferMetadata?.metadata;
  const candMeta = candidate.transferMetadata?.metadata;

  if (newMeta && candMeta) {
    // Amount
    if (isNonEmpty(newMeta.amount) && isNonEmpty(candMeta.amount)) {
      if (newMeta.amount !== candMeta.amount) {
        conflicts.push("different amount");
      }
    }

    // Recipient / target identifier
    if (
      isNonEmpty(newMeta.merchantAccountInfo?.targetIdentifier) &&
      isNonEmpty(candMeta.merchantAccountInfo?.targetIdentifier)
    ) {
      if (newMeta.merchantAccountInfo.targetIdentifier !== candMeta.merchantAccountInfo.targetIdentifier) {
        conflicts.push("different recipient");
      }
    }

    // Transaction / reference identifier
    if (
      isNonEmpty(newMeta.merchantAccountInfo?.references?.reference1) &&
      isNonEmpty(candMeta.merchantAccountInfo?.references?.reference1)
    ) {
      if (newMeta.merchantAccountInfo.references.reference1 !== candMeta.merchantAccountInfo.references.reference1) {
        conflicts.push("different transaction reference");
      }
    }
  }

  // Definitive match wins over everything
  if (definitiveMatches.length > 0) {
    return {
      result: "MATCH",
      conflicts,
      positiveEvidence: definitiveMatches,
      notes: `Supported duplicate: ${definitiveMatches.join(", ")}`
    };
  }

  // Any strong conflict suppresses without definitive match
  if (conflicts.length > 0) {
    return {
      result: "CONFLICT",
      conflicts,
      positiveEvidence: [],
      notes: `Suppressed near-duplicate: ${conflicts.join(", ")}`
    };
  }

  return {
    result: "INSUFFICIENT_EVIDENCE",
    conflicts,
    positiveEvidence: [],
    notes: "Insufficient structured evidence; rely on perceptual similarity"
  };
}
