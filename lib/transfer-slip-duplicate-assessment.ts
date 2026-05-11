import type { DocumentRecord, DuplicateDecisionReason } from "@/lib/models";
import { normalizeReferenceForCompare, normalizeThaiDateTimeForCompare, compareThaiNames } from "@/lib/slip-ocr-normalization";

export interface TransferSlipDuplicateAssessment {
  result: "MATCH" | "CONFLICT" | "INSUFFICIENT_EVIDENCE";
  conflicts: string[];
  positiveEvidence: string[];
  notes: string;
  reasonCodes: DuplicateDecisionReason[];
}

function isNonEmpty(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value.trim().length > 0;
}

function conflictToReasonCode(conflict: string): DuplicateDecisionReason {
  switch (conflict) {
    case "different amount":
      return "AMOUNT_MISMATCH";
    case "different recipient":
      return "RECIPIENT_MISMATCH";
    case "different transaction reference":
      return "REFERENCE_MISMATCH";
    case "different raw QR payload":
      return "QR_PAYLOAD_MISMATCH";
    case "different transfer metadata payload":
      return "TRANSFER_METADATA_PAYLOAD_MISMATCH";
    case "image-read different amount":
      return "IMAGE_READ_AMOUNT_MISMATCH";
    case "image-read different recipient":
      return "IMAGE_READ_RECIPIENT_MISMATCH";
    case "image-read different sender":
      return "IMAGE_READ_SENDER_MISMATCH";
    case "image-read different transaction reference":
      return "IMAGE_READ_REFERENCE_MISMATCH";
    case "image-read different date/time":
      return "IMAGE_READ_DATETIME_MISMATCH";
    case "image-read different receiver bank":
      return "IMAGE_READ_BANK_MISMATCH";
    default:
      return "IMAGE_SIMILARITY_ONLY";
  }
}

function evidenceToReasonCode(evidence: string): DuplicateDecisionReason {
  switch (evidence) {
    case "identical raw QR payload":
      return "IDENTICAL_QR_PAYLOAD";
    case "identical transfer metadata payload":
      return "IDENTICAL_TRANSFER_METADATA_PAYLOAD";
    default:
      return "IMAGE_SIMILARITY_ONLY";
  }
}

export function assessTransferSlipDuplicateCandidate(
  newDoc: {
    qrDecode: DocumentRecord["qrDecode"];
    transferMetadata: DocumentRecord["transferMetadata"];
    slipImageRead: DocumentRecord["slipImageRead"];
  },
  candidate: {
    qrDecode: DocumentRecord["qrDecode"];
    transferMetadata: DocumentRecord["transferMetadata"];
    slipImageRead: DocumentRecord["slipImageRead"];
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

  // Image-read field conflicts — field-specific trust tiers with multi-signal combining.
  //
  // Tier 1 — strong fields: suppress alone at MEDIUM or higher.
  //   • amount
  //   • transactionReference
  //
  // Tier 2 — supporting fields: suppress alone at HIGH; contribute to multi-signal at MEDIUM.
  //   • receiverName, senderName, dateTime, receiverBank
  //
  // Multi-signal rule: 2+ MEDIUM contributing signals suppress together, or a single
  // contributing signal is included when another conflict already exists.
  const newImg = newDoc.slipImageRead?.extractedFields;
  const candImg = candidate.slipImageRead?.extractedFields;

  if (newImg && candImg) {
    const imgStrongConflicts: string[] = [];
    const imgDirectConflicts: string[] = [];
    const imgContributing: string[] = [];

    // --- Tier 1: strong fields ---

    // Amount (MEDIUM+ trusted)
    if (isMediumOrHigherConfidence(newImg.amount) && isMediumOrHigherConfidence(candImg.amount)) {
      if (normalizeAmountForCompare(newImg.amount.value) !== normalizeAmountForCompare(candImg.amount.value)) {
        imgStrongConflicts.push("image-read different amount");
      }
    }

    // Transaction reference (MEDIUM+ trusted)
    // Uses OCR-confusion normalization (O/0, I/1, l/1) for digit positions.
    if (
      isMediumOrHigherConfidence(newImg.transactionReference) &&
      isMediumOrHigherConfidence(candImg.transactionReference)
    ) {
      if (
        normalizeReferenceForCompare(newImg.transactionReference.value) !==
        normalizeReferenceForCompare(candImg.transactionReference.value)
      ) {
        imgStrongConflicts.push("image-read different transaction reference");
      }
    }

    // --- Tier 2: supporting fields ---

    // Receiver name — uses Thai name normalization (title stripping, fragmentation collapse)
    // and conservative comparison. EXACT and CLOSE are treated as same person; only DIFFERENT
    // raises a conflict.
    if (isHighConfidence(newImg.receiverName) && isHighConfidence(candImg.receiverName)) {
      if (compareThaiNames(newImg.receiverName.value, candImg.receiverName.value) === "DIFFERENT") {
        imgDirectConflicts.push("image-read different recipient");
      }
    } else if (isMediumConfidence(newImg.receiverName) && isMediumConfidence(candImg.receiverName)) {
      if (compareThaiNames(newImg.receiverName.value, candImg.receiverName.value) === "DIFFERENT") {
        imgContributing.push("image-read different recipient");
      }
    }

    // Sender name — supporting role; same Thai name normalization and comparison.
    if (isHighConfidence(newImg.senderName) && isHighConfidence(candImg.senderName)) {
      if (compareThaiNames(newImg.senderName.value, candImg.senderName.value) === "DIFFERENT") {
        imgDirectConflicts.push("image-read different sender");
      }
    } else if (isMediumConfidence(newImg.senderName) && isMediumConfidence(candImg.senderName)) {
      if (compareThaiNames(newImg.senderName.value, candImg.senderName.value) === "DIFFERENT") {
        imgContributing.push("image-read different sender");
      }
    }

    // Date/time
    // Uses Thai month-abbreviation spacing normalization to avoid false conflicts
    // from OCR whitespace fragmentation around Thai chars and dots.
    if (isHighConfidence(newImg.dateTime) && isHighConfidence(candImg.dateTime)) {
      if (normalizeThaiDateTimeForCompare(newImg.dateTime.value) !== normalizeThaiDateTimeForCompare(candImg.dateTime.value)) {
        imgDirectConflicts.push("image-read different date/time");
      }
    } else if (isMediumConfidence(newImg.dateTime) && isMediumConfidence(candImg.dateTime)) {
      if (normalizeThaiDateTimeForCompare(newImg.dateTime.value) !== normalizeThaiDateTimeForCompare(candImg.dateTime.value)) {
        imgContributing.push("image-read different date/time");
      }
    }

    // Receiver bank
    if (isHighConfidence(newImg.receiverBank) && isHighConfidence(candImg.receiverBank)) {
      if (normalizeCompare(newImg.receiverBank.value) !== normalizeCompare(candImg.receiverBank.value)) {
        imgDirectConflicts.push("image-read different receiver bank");
      }
    } else if (isMediumConfidence(newImg.receiverBank) && isMediumConfidence(candImg.receiverBank)) {
      if (normalizeCompare(newImg.receiverBank.value) !== normalizeCompare(candImg.receiverBank.value)) {
        imgContributing.push("image-read different receiver bank");
      }
    }

    // Accumulate strong and direct conflicts immediately
    conflicts.push(...imgStrongConflicts, ...imgDirectConflicts);

    // Multi-signal: include contributing signals when 2+ exist, or when reinforcing existing conflicts
    const hasOtherImgConflicts = imgStrongConflicts.length > 0 || imgDirectConflicts.length > 0;
    if (imgContributing.length >= 2 || (imgContributing.length >= 1 && hasOtherImgConflicts)) {
      conflicts.push(...imgContributing);
    }
  }

  // Definitive match wins over everything
  if (definitiveMatches.length > 0) {
    return {
      result: "MATCH",
      conflicts,
      positiveEvidence: definitiveMatches,
      notes: `Supported duplicate: ${definitiveMatches.join(", ")}`,
      reasonCodes: definitiveMatches.map(evidenceToReasonCode)
    };
  }

  // Any strong conflict suppresses without definitive match
  if (conflicts.length > 0) {
    return {
      result: "CONFLICT",
      conflicts,
      positiveEvidence: [],
      notes: `Suppressed near-duplicate: ${conflicts.join(", ")}`,
      reasonCodes: conflicts.map(conflictToReasonCode)
    };
  }

  return {
    result: "INSUFFICIENT_EVIDENCE",
    conflicts,
    positiveEvidence: [],
    notes: "Insufficient structured evidence; rely on perceptual similarity",
    reasonCodes: ["IMAGE_SIMILARITY_ONLY"]
  };
}

function isHighConfidence(field: { value: string | null; confidence: string }): boolean {
  return field.value !== null && field.confidence === "HIGH";
}

function isMediumOrHigherConfidence(field: { value: string | null; confidence: string }): boolean {
  return field.value !== null && (field.confidence === "HIGH" || field.confidence === "MEDIUM");
}

function isMediumConfidence(field: { value: string | null; confidence: string }): boolean {
  return field.value !== null && field.confidence === "MEDIUM";
}

function normalizeCompare(value: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAmountForCompare(value: string | null): string {
  if (!value) return "";
  const num = parseFloat(value.replace(/[^\d.]/g, ""));
  if (isNaN(num)) return normalizeCompare(value);
  return String(num);
}
