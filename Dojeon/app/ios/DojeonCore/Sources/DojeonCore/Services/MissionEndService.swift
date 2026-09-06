import Foundation

/// Mission end & data collection (amendment D). Without explicit consent,
/// nothing is collected -- `response.report` comes back `nil`.
public struct MissionEndService {
    private let api: APIClient
    public init(api: APIClient) { self.api = api }

    public func endMission(missionId: UUID, consent: Bool, patternNotes: [String: String]? = nil) async throws -> MissionEndResponse {
        try await api.callFunction("mission-end", body: MissionEndRequest(missionId: missionId, consent: consent, patternNotes: patternNotes))
    }
}
