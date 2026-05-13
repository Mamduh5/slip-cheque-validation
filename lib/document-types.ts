import type { DocumentType } from "@/lib/models";
import { getDocumentProcessingProfile } from "@/lib/document-processing-profiles";
import { translate, type SupportedLocale } from "@/lib/i18n";

export const documentTypeLabels: Record<DocumentType, string> = {
  BANK_TRANSFER_SLIP: "Bank transfer slip",
  DEPOSIT_PAYMENT_SLIP: "Deposit/payment slip",
  CHEQUE: "Cheque",
  UNKNOWN: "Not sure / unknown"
};

export const documentTypeDescriptions: Record<DocumentType, string> = {
  BANK_TRANSFER_SLIP: "Transfer receipt or confirmation slip.",
  DEPOSIT_PAYMENT_SLIP: "Deposit, bill payment, or counter payment slip.",
  CHEQUE: "Paper cheque image.",
  UNKNOWN: "Use when the document type is unclear."
};

const documentTypeGuidance: Record<DocumentType, { title: string; tips: string[] }> = {
  BANK_TRANSFER_SLIP: {
    title: "For slips, keep printed details and edges visible.",
    tips: ["Capture the whole slip.", "Avoid glare over printed amounts or reference numbers."]
  },
  DEPOSIT_PAYMENT_SLIP: {
    title: "For deposit/payment slips, keep the full paper visible.",
    tips: ["Include the receipt edges.", "Keep stamped or printed areas sharp."]
  },
  CHEQUE: {
    title: "For cheques, capture the full document clearly.",
    tips: ["Include all corners.", "Keep signature and printed lines in focus."]
  },
  UNKNOWN: {
    title: "If you are not sure, upload it as an unknown paper document.",
    tips: ["Include the full paper.", "Keep text and edges sharp."]
  }
};

export const documentTypeOptions = [
  "BANK_TRANSFER_SLIP",
  "DEPOSIT_PAYMENT_SLIP",
  "CHEQUE",
  "UNKNOWN"
] as const satisfies readonly DocumentType[];

export function formatDocumentType(type: DocumentType, locale: SupportedLocale = "en") {
  return translate(locale, `documentTypes.${type}`);
}

export function getDocumentTypeDescription(type: DocumentType, locale: SupportedLocale = "en") {
  return translate(locale, `documentTypeDescriptions.${type}`);
}

export function getDocumentTypeGuidance(type: DocumentType, locale: SupportedLocale = "en") {
  const keys: Record<DocumentType, {
    title: `documentTypeGuidance.${DocumentType}.title`;
    tip1: `documentTypeGuidance.${DocumentType}.tip1`;
    tip2: `documentTypeGuidance.${DocumentType}.tip2`;
  }> = {
    BANK_TRANSFER_SLIP: {
      title: "documentTypeGuidance.BANK_TRANSFER_SLIP.title",
      tip1: "documentTypeGuidance.BANK_TRANSFER_SLIP.tip1",
      tip2: "documentTypeGuidance.BANK_TRANSFER_SLIP.tip2"
    },
    DEPOSIT_PAYMENT_SLIP: {
      title: "documentTypeGuidance.DEPOSIT_PAYMENT_SLIP.title",
      tip1: "documentTypeGuidance.DEPOSIT_PAYMENT_SLIP.tip1",
      tip2: "documentTypeGuidance.DEPOSIT_PAYMENT_SLIP.tip2"
    },
    CHEQUE: {
      title: "documentTypeGuidance.CHEQUE.title",
      tip1: "documentTypeGuidance.CHEQUE.tip1",
      tip2: "documentTypeGuidance.CHEQUE.tip2"
    },
    UNKNOWN: {
      title: "documentTypeGuidance.UNKNOWN.title",
      tip1: "documentTypeGuidance.UNKNOWN.tip1",
      tip2: "documentTypeGuidance.UNKNOWN.tip2"
    }
  };
  const selectedKeys = keys[type];

  return {
    title: translate(locale, selectedKeys.title),
    tips: [translate(locale, selectedKeys.tip1), translate(locale, selectedKeys.tip2)]
  };
}

export function getDocumentTypeProcessingProfile(type: DocumentType) {
  const profile = getDocumentProcessingProfile(type);

  return {
    ...profile,
    type,
    futureQrCandidate: type === "BANK_TRANSFER_SLIP",
    futureChequeExtractionCandidate: type === "CHEQUE",
    futurePaymentSlipExtractionCandidate: type === "DEPOSIT_PAYMENT_SLIP"
  };
}
