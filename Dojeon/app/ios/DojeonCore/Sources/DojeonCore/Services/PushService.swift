import Foundation

/// Push -- the work-session flow: choose task/output, start the timer,
/// squad can optionally join live, submit or record a blocker, see the
/// async-friendly squad summary. Field Manual §01.
public struct PushService {
    private let api: APIClient
    public init(api: APIClient) { self.api = api }

    public func startSession(
        missionId: UUID,
        taskId: UUID? = nil,
        taskTitle: String,
        outputDescription: String,
        squadId: UUID? = nil,
        liveVisible: Bool = false
    ) async throws -> SessionRow {
        let response: SessionStartResponse = try await api.callFunction(
            "session-start",
            body: SessionStartRequest(
                missionId: missionId,
                taskId: taskId,
                taskTitle: taskTitle,
                outputDescription: outputDescription,
                squadId: squadId,
                liveVisible: liveVisible
            )
        )
        return response.session
    }

    /// Joins an in-progress squad round with your own task -- an explicit,
    /// per-session opt-in, never a default (Field Manual §01).
    public func joinSession(
        sessionRoundId: UUID,
        missionId: UUID,
        taskId: UUID? = nil,
        taskTitle: String,
        outputDescription: String
    ) async throws -> SessionRow {
        let response: SessionJoinResponse = try await api.callFunction(
            "session-join",
            body: SessionJoinRequest(
                sessionRoundId: sessionRoundId,
                missionId: missionId,
                taskId: taskId,
                taskTitle: taskTitle,
                outputDescription: outputDescription
            )
        )
        return response.session
    }

    public func submitOutput(sessionId: UUID) async throws -> SessionRow {
        let response: SessionFinishResponse = try await api.callFunction(
            "session-finish",
            body: SessionFinishRequest(sessionId: sessionId, outcome: .submit)
        )
        return response.session
    }

    public func recordBlocker(sessionId: UUID, note: String) async throws -> SessionRow {
        let response: SessionFinishResponse = try await api.callFunction(
            "session-finish",
            body: SessionFinishRequest(sessionId: sessionId, outcome: .blocker, blockerNote: note)
        )
        return response.session
    }

    /// The async-friendly summary: recently completed sessions first, live
    /// members second -- never an empty "working now" screen read as
    /// abandoned (Field Manual §01).
    public func squadActivity(squadId: UUID, lookbackHours: Int = 48) async throws -> SquadActivityResponse {
        try await api.callFunction("squad-activity", body: SquadActivityRequest(squadId: squadId, lookbackHours: lookbackHours))
    }
}
