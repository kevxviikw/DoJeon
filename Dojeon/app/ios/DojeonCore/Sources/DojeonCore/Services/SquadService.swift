import Foundation

/// Squad create/join. Leaving a squad needs no dedicated endpoint -- it's
/// a plain `delete from squad_members` the client issues directly against
/// PostgREST (Field Manual §01: "leaving is always available and needs no
/// explanation").
public struct SquadService {
    private let api: APIClient
    public init(api: APIClient) { self.api = api }

    public func createSquad(name: String, sizeMin: Int = 3, sizeMax: Int = 6) async throws -> SquadRow {
        let response: SquadCreateResponse = try await api.callFunction(
            "squad-create",
            body: SquadCreateRequest(name: name, sizeMin: sizeMin, sizeMax: sizeMax)
        )
        return response.squad
    }

    public func joinSquad(inviteCode: String) async throws -> UUID {
        let response: SquadJoinResponse = try await api.callFunction("squad-join", body: SquadJoinRequest(inviteCode: inviteCode))
        return response.squadId
    }
}
