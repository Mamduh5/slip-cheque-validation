import type { SlipVerificationAnalysisResult, TransferMetadataFields, TransferMetadataParseAnalysisResult } from "@/lib/models";

export function buildSlipVerificationScaffold(input: { evaluatedAt?: Date } = {}): SlipVerificationAnalysisResult {
  return {
    stage: "SLIP_VERIFICATION",
    algorithm: "slip-verification-scaffold-v1",
    status: "COMPLETED",
    result: "NOT_VERIFIED",
    evidenceCategory: "NO_EVIDENCE",
    evaluatedAt: input.evaluatedAt ?? new Date(),
    notes: [
      "Slip verification runtime scaffold recorded with no verification evidence.",
      "No local structural validation or external provider verification has been performed."
    ]
  };
}

export function attemptSlipVerification(input: {
  transferMetadata: TransferMetadataParseAnalysisResult | null;
  evaluatedAt?: Date;
}): SlipVerificationAnalysisResult {
  const evaluatedAt = input.evaluatedAt ?? new Date();

  if (!input.transferMetadata) {
    return buildSlipVerificationScaffold({ evaluatedAt });
  }

  if (
    input.transferMetadata.status !== "COMPLETED" ||
    input.transferMetadata.result !== "PARSED" ||
    input.transferMetadata.payloadFormat !== "THAI_QR_PAYMENT" ||
    !input.transferMetadata.metadata
  ) {
    return {
      stage: "SLIP_VERIFICATION",
      algorithm: "slip-verification-scaffold-v1",
      status: input.transferMetadata.result === "UNSUPPORTED_FORMAT" ? "COMPLETED" : "SKIPPED",
      result: input.transferMetadata.result === "UNSUPPORTED_FORMAT" ? "UNSUPPORTED" : "NOT_VERIFIED",
      evidenceCategory: "NO_EVIDENCE",
      evaluatedAt,
      notes: [
        "Local structural validation was not run because supported Thai QR payment metadata was not available.",
        "No external provider verification has been performed."
      ]
    };
  }

  return validateThaiQrPaymentStructure({
    metadata: input.transferMetadata.metadata,
    rawPayload: input.transferMetadata.rawPayload,
    parseWarnings: input.transferMetadata.warnings,
    evaluatedAt
  });
}

function validateThaiQrPaymentStructure(input: {
  metadata: TransferMetadataFields;
  rawPayload: string | null;
  parseWarnings: string[];
  evaluatedAt: Date;
}): SlipVerificationAnalysisResult {
  const checks: string[] = [];
  const issues: string[] = [];
  const metadata = input.metadata;
  const merchantAccountInfo = metadata.merchantAccountInfo;

  recordPresenceCheck({
    label: "EMV payload format indicator is present and equals 01.",
    passed: metadata.emvVersion === "01",
    issues
  });
  recordPresenceCheck({
    label: "Country code is present and equals TH.",
    passed: metadata.countryCode === "TH",
    issues
  });
  recordPresenceCheck({
    label: "Currency code is present and equals 764.",
    passed: metadata.currencyCode === "764",
    issues
  });
  recordPresenceCheck({
    label: "Thai QR merchant account information is present.",
    passed: merchantAccountInfo !== null,
    issues
  });

  const crcResult = validateCrcChecksum({ rawPayload: input.rawPayload, crcValue: metadata.crc });
  if (crcResult.status === "MISSING") {
    issues.push("CRC tag (63) is missing from the payload.");
  } else if (crcResult.status === "INVALID") {
    issues.push(`CRC checksum mismatch: computed ${crcResult.computed}, expected ${crcResult.expected}.`);
  }

  checks.push(
    "Checked EMV payload indicator, Thai country/currency tags, merchant account information, target/reference fields, optional amount syntax, and CRC checksum."
  );

  if (metadata.amount !== null && !/^\d+(\.\d{1,2})?$/.test(metadata.amount)) {
    issues.push("Amount is present but is not a decimal value with up to two fractional digits.");
  }

  if (!merchantAccountInfo) {
    return buildLocalStructuralResult({
      result: "STRUCTURALLY_INCONSISTENT",
      evaluatedAt: input.evaluatedAt,
      checks,
      issues,
      parseWarnings: input.parseWarnings
    });
  }

  if (merchantAccountInfo.subtype === "PROMPTPAY") {
    recordPresenceCheck({
      label: "PromptPay target identifier is present.",
      passed: isNonEmpty(merchantAccountInfo.targetIdentifier) && merchantAccountInfo.targetIdentifierType !== "UNKNOWN",
      issues
    });
  } else if (merchantAccountInfo.subtype === "BILL_PAYMENT") {
    recordPresenceCheck({
      label: "Bill payment biller id and reference 1 are present.",
      passed: isNonEmpty(merchantAccountInfo.targetIdentifier) && isNonEmpty(merchantAccountInfo.references.reference1),
      issues
    });
  } else {
    issues.push("Thai QR merchant account subtype is not supported for local structural validation.");
  }

  return buildLocalStructuralResult({
    result: issues.length === 0 ? "STRUCTURALLY_CONSISTENT" : "STRUCTURALLY_INCONSISTENT",
    evaluatedAt: input.evaluatedAt,
    checks,
    issues,
    parseWarnings: input.parseWarnings
  });
}

function validateCrcChecksum(input: {
  rawPayload: string | null;
  crcValue: string | null;
}):
  | { status: "MISSING"; computed: null; expected: null }
  | { status: "VALID"; computed: string; expected: string }
  | { status: "INVALID"; computed: string; expected: string }
  | { status: "UNAVAILABLE"; computed: null; expected: null } {
  if (!input.rawPayload || !isNonEmpty(input.crcValue)) {
    return { status: "MISSING", computed: null, expected: null };
  }

  const crcValue = input.crcValue;
  const crcTagWithValue = "6304" + crcValue;
  const crcIndex = input.rawPayload.lastIndexOf(crcTagWithValue);

  if (crcIndex === -1) {
    return { status: "MISSING", computed: null, expected: null };
  }

  const payloadForCrc =
    input.rawPayload.slice(0, crcIndex + 4) + "0000" + input.rawPayload.slice(crcIndex + 8);
  const computedCrc = crc16CcittFalse(payloadForCrc);
  const computedCrcHex = computedCrc.toString(16).toUpperCase().padStart(4, "0");

  if (computedCrcHex === crcValue) {
    return { status: "VALID", computed: computedCrcHex, expected: crcValue };
  }

  return { status: "INVALID", computed: computedCrcHex, expected: crcValue };
}

function crc16CcittFalse(data: string): number {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }
  return crc;
}

function buildLocalStructuralResult(input: {
  result: "STRUCTURALLY_CONSISTENT" | "STRUCTURALLY_INCONSISTENT";
  evaluatedAt: Date;
  checks: string[];
  issues: string[];
  parseWarnings: string[];
}): SlipVerificationAnalysisResult {
  return {
    stage: "SLIP_VERIFICATION",
    algorithm: "slip-verification-local-structural-v1",
    status: "COMPLETED",
    result: input.result,
    evidenceCategory: "LOCAL_STRUCTURAL_CHECK",
    evaluatedAt: input.evaluatedAt,
    notes: [
      "Local structural validation checked only supported Thai QR payment metadata parsed from decoded QR content.",
      ...input.checks,
      ...input.issues.map((issue) => `Structural issue: ${issue}`),
      ...input.parseWarnings.map((warning) => `Parse warning considered: ${warning}`),
      "This local result does not confirm payment completion, bank truth, recipient truth, or slip authenticity."
    ]
  };
}

function recordPresenceCheck(input: { label: string; passed: boolean; issues: string[] }) {
  if (!input.passed) {
    input.issues.push(input.label);
  }
}

function isNonEmpty(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
