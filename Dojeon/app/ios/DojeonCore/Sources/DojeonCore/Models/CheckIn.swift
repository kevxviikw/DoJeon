import Foundation
import SwiftData

/// Local cache of a `checkins` row. Privacy is enforced server-side by RLS
/// (fileURL simply won't come back from the API when private and you're
/// not the owner) -- this model just carries whatever the server sent.
@Model
public final class CheckIn {
    @Attribute(.unique) public var id: UUID
    public var missionId: UUID
    public var userId: UUID
    public var sessionId: UUID?
    public var checkinDate: Date
    public var taskCompleted: Bool
    public var evidenceSubmitted: Bool
    public var plannedRest: Bool
    public var technicalInterruption: Bool
    public var tierHit: Tier?
    public var eventType: EventType
    public var evidenceTrustLabel: EvidenceTrustLabel
    public var filePrivate: Bool
    public var fileURL: String?
    public var fileRemoved: Bool
    public var status: CheckinStatus
    public var createdAt: Date

    public init(
        id: UUID,
        missionId: UUID,
        userId: UUID,
        sessionId: UUID? = nil,
        checkinDate: Date,
        taskCompleted: Bool,
        evidenceSubmitted: Bool,
        plannedRest: Bool = false,
        technicalInterruption: Bool = false,
        tierHit: Tier? = nil,
        eventType: EventType,
        evidenceTrustLabel: EvidenceTrustLabel = .selfReported,
        filePrivate: Bool = true,
        fileURL: String? = nil,
        fileRemoved: Bool = false,
        status: CheckinStatus = .pending,
        createdAt: Date = .now
    ) {
        self.id = id
        self.missionId = missionId
        self.userId = userId
        self.sessionId = sessionId
        self.checkinDate = checkinDate
        self.taskCompleted = taskCompleted
        self.evidenceSubmitted = evidenceSubmitted
        self.plannedRest = plannedRest
        self.technicalInterruption = technicalInterruption
        self.tierHit = tierHit
        self.eventType = eventType
        self.evidenceTrustLabel = evidenceTrustLabel
        self.filePrivate = filePrivate
        self.fileURL = fileURL
        self.fileRemoved = fileRemoved
        self.status = status
        self.createdAt = createdAt
    }

    /// Completion status is always visible; only the file itself is
    /// opt-in (Field Manual §01, "Proof, in practice").
    public var isFileVisible: Bool {
        !filePrivate && !fileRemoved && fileURL != nil
    }
}
