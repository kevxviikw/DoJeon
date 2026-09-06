import Foundation
import SwiftData

/// Local cache of an `adjustments` row. Both the original and proposed
/// snapshots are kept, whatever the member decides -- Field Manual §01,
/// "Adjust, the rules", rule 5.
@Model
public final class Adjustment {
    @Attribute(.unique) public var id: UUID
    public var missionId: UUID
    public var trigger: AdjustmentTrigger
    public var recoveryRoomFound: Bool
    public var tradeoffs: [Tradeoff]
    public var requiresApproval: Bool
    public var originalSnapshotData: Data // JSON-encoded mission snapshot; opaque here on purpose
    public var proposedSnapshotData: Data?
    public var approved: Bool?
    public var createdAt: Date
    public var decidedAt: Date?

    public init(
        id: UUID,
        missionId: UUID,
        trigger: AdjustmentTrigger,
        recoveryRoomFound: Bool,
        tradeoffs: [Tradeoff],
        requiresApproval: Bool,
        originalSnapshotData: Data,
        proposedSnapshotData: Data? = nil,
        approved: Bool? = nil,
        createdAt: Date = .now,
        decidedAt: Date? = nil
    ) {
        self.id = id
        self.missionId = missionId
        self.trigger = trigger
        self.recoveryRoomFound = recoveryRoomFound
        self.tradeoffs = tradeoffs
        self.requiresApproval = requiresApproval
        self.originalSnapshotData = originalSnapshotData
        self.proposedSnapshotData = proposedSnapshotData
        self.approved = approved
        self.createdAt = createdAt
        self.decidedAt = decidedAt
    }
}
