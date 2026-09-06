import Foundation
import SwiftData

@Model
public final class Milestone {
    @Attribute(.unique) public var id: UUID
    public var missionId: UUID
    public var tier: Tier
    public var title: String
    public var targetDate: Date?
    public var sortOrder: Int
    public var completedAt: Date?

    public init(
        id: UUID,
        missionId: UUID,
        tier: Tier,
        title: String,
        targetDate: Date? = nil,
        sortOrder: Int = 0,
        completedAt: Date? = nil
    ) {
        self.id = id
        self.missionId = missionId
        self.tier = tier
        self.title = title
        self.targetDate = targetDate
        self.sortOrder = sortOrder
        self.completedAt = completedAt
    }

    public var isCompleted: Bool { completedAt != nil }
}
