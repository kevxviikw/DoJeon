import Foundation

// Request/response shapes for every Edge Function in supabase/functions.
// Property names are plain camelCase matching each function's TypeScript
// interface (requests) or its Postgres row / logic-module output
// (responses, decoded via `.convertFromSnakeCase` -- see APIClient.swift).

// MARK: - forge-plan

public struct ForgeRequest: Encodable, Sendable {
    public var title: String
    public var deliverable: String
    public var goalType: String
    public var deadline: Date
    public var hoursAvailablePerDay: Double
    public var squadId: UUID?

    public init(title: String, deliverable: String, goalType: String, deadline: Date, hoursAvailablePerDay: Double, squadId: UUID? = nil) {
        self.title = title
        self.deliverable = deliverable
        self.goalType = goalType
        self.deadline = deadline
        self.hoursAvailablePerDay = hoursAvailablePerDay
        self.squadId = squadId
    }
}

public struct MissionRow: Decodable, Sendable {
    public let id: UUID
    public let userId: UUID
    public let squadId: UUID?
    public let title: String
    public let deliverable: String
    public let goalType: String
    public let deadline: Date
    public let durationDays: Int
    public let hoursAvailablePerDay: Double
    public let tiers: TierPlan
    public let tightestFeasibleTier: Tier?
    public let status: MissionStatus
    public let createdAt: Date
}

public struct FeasibilityDTO: Decodable, Sendable {
    public struct Feasible: Decodable, Sendable {
        public let minimum: Bool
        public let target: Bool
        public let stretch: Bool
    }
    public let feasible: Feasible
    public let tightestFeasibleTier: Tier?
    public let tradeoffs: [Tradeoff]
}

public struct ForgeResponse: Decodable, Sendable {
    public let mission: MissionRow
    public let feasibility: FeasibilityDTO
}

// MARK: - checkin-submit / checkin-approve

public struct CheckinSubmitRequest: Encodable, Sendable {
    public var missionId: UUID
    public var sessionId: UUID?
    public var taskCompleted: Bool
    public var evidenceSubmitted: Bool
    public var plannedRest: Bool = false
    public var technicalInterruption: Bool = false
    public var tierHit: Tier?
    public var fileUrl: String?
    public var filePrivate: Bool = true
    public var checkinDate: Date?

    public init(
        missionId: UUID,
        sessionId: UUID? = nil,
        taskCompleted: Bool,
        evidenceSubmitted: Bool,
        plannedRest: Bool = false,
        technicalInterruption: Bool = false,
        tierHit: Tier? = nil,
        fileUrl: String? = nil,
        filePrivate: Bool = true,
        checkinDate: Date? = nil
    ) {
        self.missionId = missionId
        self.sessionId = sessionId
        self.taskCompleted = taskCompleted
        self.evidenceSubmitted = evidenceSubmitted
        self.plannedRest = plannedRest
        self.technicalInterruption = technicalInterruption
        self.tierHit = tierHit
        self.fileUrl = fileUrl
        self.filePrivate = filePrivate
        self.checkinDate = checkinDate
    }
}

public struct CheckinRow: Decodable, Sendable {
    public let id: UUID
    public let missionId: UUID
    public let userId: UUID
    public let sessionId: UUID?
    public let checkinDate: Date
    public let taskCompleted: Bool
    public let evidenceSubmitted: Bool
    public let plannedRest: Bool
    public let technicalInterruption: Bool
    public let tierHit: Tier?
    public let eventType: EventType
    public let evidenceTrustLabel: EvidenceTrustLabel
    public let filePrivate: Bool
    public let fileUrl: String?
    public let fileRemoved: Bool
    public let status: CheckinStatus
    public let createdAt: Date
}

public struct CheckinSubmitResponse: Decodable, Sendable {
    public let checkin: CheckinRow
    public let eventType: EventType
}

public struct CheckinApproveRequest: Encodable, Sendable {
    public var checkinId: UUID
    public var approve: Bool
    public init(checkinId: UUID, approve: Bool) {
        self.checkinId = checkinId
        self.approve = approve
    }
}

public struct ApprovalTallyDTO: Decodable, Sendable {
    public let approvals: Int
    public let votesCast: Int
    public let eligibleVoters: Int
    public let approvalRate: Double
    public let confirmed: Bool
}

public struct CheckinApproveResponse: Decodable, Sendable {
    public let tally: ApprovalTallyDTO
    public let status: CheckinStatus
}

// MARK: - adjust-plan / adjustment-decide

public struct AdjustPlanRequest: Encodable, Sendable {
    public var missionId: UUID
    public init(missionId: UUID) { self.missionId = missionId }
}

public struct AdjustmentRow: Decodable, Sendable {
    public let id: UUID
    public let missionId: UUID
    public let trigger: AdjustmentTrigger
    public let recoveryRoomFound: Bool
    public let tradeoffs: [Tradeoff]
    public let requiresApproval: Bool
    public let approved: Bool?
    public let createdAt: Date
    public let decidedAt: Date?
}

public struct AdjustmentProposalDTO: Decodable, Sendable {
    public let recoveryRoomFound: Bool
    public let tradeoffs: [Tradeoff]
    public let requiresApproval: Bool
}

public struct AdjustPlanResponse: Decodable, Sendable {
    public let adjustment: AdjustmentRow
    public let proposal: AdjustmentProposalDTO
    public let repeatedMinimumOnly: Bool
}

public struct AdjustmentDecideRequest: Encodable, Sendable {
    public var adjustmentId: UUID
    public var approved: Bool
    public init(adjustmentId: UUID, approved: Bool) {
        self.adjustmentId = adjustmentId
        self.approved = approved
    }
}

public struct AdjustmentDecideResponse: Decodable, Sendable {
    public let approved: Bool
}

// MARK: - squad-create / squad-join / squad-activity

public struct SquadCreateRequest: Encodable, Sendable {
    public var name: String
    public var sizeMin: Int = 3
    public var sizeMax: Int = 6
    public init(name: String, sizeMin: Int = 3, sizeMax: Int = 6) {
        self.name = name
        self.sizeMin = sizeMin
        self.sizeMax = sizeMax
    }
}

public struct SquadRow: Decodable, Sendable {
    public let id: UUID
    public let name: String
    public let inviteCode: String
    public let sizeMin: Int
    public let sizeMax: Int
    public let checkApprovalThreshold: Double
    public let missedDayRemovalFraction: Double
    public let status: SquadStatus
    public let createdAt: Date
}

public struct SquadCreateResponse: Decodable, Sendable { public let squad: SquadRow }

public struct SquadJoinRequest: Encodable, Sendable {
    public var inviteCode: String
    public init(inviteCode: String) { self.inviteCode = inviteCode }
}

public struct SquadJoinResponse: Decodable, Sendable { public let squadId: UUID }

public struct SquadActivityRequest: Encodable, Sendable {
    public var squadId: UUID
    public var lookbackHours: Int?
    public init(squadId: UUID, lookbackHours: Int? = nil) {
        self.squadId = squadId
        self.lookbackHours = lookbackHours
    }
}

public struct CompletedSessionEntryDTO: Decodable, Sendable, Identifiable {
    public var id: String { userId.uuidString + endedAt.description }
    public let userId: UUID
    public let taskTitle: String
    public let status: SessionStatus
    public let endedAt: Date
}

public struct LiveSessionEntryDTO: Decodable, Sendable, Identifiable {
    public var id: String { userId.uuidString + startedAt.description }
    public let userId: UUID
    public let taskTitle: String
    public let startedAt: Date
}

public struct SquadActivityResponse: Decodable, Sendable {
    public let recentlyCompleted: [CompletedSessionEntryDTO]
    public let liveNow: [LiveSessionEntryDTO]
}

// MARK: - session-start / session-join / session-finish

public struct SessionStartRequest: Encodable, Sendable {
    public var missionId: UUID
    public var taskId: UUID?
    public var taskTitle: String
    public var outputDescription: String
    public var squadId: UUID?
    public var liveVisible: Bool = false

    public init(missionId: UUID, taskId: UUID? = nil, taskTitle: String, outputDescription: String, squadId: UUID? = nil, liveVisible: Bool = false) {
        self.missionId = missionId
        self.taskId = taskId
        self.taskTitle = taskTitle
        self.outputDescription = outputDescription
        self.squadId = squadId
        self.liveVisible = liveVisible
    }
}

public struct SessionRow: Decodable, Sendable {
    public let id: UUID
    public let missionId: UUID
    public let userId: UUID
    public let taskId: UUID?
    public let sessionRoundId: UUID?
    public let taskTitle: String
    public let outputDescription: String
    public let status: SessionStatus
    public let liveVisible: Bool
    public let startedAt: Date
    public let endedAt: Date?
    public let blockerNote: String?
}

public struct SessionStartResponse: Decodable, Sendable { public let session: SessionRow }

public struct SessionJoinRequest: Encodable, Sendable {
    public var sessionRoundId: UUID
    public var missionId: UUID
    public var taskId: UUID?
    public var taskTitle: String
    public var outputDescription: String
    public var liveVisible: Bool = true

    public init(sessionRoundId: UUID, missionId: UUID, taskId: UUID? = nil, taskTitle: String, outputDescription: String, liveVisible: Bool = true) {
        self.sessionRoundId = sessionRoundId
        self.missionId = missionId
        self.taskId = taskId
        self.taskTitle = taskTitle
        self.outputDescription = outputDescription
        self.liveVisible = liveVisible
    }
}

public struct SessionJoinResponse: Decodable, Sendable { public let session: SessionRow }

public struct SessionFinishRequest: Encodable, Sendable {
    public enum Outcome: String, Encodable, Sendable { case submit, blocker }
    public var sessionId: UUID
    public var outcome: Outcome
    public var blockerNote: String?
    public init(sessionId: UUID, outcome: Outcome, blockerNote: String? = nil) {
        self.sessionId = sessionId
        self.outcome = outcome
        self.blockerNote = blockerNote
    }
}

public struct SessionFinishResponse: Decodable, Sendable { public let session: SessionRow }

// MARK: - leaderboard

public struct LeaderboardRequest: Encodable, Sendable {
    public var squadId: UUID
    public init(squadId: UUID) { self.squadId = squadId }
}

public struct RankedMemberDTO: Decodable, Sendable, Identifiable {
    public var id: UUID { userId }
    public let userId: UUID
    public let confirmedCheckins: Int
    public let scheduledCheckins: Int
    public let milestonesCompleted: Int
    public let milestonesTotal: Int
    public let score: Double
    public let rank: Int
}

public struct LeaderboardResponse: Decodable, Sendable { public let leaderboard: [RankedMemberDTO] }

// MARK: - solo-match

public struct SoloMatchRequest: Encodable, Sendable {
    public var topN: Int?
    public init(topN: Int? = nil) { self.topN = topN }
}

public struct MatchResultDTO: Decodable, Sendable, Identifiable {
    public var id: UUID { userId }
    public let userId: UUID
    public let score: Double
}

public struct SoloMatchResponse: Decodable, Sendable { public let matches: [MatchResultDTO] }

// MARK: - mission-end

public struct MissionEndRequest: Encodable, Sendable {
    public var missionId: UUID
    public var consent: Bool
    public var patternNotes: [String: String]?
    public init(missionId: UUID, consent: Bool, patternNotes: [String: String]? = nil) {
        self.missionId = missionId
        self.consent = consent
        self.patternNotes = patternNotes
    }
}

public struct MissionEndReportDTO: Decodable, Sendable {
    public let achievementScore: Double
    public let consistencyScore: Double
}

public struct MissionEndResponse: Decodable, Sendable {
    public let collected: Bool
    public let report: MissionEndReportDTO?
    public let squadDisbanded: Bool
}
