import Foundation

/// Squad-scoped leaderboard (amendment A) -- never cross-squad, by design.
public struct LeaderboardService {
    private let api: APIClient
    public init(api: APIClient) { self.api = api }

    public func leaderboard(squadId: UUID) async throws -> [RankedMemberDTO] {
        let response: LeaderboardResponse = try await api.callFunction("leaderboard", body: LeaderboardRequest(squadId: squadId))
        return response.leaderboard
    }
}
