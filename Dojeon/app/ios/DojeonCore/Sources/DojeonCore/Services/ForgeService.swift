import Foundation

/// Forge -- turns a stated goal into a Minimum/Target/Stretch plan. All
/// the actual decomposition and feasibility math happens server-side
/// (forge-plan Edge Function); this is a thin, typed call site.
public struct ForgeService {
    private let api: APIClient
    public init(api: APIClient) { self.api = api }

    public func forgeMission(
        title: String,
        deliverable: String,
        goalType: String,
        deadline: Date,
        hoursAvailablePerDay: Double,
        squadId: UUID? = nil
    ) async throws -> ForgeResponse {
        try await api.callFunction(
            "forge-plan",
            body: ForgeRequest(
                title: title,
                deliverable: deliverable,
                goalType: goalType,
                deadline: deadline,
                hoursAvailablePerDay: hoursAvailablePerDay,
                squadId: squadId
            )
        )
    }
}
