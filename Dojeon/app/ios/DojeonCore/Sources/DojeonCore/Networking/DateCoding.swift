import Foundation

// Postgres sends two different date shapes over PostgREST/Edge Functions:
// full timestamps for `timestamptz` columns ("2026-09-05T10:00:00+00:00")
// and bare dates for `date` columns ("2026-10-15", e.g. `deadline`,
// `checkin_date`, `target_date`). Foundation's built-in `.iso8601` date
// strategy only handles the first shape, so DojeonCore's JSON coders use
// this custom one that tries both.
enum DojeonDateCoding {
    static let timestamp: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let timestampNoFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static let dateOnly: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .iso8601)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static func decode(_ decoder: Decoder) throws -> Date {
        let container = try decoder.singleValueContainer()
        let string = try container.decode(String.self)
        if let date = timestamp.date(from: string) { return date }
        if let date = timestampNoFraction.date(from: string) { return date }
        if let date = dateOnly.date(from: string) { return date }
        throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unrecognized date format: \(string)")
    }

    /// Encodes every `Date` as a full timestamp -- Postgres truncates that
    /// down to just the date for `date`-typed columns without complaint,
    /// so one encoding strategy covers both column shapes.
    static func encode(_ date: Date, encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(timestamp.string(from: date))
    }
}
