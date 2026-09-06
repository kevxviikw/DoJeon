import Foundation
import SwiftData

/// Local cache of a `mission_end_reports` row (amendment D). Only ever
/// exists locally if the member actually consented -- the server never
/// creates or returns one otherwise.
@Model
public final class MissionEndReport {
    @Attribute(.unique) public var id: UUID
    public var missionId: UUID
    public var userId: UUID
    public var achievementScore: Double
    public var consistencyScore: Double
    public var createdAt: Date

    public init(
        id: UUID,
        missionId: UUID,
        userId: UUID,
        achievementScore: Double,
        consistencyScore: Double,
        createdAt: Date = .now
    ) {
        self.id = id
        self.missionId = missionId
        self.userId = userId
        self.achievementScore = achievementScore
        self.consistencyScore = consistencyScore
        self.createdAt = createdAt
    }
}
