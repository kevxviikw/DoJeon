// Peer-approved check-ins (club amendment C, Sept 5 2026 addendum). A
// daily check is confirmed once it clears an approval threshold from the
// squad -- evaluation is peer confirmation within the small trusted group,
// not self-report alone and not an algorithm. Threshold starts at 75%,
// adjustable per squad. Solo missions never call this.

export const DEFAULT_APPROVAL_THRESHOLD = 0.75;

export interface ApprovalTally {
  approvals: number;
  votesCast: number;
  eligibleVoters: number;
  approvalRate: number;
  confirmed: boolean;
}

export function tallyApproval(
  votes: boolean[],
  eligibleVoters: number,
  threshold: number = DEFAULT_APPROVAL_THRESHOLD
): ApprovalTally {
  if (eligibleVoters <= 0) {
    throw new Error("A squad needs at least one eligible voter to approve a check-in.");
  }
  const approvals = votes.filter(Boolean).length;
  const approvalRate = approvals / eligibleVoters;
  return {
    approvals,
    votesCast: votes.length,
    eligibleVoters,
    approvalRate,
    confirmed: approvalRate >= threshold,
  };
}

/** Minimum number of approvals needed out of `eligibleVoters` to clear `threshold`. */
export function requiredApprovalCount(eligibleVoters: number, threshold: number = DEFAULT_APPROVAL_THRESHOLD): number {
  return Math.ceil(eligibleVoters * threshold);
}
