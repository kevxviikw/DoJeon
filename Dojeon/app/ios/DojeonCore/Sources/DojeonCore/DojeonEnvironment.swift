import Foundation
import SwiftData

/// Every SwiftData model DojeonCore defines, in one place -- pass this to
/// `ModelContainer(for:)` in the app target's `@main` entry point.
public enum DojeonSchema {
    public static let models: [any PersistentModel.Type] = [
        Profile.self,
        Squad.self,
        SquadMember.self,
        Mission.self,
        Milestone.self,
        WorkSession.self,
        CheckIn.self,
        Adjustment.self,
        MissionEndReport.self,
    ]
}

/// Composition root: wires config -> auth -> API client -> every service,
/// so the app target doesn't have to know each service's constructor.
/// Build one of these once (e.g. in your `@main App`'s `init`) and hand
/// its services to your ViewModels.
@MainActor
public final class DojeonEnvironment {
    public let config: DojeonConfig
    public let auth: SupabaseAuthClient
    public let api: APIClient

    public let forge: ForgeService
    public let push: PushService
    public let proof: ProofService
    public let adjust: AdjustService
    public let squad: SquadService
    public let leaderboard: LeaderboardService
    public let soloMatch: SoloMatchService
    public let missionEnd: MissionEndService

    public init(config: DojeonConfig) {
        self.config = config
        let auth = SupabaseAuthClient(config: config)
        self.auth = auth
        let api = APIClient(config: config, auth: auth)
        self.api = api

        forge = ForgeService(api: api)
        push = PushService(api: api)
        proof = ProofService(api: api)
        adjust = AdjustService(api: api)
        squad = SquadService(api: api)
        leaderboard = LeaderboardService(api: api)
        soloMatch = SoloMatchService(api: api)
        missionEnd = MissionEndService(api: api)
    }
}
