import Foundation
import SwiftData

@Model
public final class SquadMember {
    public var squadId: UUID
    public var userId: UUID
    public var displayName: String
    public var joinedAt: Date
    public var missedDays: Int
    public var removedAt: Date?
    public var removalReason: String?

    public init(
        squadId: UUID,
        userId: UUID,
        displayName: String,
        joinedAt: Date = .now,
        missedDays: Int = 0,
        removedAt: Date? = nil,
        removalReason: String? = nil
    ) {
        self.squadId = squadId
        self.userId = userId
        self.displayName = displayName
        self.joinedAt = joinedAt
        self.missedDays = missedDays
        self.removedAt = removedAt
        self.removalReason = removalReason
    }

    public var isActive: Bool { removedAt == nil }
}
