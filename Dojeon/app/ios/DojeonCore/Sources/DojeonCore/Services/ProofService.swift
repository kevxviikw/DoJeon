import Foundation

/// Proof -- evidence per task, labeled honestly, peer-approved inside a
/// squad (amendment C). Field Manual §01/§02.
public struct ProofService {
    private let api: APIClient
    public init(api: APIClient) { self.api = api }

    public func submitCheckin(
        missionId: UUID,
        sessionId: UUID? = nil,
        taskCompleted: Bool,
        evidenceSubmitted: Bool,
        plannedRest: Bool = false,
        technicalInterruption: Bool = false,
        tierHit: Tier? = nil,
        fileUrl: String? = nil,
        filePrivate: Bool = true
    ) async throws -> CheckinSubmitResponse {
        try await api.callFunction(
            "checkin-submit",
            body: CheckinSubmitRequest(
                missionId: missionId,
                sessionId: sessionId,
                taskCompleted: taskCompleted,
                evidenceSubmitted: evidenceSubmitted,
                plannedRest: plannedRest,
                technicalInterruption: technicalInterruption,
                tierHit: tierHit,
                fileUrl: fileUrl,
                filePrivate: filePrivate
            )
        )
    }

    /// Casts the caller's peer-approval vote and returns the resulting
    /// tally (confirmed once the squad's threshold clears -- default 75%).
    public func vote(checkinId: UUID, approve: Bool) async throws -> CheckinApproveResponse {
        try await api.callFunction("checkin-approve", body: CheckinApproveRequest(checkinId: checkinId, approve: approve))
    }
}
