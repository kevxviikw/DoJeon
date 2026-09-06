import Foundation
import Observation
import SwiftData

/// Backs the Today screen: next deliverable, milestone progress, deadline
/// status, next session -- never a streak count (Field Manual §02). Pure
/// state + local-cache reads; no view code here for you to design over.
@Observable
@MainActor
public final class TodayViewModel {
    public private(set) var mission: Mission?
    public private(set) var milestoneProgress: (completed: Int, total: Int) = (0, 0)
    public private(set) var daysRemaining: Int = 0
    public private(set) var recentEvents: [CheckIn] = []
    public var errorMessage: String?

    private let modelContext: ModelContext

    public init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    /// Loads the member's most recent active mission and its milestones
    /// from the local SwiftData cache (kept current by ForgeViewModel /
    /// PushViewModel / ProofViewModel as they call the backend).
    public func load(userId: UUID) {
        do {
            var missionDescriptor = FetchDescriptor<Mission>(
                predicate: #Predicate { $0.userId == userId && $0.status == MissionStatus.active },
                sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
            )
            missionDescriptor.fetchLimit = 1
            let activeMission = try modelContext.fetch(missionDescriptor).first
            mission = activeMission
            daysRemaining = activeMission?.daysRemaining() ?? 0

            if let missionId = activeMission?.id {
                let milestones = try modelContext.fetch(
                    FetchDescriptor<Milestone>(predicate: #Predicate { $0.missionId == missionId })
                )
                milestoneProgress = (milestones.filter(\.isCompleted).count, milestones.count)

                var checkinDescriptor = FetchDescriptor<CheckIn>(
                    predicate: #Predicate { $0.missionId == missionId },
                    sortBy: [SortDescriptor(\.checkinDate, order: .reverse)]
                )
                checkinDescriptor.fetchLimit = 14
                recentEvents = try modelContext.fetch(checkinDescriptor)
            } else {
                milestoneProgress = (0, 0)
                recentEvents = []
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// "On track" / "behind" text for the deadline-status tile -- derived
    /// from Target-tier milestone progress vs. how much of the mission's
    /// duration has elapsed, not from a streak.
    public var deadlineStatusText: String {
        guard let mission else { return "No active mission" }
        let elapsedFraction = 1 - Double(daysRemaining) / Double(max(mission.durationDays, 1))
        let progressFraction = milestoneProgress.total > 0
            ? Double(milestoneProgress.completed) / Double(milestoneProgress.total)
            : 0
        if daysRemaining <= 0 {
            return "Deadline reached"
        }
        return progressFraction + 0.1 >= elapsedFraction
            ? "On track — \(daysRemaining) day\(daysRemaining == 1 ? "" : "s") left"
            : "Behind — \(daysRemaining) day\(daysRemaining == 1 ? "" : "s") left"
    }
}
