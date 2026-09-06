import Foundation
import SwiftData

/// Local cache of a `missions` row -- the Forge output. `deliverable` is
/// always the checkable result validated server-side by
/// logic/forge.ts::checkDeliverable before the row ever existed.
@Model
public final class Mission {
    @Attribute(.unique) public var id: UUID
    public var userId: UUID
    public var squadId: UUID?
    public var title: String
    public var deliverable: String
    public var goalType: String
    public var deadline: Date
    public var durationDays: Int
    public var hoursAvailablePerDay: Double
    public var tiers: TierPlan
    public var tightestFeasibleTier: Tier?
    public var status: MissionStatus
    public var createdAt: Date

    public init(
        id: UUID,
        userId: UUID,
        squadId: UUID? = nil,
        title: String,
        deliverable: String,
        goalType: String,
        deadline: Date,
        durationDays: Int,
        hoursAvailablePerDay: Double,
        tiers: TierPlan,
        tightestFeasibleTier: Tier? = nil,
        status: MissionStatus = .active,
        createdAt: Date = .now
    ) {
        self.id = id
        self.userId = userId
        self.squadId = squadId
        self.title = title
        self.deliverable = deliverable
        self.goalType = goalType
        self.deadline = deadline
        self.durationDays = durationDays
        self.hoursAvailablePerDay = hoursAvailablePerDay
        self.tiers = tiers
        self.tightestFeasibleTier = tightestFeasibleTier
        self.status = status
        self.createdAt = createdAt
    }

    /// Days left until the deadline, floored at 0. Feeds the Today
    /// screen's deadline-status tile (Field Manual §02) -- never a streak.
    public func daysRemaining(asOf now: Date = .now) -> Int {
        max(0, Calendar.current.dateComponents([.day], from: now, to: deadline).day ?? 0)
    }
}
