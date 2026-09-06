import Foundation

public struct SupabaseSession: Sendable {
    public let accessToken: String
    public let refreshToken: String
    public let expiresAt: Date
}

private struct TokenResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Double

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
    }
}

/// Exchanges a Sign in with Apple identity token for a Supabase session
/// and refreshes it as needed -- Field Manual §04: "Auth -- Sign in with
/// Apple -> Supabase". Talks to Supabase's GoTrue REST API directly (no
/// supabase-swift dependency, to keep this package dependency-free).
public actor SupabaseAuthClient {
    private let config: DojeonConfig
    private var session: SupabaseSession?

    public init(config: DojeonConfig) {
        self.config = config
        if let access = KeychainStore.get(KeychainKey.accessToken),
           let refresh = KeychainStore.get(KeychainKey.refreshToken) {
            // Expiry is unknown after a cold launch -- treat it as already
            // expired so the first call refreshes rather than risking a
            // silently stale token.
            session = SupabaseSession(accessToken: access, refreshToken: refresh, expiresAt: .distantPast)
        }
    }

    public var isSignedIn: Bool { session != nil }

    public func signIn(appleIdentityToken: String) async throws {
        let newSession = try await exchange(grantType: "id_token", body: [
            "provider": "apple",
            "id_token": appleIdentityToken,
        ])
        store(newSession)
    }

    public func signOut() {
        session = nil
        KeychainStore.remove(KeychainKey.accessToken)
        KeychainStore.remove(KeychainKey.refreshToken)
    }

    /// Returns a valid access token, transparently refreshing first if the
    /// cached one is expired or about to be.
    public func currentAccessToken() async throws -> String {
        guard let session else { throw DojeonAuthError.notSignedIn }
        if session.expiresAt.timeIntervalSinceNow > 60 {
            return session.accessToken
        }
        let refreshed = try await exchange(grantType: "refresh_token", body: ["refresh_token": session.refreshToken])
        store(refreshed)
        return refreshed.accessToken
    }

    private func exchange(grantType: String, body: [String: String]) async throws -> SupabaseSession {
        var components = URLComponents(url: config.supabaseURL.appendingPathComponent("auth/v1/token"), resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "grant_type", value: grantType)]
        guard let url = components?.url else { throw DojeonAuthError.requestFailed("Could not build auth URL.") }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw DojeonAuthError.requestFailed(String(data: data, encoding: .utf8) ?? "Unknown auth error.")
        }
        let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
        return SupabaseSession(
            accessToken: decoded.accessToken,
            refreshToken: decoded.refreshToken,
            expiresAt: Date().addingTimeInterval(decoded.expiresIn)
        )
    }

    private func store(_ newSession: SupabaseSession) {
        session = newSession
        KeychainStore.set(newSession.accessToken, for: KeychainKey.accessToken)
        KeychainStore.set(newSession.refreshToken, for: KeychainKey.refreshToken)
    }
}

public enum DojeonAuthError: Error, LocalizedError {
    case notSignedIn
    case requestFailed(String)

    public var errorDescription: String? {
        switch self {
        case .notSignedIn: return "Not signed in."
        case .requestFailed(let body): return "Auth request failed: \(body)"
        }
    }
}
