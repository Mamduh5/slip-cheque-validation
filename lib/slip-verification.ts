import type { SlipVerificationAnalysisResult } from "@/lib/models";

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
