import Foundation
import Observation
import SwiftData

/// Backs the Forge screen: state a hard goal, get back a Minimum/Target/
/// Stretch plan and its feasibility, save it locally. Field Manual §01/§03.
@Observable
@MainActor
public final class ForgeViewModel {
    public private(set) var isLoading = false
    public private(set) var lastFeasibility: FeasibilityDTO?
    public private(set) var lastMission: Mission?
    public var errorMessage: String?

    private let forgeService: ForgeService
    private let modelContext: ModelContext

    public init(forgeService: ForgeService, modelContext: ModelContext) {
        self.forgeService = forgeService
        self.modelContext = modelContext
    }

    public func forge(
        title: String,
        deliverable: String,
        goalType: String,
        deadline: Date,
        hoursAvailablePerDay: Double,
        squadId: UUID? = nil
    ) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response = try await forgeService.forgeMission(
                title: title,
                deliverable: deliverable,
                goalType: goalType,
                deadline: deadline,
                hoursAvailablePerDay: hoursAvailablePerDay,
                squadId: squadId
            )
            lastFeasibility = response.feasibility

            let row = response.mission
            let mission = Mission(
                id: row.id,
                userId: row.userId,
                squadId: row.squadId,
                title: row.title,
                deliverable: row.deliverable,
                goalType: row.goalType,
                deadline: row.deadline,
                durationDays: row.durationDays,
                hoursAvailablePerDay: row.hoursAvailablePerDay,
                tiers: row.tiers,
                tightestFeasibleTier: row.tightestFeasibleTier,
                status: row.status,
                createdAt: row.createdAt
            )
            modelContext.insert(mission)
            try modelContext.save()
            lastMission = mission
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
