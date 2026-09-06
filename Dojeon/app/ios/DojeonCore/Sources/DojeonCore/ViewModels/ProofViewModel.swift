import Foundation
import Observation
import SwiftData

/// Backs Proof: submit a check-in with honestly-labeled evidence, or vote
/// on a squad-mate's. Field Manual §01/§02, amendment C.
@Observable
@MainActor
public final class ProofViewModel {
    public private(set) var lastCheckin: CheckIn?
    public private(set) var lastEventType: EventType?
    public private(set) var lastTally: ApprovalTallyDTO?
    public private(set) var isLoading = false
    public var errorMessage: String?

    private let proofService: ProofService
    private let modelContext: ModelContext

    public init(proofService: ProofService, modelContext: ModelContext) {
        self.proofService = proofService
        self.modelContext = modelContext
    }

    public func submitCheckin(
        missionId: UUID,
        userId: UUID,
        sessionId: UUID? = nil,
        taskCompleted: Bool,
        evidenceSubmitted: Bool,
        plannedRest: Bool = false,
        technicalInterruption: Bool = false,
        tierHit: Tier? = nil,
        fileUrl: String? = nil,
        filePrivate: Bool = true
    ) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let response = try await proofService.submitCheckin(
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
            let row = response.checkin
            let checkin = CheckIn(
                id: row.id,
                missionId: row.missionId,
                userId: userId,
                sessionId: row.sessionId,
                checkinDate: row.checkinDate,
                taskCompleted: row.taskCompleted,
                evidenceSubmitted: row.evidenceSubmitted,
                plannedRest: row.plannedRest,
                technicalInterruption: row.technicalInterruption,
                tierHit: row.tierHit,
                eventType: row.eventType,
                evidenceTrustLabel: row.evidenceTrustLabel,
                filePrivate: row.filePrivate,
                fileURL: row.fileUrl,
                fileRemoved: row.fileRemoved,
                status: row.status,
                createdAt: row.createdAt
            )
            modelContext.insert(checkin)
            try modelContext.save()
            lastCheckin = checkin
            lastEventType = response.eventType
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    public func vote(checkinId: UUID, approve: Bool) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let response = try await proofService.vote(checkinId: checkinId, approve: approve)
            lastTally = response.tally
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
