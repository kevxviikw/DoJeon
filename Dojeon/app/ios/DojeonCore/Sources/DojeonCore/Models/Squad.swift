import Foundation
import SwiftData

/// Local cache of a `squads` row, including the two adjustable amendment-C
/// parameters (approval threshold, removal fraction) so UI can display
/// them without a round trip.
@Model
public final class Squad {
    @Attribute(.unique) public var id: UUID
    public var name: String
    public var inviteCode: String
    public var sizeMin: Int
    public var sizeMax: Int
    public var checkApprovalThreshold: Double
    public var missedDayRemovalFraction: Double
    public var status: SquadStatus
    public var createdAt: Date
    public var disbandedAt: Date?

    public init(
        id: UUID,
        name: String,
        inviteCode: String,
        sizeMin: Int = 3,
        sizeMax: Int = 6,
        checkApprovalThreshold: Double = 0.75,
        missedDayRemovalFraction: Double = 1.0 / 3.0,
        status: SquadStatus = .active,
        createdAt: Date = .now,
        disbandedAt: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.inviteCode = inviteCode
        self.sizeMin = sizeMin
        self.sizeMax = sizeMax
        self.checkApprovalThreshold = checkApprovalThreshold
        self.missedDayRemovalFraction = missedDayRemovalFraction
        self.status = status
        self.createdAt = createdAt
        self.disbandedAt = disbandedAt
    }
}
