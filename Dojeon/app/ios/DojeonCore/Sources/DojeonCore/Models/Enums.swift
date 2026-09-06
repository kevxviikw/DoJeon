import Foundation

// Mirrors the check constraints in supabase/migrations/0001_init.sql
// exactly -- raw values are the literal strings Postgres stores, so these
// enums decode server rows and encode request bodies without translation.

public enum Tier: String, Codable, CaseIterable, Sendable {
    case minimum, target, stretch
}

/// A missed check-in isn't one event -- see Field Manual §02.
public enum EventType: String, Codable, CaseIterable, Sendable {
    case completed, miss, unproven, rest, interrupted
}

public enum EvidenceTrustLabel: String, Codable, CaseIterable, Sendable {
    case selfReported = "self_reported"
    case attached
    case squadReviewed = "squad_reviewed"
}

public enum SessionStatus: String, Codable, CaseIterable, Sendable {
    case idle, active, submitted, blocked
}

public enum CheckinStatus: String, Codable, CaseIterable, Sendable {
    case pending, confirmed, rejected
}

public enum MissionStatus: String, Codable, CaseIterable, Sendable {
    case active, completed, abandoned
}

public enum SquadStatus: String, Codable, CaseIterable, Sendable {
    case active, disbanded
}

public enum AdjustmentTrigger: String, Codable, CaseIterable, Sendable {
    case missedSession = "missed_session"
    case repeatedMinimum = "repeated_minimum"
}

public struct Tradeoff: Codable, Sendable, Identifiable, Hashable {
    public enum Kind: String, Codable, Sendable {
        case extendDeadline = "extend_deadline"
        case cutScope = "cut_scope"
        case increaseDailyCapacity = "increase_daily_capacity"
    }

    public var id: String { kind.rawValue + description }
    public let kind: Kind
    public let description: String
    public let amount: Double

    public init(kind: Kind, description: String, amount: Double) {
        self.kind = kind
        self.description = description
        self.amount = amount
    }
}

public struct Workload: Codable, Sendable, Hashable {
    public var hours: Double
    public init(hours: Double) { self.hours = hours }
}

public struct TierPlan: Codable, Sendable, Hashable {
    public var minimum: Workload
    public var target: Workload
    public var stretch: Workload

    public init(minimum: Workload, target: Workload, stretch: Workload) {
        self.minimum = minimum
        self.target = target
        self.stretch = stretch
    }
}
