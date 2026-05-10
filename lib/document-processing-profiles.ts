import type { DocumentProcessingProfileSnapshot, DocumentType } from "@/lib/models";

type DocumentProcessingPlan = {
  profile: DocumentProcessingProfileSnapshot;
  specializedBranch: "slip" | "payment-slip" | "cheque" | "generic";
};

const sharedCurrentStages = [
  "capture-quality-assessment",
  "normalized-image-generation",
  "sha256-exact-duplicate-check",
  "dhash-near-duplicate-check"
];

const sharedActiveStagePlan = [
  {
    key: "SHARED_QUALITY",
    label: "Shared quality assessment",
    status: "ACTIVE",
    description: "Runs capture-quality heuristics for accepted uploads."
  },
  {
    key: "SHARED_FINGERPRINTING",
    label: "Shared image fingerprinting",
    status: "ACTIVE",
    description: "Runs normalized-image generation, SHA-256 hashing, and dHash duplicate matching."
  }
] as const;

const transferSlipFutureStagePlan = [
  {
    key: "QR_CANDIDATE",
    label: "QR candidate detection",
    status: "ACTIVE",
    description: "Runs conservative QR-like region analysis for transfer slip photos without decoding QR content."
  },
  {
    key: "QR_DECODE",
    label: "QR decode",
    status: "ACTIVE",
    description: "Attempts to decode QR content when a plausible QR candidate exists. Stores raw decoded text without business interpretation."
  },
  {
    key: "TRANSFER_METADATA_PARSE",
    label: "Transfer metadata parse",
    status: "ACTIVE",
    description: "Classifies decoded QR payloads and parses supported transfer metadata without verification."
  },
  {
    key: "SLIP_VERIFICATION",
    label: "Slip verification",
    status: "PLANNED",
    description: "Future stage for validation checks after extraction exists."
  }
] as const;

const profiles: Record<DocumentType, DocumentProcessingProfileSnapshot> = {
  BANK_TRANSFER_SLIP: {
    name: "bank-transfer-slip-v1",
    label: "Transfer slip profile",
    branch: "TRANSFER_SLIP",
    family: "transfer-slip",
    description:
      "Slip-first branch. Current runtime uses shared image quality, duplicate checks, conservative QR-candidate analysis, QR decoding, and transfer metadata parsing. Slip verification is not implemented.",
    currentStages: [...sharedCurrentStages, "qr-candidate-analysis", "qr-decode", "transfer-metadata-parse"],
    futureStages: ["transfer-slip-specific-validation"],
    plannedStages: [...sharedActiveStagePlan, ...transferSlipFutureStagePlan],
    capabilities: {
      qrOrientedFuturePath: true,
      qrCandidateAnalysisImplemented: true,
      extractionImplemented: false,
      verificationImplemented: false
    }
  },
  DEPOSIT_PAYMENT_SLIP: {
    name: "deposit-payment-slip-v1",
    label: "Deposit/payment slip profile",
    branch: "PAYMENT_SLIP",
    family: "payment-slip",
    description: "Conservative payment-slip branch. Current runtime uses shared image quality and duplicate checks only.",
    currentStages: sharedCurrentStages,
    futureStages: ["printed-field-extraction", "payment-slip-specific-validation"],
    plannedStages: [...sharedActiveStagePlan],
    capabilities: {
      qrOrientedFuturePath: false,
      qrCandidateAnalysisImplemented: false,
      extractionImplemented: false,
      verificationImplemented: false
    }
  },
  CHEQUE: {
    name: "cheque-v1",
    label: "Cheque profile",
    branch: "CHEQUE",
    family: "cheque",
    description: "Conservative cheque branch. Current runtime uses shared image quality and duplicate checks only.",
    currentStages: sharedCurrentStages,
    futureStages: ["cheque-field-extraction", "cheque-layout-review-support"],
    plannedStages: [...sharedActiveStagePlan],
    capabilities: {
      qrOrientedFuturePath: false,
      qrCandidateAnalysisImplemented: false,
      extractionImplemented: false,
      verificationImplemented: false
    }
  },
  UNKNOWN: {
    name: "generic-unknown-v1",
    label: "Generic document profile",
    branch: "GENERIC",
    family: "generic",
    description: "Generic branch for unclear document types. Current runtime uses shared image quality and duplicate checks only.",
    currentStages: sharedCurrentStages,
    futureStages: ["manual-type-correction", "type-specific-reprocessing-after-correction"],
    plannedStages: [...sharedActiveStagePlan],
    capabilities: {
      qrOrientedFuturePath: false,
      qrCandidateAnalysisImplemented: false,
      extractionImplemented: false,
      verificationImplemented: false
    }
  }
};

export function getDocumentProcessingProfile(type: DocumentType) {
  return cloneProfile(profiles[type]);
}

export function getTypeAwareProcessingPlan(type: DocumentType): DocumentProcessingPlan {
  switch (type) {
    case "BANK_TRANSFER_SLIP":
      return buildTransferSlipProcessingPlan();
    case "DEPOSIT_PAYMENT_SLIP":
      return buildDepositPaymentSlipProcessingPlan();
    case "CHEQUE":
      return buildChequeProcessingPlan();
    case "UNKNOWN":
      return buildGenericProcessingPlan();
  }
}

function buildTransferSlipProcessingPlan(): DocumentProcessingPlan {
  return {
    profile: getDocumentProcessingProfile("BANK_TRANSFER_SLIP"),
    specializedBranch: "slip"
  };
}

function buildDepositPaymentSlipProcessingPlan(): DocumentProcessingPlan {
  return {
    profile: getDocumentProcessingProfile("DEPOSIT_PAYMENT_SLIP"),
    specializedBranch: "payment-slip"
  };
}

function buildChequeProcessingPlan(): DocumentProcessingPlan {
  return {
    profile: getDocumentProcessingProfile("CHEQUE"),
    specializedBranch: "cheque"
  };
}

function buildGenericProcessingPlan(): DocumentProcessingPlan {
  return {
    profile: getDocumentProcessingProfile("UNKNOWN"),
    specializedBranch: "generic"
  };
}

function cloneProfile(profile: DocumentProcessingProfileSnapshot): DocumentProcessingProfileSnapshot {
  return {
    ...profile,
    currentStages: [...profile.currentStages],
    futureStages: [...profile.futureStages],
    plannedStages: profile.plannedStages.map((stage) => ({ ...stage })),
    capabilities: { ...profile.capabilities }
  };
}
