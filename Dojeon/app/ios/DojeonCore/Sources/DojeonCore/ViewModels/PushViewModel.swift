import Foundation
import Observation
import SwiftData

/// Backs the Push flow: choose task/output, start the timer, optionally
/// join the squad live, finish by submitting or recording a blocker, see
/// the async-friendly summary. Field Manual §01 ("Push, in practice").
@Observable
@MainActor
public final class PushViewModel {
    public private(set) var activeSession: WorkSession?
    public private(set) var recentlyCompleted: [CompletedSessionEntryDTO] = []
    public private(set) var liveNow: [LiveSessionEntryDTO] = []
    public private(set) var isLoading = false
    public var errorMessage: String?

    private let pushService: PushService
    private let modelContext: ModelContext

    public init(pushService: PushService, modelContext: ModelContext) {
        self.pushService = pushService
        self.modelContext = modelContext
    }

    public func startSession(
        missionId: UUID,
        userId: UUID,
        taskId: UUID? = nil,
        taskTitle: String,
        outputDescription: String,
        squadId: UUID? = nil,
        liveVisible: Bool = false
    ) async {
        await run {
            let row = try await self.pushService.startSession(
                missionId: missionId,
                taskId: taskId,
                taskTitle: taskTitle,
                outputDescription: outputDescription,
                squadId: squadId,
                liveVisible: liveVisible
            )
            self.activeSession = self.persist(row, userId: userId)
        }
    }

    public func submitOutput() async {
        guard let sessionId = activeSession?.id else { return }
        await run {
            let row = try await self.pushService.submitOutput(sessionId: sessionId)
            self.activeSession = self.persist(row, userId: row.userId)
        }
    }

    public func recordBlocker(note: String) async {
        guard let sessionId = activeSession?.id else { return }
        await run {
            let row = try await self.pushService.recordBlocker(sessionId: sessionId, note: note)
            self.activeSession = self.persist(row, userId: row.userId)
        }
    }

    public func loadSquadActivity(squadId: UUID, lookbackHours: Int = 48) async {
        await run {
            let response = try await self.pushService.squadActivity(squadId: squadId, lookbackHours: lookbackHours)
            self.recentlyCompleted = response.recentlyCompleted
            self.liveNow = response.liveNow
        }
    }

    private func persist(_ row: SessionRow, userId: UUID) -> WorkSession {
        let session = WorkSession(
            id: row.id,
            missionId: row.missionId,
            userId: userId,
            taskId: row.taskId,
            sessionRoundId: row.sessionRoundId,
            taskTitle: row.taskTitle,
            outputDescription: row.outputDescription,
            status: row.status,
            liveVisible: row.liveVisible,
            startedAt: row.startedAt,
            endedAt: row.endedAt,
            blockerNote: row.blockerNote
        )
        modelContext.insert(session)
        try? modelContext.save()
        return session
    }

    private func run(_ operation: @escaping () async throws -> Void) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do { try await operation() } catch { errorMessage = error.localizedDescription }
    }
}
