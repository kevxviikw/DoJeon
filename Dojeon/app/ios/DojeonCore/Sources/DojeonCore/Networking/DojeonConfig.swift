import Foundation

/// Supabase project coordinates. Never hardcode these -- set
/// `SUPABASE_URL` / `SUPABASE_ANON_KEY` in the app target's Info.plist
/// (per build configuration; see ../../../README.md). The anon key is
/// public by Supabase's own design (RLS is what actually protects data),
/// unlike the Gemini/service-role keys, which never leave the Edge
/// Functions.
public struct DojeonConfig: Sendable {
    public let supabaseURL: URL
    public let supabaseAnonKey: String

    public init(supabaseURL: URL, supabaseAnonKey: String) {
        self.supabaseURL = supabaseURL
        self.supabaseAnonKey = supabaseAnonKey
    }

    public static func fromInfoPlist(bundle: Bundle = .main) -> DojeonConfig? {
        guard
            let urlString = bundle.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            let url = URL(string: urlString),
            let anonKey = bundle.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String
        else { return nil }
        return DojeonConfig(supabaseURL: url, supabaseAnonKey: anonKey)
    }
}
