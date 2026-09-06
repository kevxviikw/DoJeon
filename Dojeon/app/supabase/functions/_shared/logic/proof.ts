// Proof -- evidence per task, labeled honestly, never auto-"verified".
// Privacy is a defined requirement: status is always visible to the squad,
// the underlying file is opt-in per submission, and removing evidence
// later can't rewrite the honest historical record. See Field Manual §01
// ("Proof, in practice").

import type { EvidenceRecord, EvidenceTrustLabel } from "./types.ts";

export interface SubmitEvidenceInput {
  fileUrl: string | null;
  filePrivate: boolean;
}

/**
 * A submission starts as attached (if a file came with it) or
 * self-reported (if not). It only ever becomes squad_reviewed once
 * approval votes are actually recorded -- see approval.ts. Nothing here
 * marks anything "verified".
 */
export function submitEvidence(input: SubmitEvidenceInput): EvidenceRecord {
  const trustLabel: EvidenceTrustLabel = input.fileUrl ? "attached" : "self_reported";
  return {
    submitted: true,
    trustLabel,
    filePrivate: input.filePrivate,
    fileUrl: input.filePrivate ? null : input.fileUrl,
    fileRemoved: false,
  };
}

export function markSquadReviewed(evidence: EvidenceRecord): EvidenceRecord {
  return { ...evidence, trustLabel: "squad_reviewed" };
}

/**
 * Removing evidence deletes the file but preserves the honest record that
 * something was submitted -- history can never be quietly rewritten from
 * either direction.
 */
export function removeEvidenceFile(evidence: EvidenceRecord): EvidenceRecord {
  if (!evidence.submitted) {
    throw new Error("Cannot remove evidence that was never submitted.");
  }
  return { ...evidence, fileUrl: null, fileRemoved: true };
}

/** Completion status is always visible; only the underlying file is opt-in. */
export function isFileVisibleToSquad(evidence: EvidenceRecord): boolean {
  return evidence.submitted && !evidence.filePrivate && !evidence.fileRemoved && evidence.fileUrl !== null;
}
