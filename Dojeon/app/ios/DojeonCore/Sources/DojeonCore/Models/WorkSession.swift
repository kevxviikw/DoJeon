import Foundation
import SwiftData

/// Local cache of a `sessions` row -- the Push activity: choose task,
/// start timer, optionally join live, submit or record a blocker. Field
/// Manual §01 ("Push, in practice"). Named WorkSession, not Session, to
/// avoid colliding with Swift/SwiftData's own `Session`-flavored types.
@Model
public final class WorkSession {
    @Attribute(.unique) public var id: UUID
    public var missionId: UUID
    public var userId: UUID
    public var taskId: UUID?
    public var sessionRoundId: UUID?
    public var taskTitle: String
    public var outputDescription: String
    public var status: SessionStatus
    public var liveVisible: Bool
    public var startedAt: Date
    public var endedAt: Date?
    public var blockerNote: String?

    public init(
        id: UUID,
        missionId: UUID,
        userId: UUID,
        taskId: UUID? = nil,
        sessionRoundId: UUID? = nil,
        taskTitle: String,
        outputDescription: String,
        status: SessionStatus = .active,
        liveVisible: Bool = false,
        startedAt: Date = .now,
        endedAt: Date? = nil,
        blockerNote: String? = nil
    ) {
        self.id = id
        self.missionId = missionId
        self.userId = userId
        self.taskId = taskId
        self.sessionRoundId = sessionRoundId
        self.taskTitle = taskTitle
        self.outputDescription = outputDescription
        self.status = status
        self.liveVisible = liveVisible
        self.startedAt = startedAt
        self.endedAt = endedAt
        self.blockerNote = blockerNote
    }
}
