import Foundation
import Observation
import SwiftData

/// Backs squad creation/joining, the squad-scoped leaderboard (amendment
/// A), and solo matching (amendment B).
@Observable
@MainActor
public final class SquadViewModel {
    public private(set) var squad: Squad?
    public private(set) var leaderboard: [RankedMemberDTO] = []
    public private(set) var soloMatches: [MatchResultDTO] = []
    public private(set) var isLoading = false
    public var errorMessage: String?

    private let squadService: SquadService
    private let leaderboardService: LeaderboardService
    private let soloMatchService: SoloMatchService
    private let modelContext: ModelContext

    public init(
        squadService: SquadService,
        leaderboardService: LeaderboardService,
        soloMatchService: SoloMatchService,
        modelContext: ModelContext
    ) {
        self.squadService = squadService
        self.leaderboardService = leaderboardService
        self.soloMatchService = soloMatchService
        self.modelContext = modelContext
    }

    public func createSquad(name: String, sizeMin: Int = 3, sizeMax: Int = 6) async {
        await run {
            let row = try await self.squadService.createSquad(name: name, sizeMin: sizeMin, sizeMax: sizeMax)
            self.squad = self.persist(row)
        }
    }

    public func joinSquad(inviteCode: String) async -> UUID? {
        var joinedId: UUID?
        await run { joinedId = try await self.squadService.joinSquad(inviteCode: inviteCode) }
        return joinedId
    }

    /// Squad-scoped only -- there is no cross-squad equivalent to load.
    public func loadLeaderboard(squadId: UUID) async {
        await run { self.leaderboard = try await self.leaderboardService.leaderboard(squadId: squadId) }
    }

    /// A search a solo member acts on, not an auto-match.
    public func findSoloMatches(topN: Int = 5) async {
        await run { self.soloMatches = try await self.soloMatchService.findMatches(topN: topN) }
    }

    private func persist(_ row: SquadRow) -> Squad {
        let squad = Squad(
            id: row.id,
            name: row.name,
            inviteCode: row.inviteCode,
            sizeMin: row.sizeMin,
            sizeMax: row.sizeMax,
            checkApprovalThreshold: row.checkApprovalThreshold,
            missedDayRemovalFraction: row.missedDayRemovalFraction,
            status: row.status,
            createdAt: row.createdAt
        )
        modelContext.insert(squad)
        try? modelContext.save()
        return squad
    }

    private func run(_ operation: @escaping () async throws -> Void) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do { try await operation() } catch { errorMessage = error.localizedDescription }
    }
}
