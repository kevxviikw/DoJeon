import Foundation

/// Adjust -- honest replanning. Checks for recovery room first; only a
/// member's explicit approval (via `decide`) can ever change the mission.
/// Field Manual §01, "Adjust, the rules".
public struct AdjustService {
    private let api: APIClient
    public init(api: APIClient) { self.api = api }

    public func evaluate(missionId: UUID) async throws -> AdjustPlanResponse {
        try await api.callFunction("adjust-plan", body: AdjustPlanRequest(missionId: missionId))
    }

    public func decide(adjustmentId: UUID, approved: Bool) async throws -> AdjustmentDecideResponse {
        try await api.callFunction("adjustment-decide", body: AdjustmentDecideRequest(adjustmentId: adjustmentId, approved: approved))
    }
}
