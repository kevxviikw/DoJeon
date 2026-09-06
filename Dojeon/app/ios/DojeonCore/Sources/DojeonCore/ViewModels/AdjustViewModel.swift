import Foundation
import Observation

/// Backs Adjust: evaluate whether the mission still has recovery room,
/// present real tradeoffs only when it doesn't, and only ever change the
/// mission on explicit approval. Field Manual §01, "Adjust, the rules".
@Observable
@MainActor
public final class AdjustViewModel {
    public private(set) var latestProposal: AdjustmentProposalDTO?
    public private(set) var latestAdjustmentId: UUID?
    public private(set) var repeatedMinimumOnly = false
    public private(set) var isLoading = false
    public var errorMessage: String?

    private let adjustService: AdjustService

    public init(adjustService: AdjustService) {
        self.adjustService = adjustService
    }

    public func evaluate(missionId: UUID) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let response = try await adjustService.evaluate(missionId: missionId)
            latestProposal = response.proposal
            latestAdjustmentId = response.adjustment.id
            repeatedMinimumOnly = response.repeatedMinimumOnly
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Only this call -- the member's explicit decision -- can ever change
    /// the mission. Declining leaves the original commitment untouched
    /// while keeping the proposal on record.
    public func decide(approved: Bool) async {
        guard let adjustmentId = latestAdjustmentId else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            _ = try await adjustService.decide(adjustmentId: adjustmentId, approved: approved)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
