import Foundation

/// Calls DoJeon's Supabase Edge Functions over HTTPS -- no SDK dependency.
/// Every call carries the caller's bearer token, so Postgres RLS (see
/// supabase/migrations/0001_init.sql) enforces every privacy/visibility
/// rule server-side; this client does not, and should not, try to
/// duplicate that logic on-device.
public final class APIClient {
    private let config: DojeonConfig
    private let auth: SupabaseAuthClient
    private let session: URLSession

    public init(config: DojeonConfig, auth: SupabaseAuthClient, session: URLSession = .shared) {
        self.config = config
        self.auth = auth
        self.session = session
    }

    /// `POST {supabaseURL}/functions/v1/{name}` with a JSON-encoded body,
    /// decoding the JSON response as `Response`.
    public func callFunction<Body: Encodable, Response: Decodable>(
        _ name: String,
        body: Body
    ) async throws -> Response {
        let url = config.supabaseURL.appendingPathComponent("functions/v1/\(name)")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        let token = try await auth.currentAccessToken()
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try Self.encoder.encode(body)

        let (data, response) = try await session.data(for: request)
        try Self.validate(response, data: data)
        return try Self.decoder.decode(Response.self, from: data)
    }

    /// Same as above, for functions that take no request body.
    public func callFunction<Response: Decodable>(_ name: String) async throws -> Response {
        try await callFunction(name, body: EmptyBody())
    }

    private static func validate(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else {
            throw APIError.transport("No HTTP response.")
        }
        guard (200..<300).contains(http.statusCode) else {
            if let decoded = try? decoder.decode(APIErrorBody.self, from: data) {
                throw APIError.server(status: http.statusCode, message: decoded.error)
            }
            throw APIError.server(status: http.statusCode, message: String(data: data, encoding: .utf8) ?? "")
        }
    }

    // Requests use plain camelCase property names matching each Edge
    // Function's TypeScript request interface exactly (e.g.
    // `hoursAvailablePerDay`) -- no key conversion needed on encode.
    // Responses mix raw Postgres rows (snake_case columns) with
    // logic-module output that's already camelCase; `.convertFromSnakeCase`
    // handles both, since a key with no underscore just passes through
    // unchanged.
    static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .custom(DojeonDateCoding.encode)
        return encoder
    }()

    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .custom(DojeonDateCoding.decode)
        return decoder
    }()
}

private struct EmptyBody: Encodable {}
private struct APIErrorBody: Decodable { let error: String }

public enum APIError: Error, LocalizedError {
    case transport(String)
    case server(status: Int, message: String)

    public var errorDescription: String? {
        switch self {
        case .transport(let message): return message
        case .server(let status, let message): return "Server error \(status): \(message)"
        }
    }
}
