import XCTest
@testable import DojeonCore

final class DateCodingTests: XCTestCase {
    struct Wrapper: Codable {
        var date: Date
    }

    func testDecodesFullTimestamp() throws {
        let json = #"{"date":"2026-09-05T10:00:00Z"}"#.data(using: .utf8)!
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom(DojeonDateCoding.decode)
        let wrapper = try decoder.decode(Wrapper.self, from: json)
        XCTAssertEqual(Calendar(identifier: .iso8601).component(.year, from: wrapper.date), 2026)
    }

    func testDecodesDateOnlyColumn() throws {
        // Postgres `date` columns (deadline, checkin_date, target_date)
        // serialize with no time component at all.
        let json = #"{"date":"2026-10-15"}"#.data(using: .utf8)!
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom(DojeonDateCoding.decode)
        let wrapper = try decoder.decode(Wrapper.self, from: json)
        var calendar = Calendar(identifier: .iso8601)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        XCTAssertEqual(calendar.component(.day, from: wrapper.date), 15)
        XCTAssertEqual(calendar.component(.month, from: wrapper.date), 10)
    }

    func testEncodeThenDecodeRoundTrips() throws {
        let original = Wrapper(date: Date())
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .custom(DojeonDateCoding.encode)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom(DojeonDateCoding.decode)

        let data = try encoder.encode(original)
        let decoded = try decoder.decode(Wrapper.self, from: data)
        XCTAssertEqual(decoded.date.timeIntervalSince1970, original.date.timeIntervalSince1970, accuracy: 1.0)
    }
}
