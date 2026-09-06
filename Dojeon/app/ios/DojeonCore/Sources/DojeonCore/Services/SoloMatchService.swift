import Foundation

/// Solo matching (amendment B) -- surfaces candidate squad-mates by
/// goal-type/pace similarity. A search the member acts on, not an
/// auto-match.
public struct SoloMatchService {
    private let api: APIClient
    public init(api: APIClient) { self.api = api }

    public func findMatches(topN: Int = 5) async throws -> [MatchResultDTO] {
        let response: SoloMatchResponse = try await api.callFunction("solo-match", body: SoloMatchRequest(topN: topN))
        return response.matches
    }
}
