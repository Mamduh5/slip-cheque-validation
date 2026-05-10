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

const profiles: Record<DocumentType, DocumentProcessingProfileSnapshot> = {
  BANK_TRANSFER_SLIP: {
    name: "bank-transfer-slip-v1",
    label: "Transfer slip profile",
    branch: "TRANSFER_SLIP",
    description: "Slip-first branch. Current runtime uses shared image quality and duplicate checks only.",
    currentStages: sharedCurrentStages,
    futureStages: ["qr-candidate-handling", "printed-field-extraction", "transfer-slip-specific-validation"]
  },
  DEPOSIT_PAYMENT_SLIP: {
    name: "deposit-payment-slip-v1",
    label: "Deposit/payment slip profile",
    branch: "PAYMENT_SLIP",
    description: "Conservative payment-slip branch. Current runtime uses shared image quality and duplicate checks only.",
    currentStages: sharedCurrentStages,
    futureStages: ["printed-field-extraction", "payment-slip-specific-validation"]
  },
  CHEQUE: {
    name: "cheque-v1",
    label: "Cheque profile",
    branch: "CHEQUE",
    description: "Conservative cheque branch. Current runtime uses shared image quality and duplicate checks only.",
    currentStages: sharedCurrentStages,
    futureStages: ["cheque-field-extraction", "cheque-layout-review-support"]
  },
  UNKNOWN: {
    name: "generic-unknown-v1",
    label: "Generic document profile",
    branch: "GENERIC",
    description: "Generic branch for unclear document types. Current runtime uses shared image quality and duplicate checks only.",
    currentStages: sharedCurrentStages,
    futureStages: ["manual-type-correction", "type-specific-reprocessing-after-correction"]
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
    futureStages: [...profile.futureStages]
  };
}
