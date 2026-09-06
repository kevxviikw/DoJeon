import XCTest
@testable import DojeonCore

final class DTOCodingTests: XCTestCase {
    /// Confirms snake_case Postgres rows decode into our camelCase models
    /// via `.convertFromSnakeCase`, while already-camelCase logic-module
    /// output (tightestFeasibleTier, tradeoffs[].kind, etc.) still decodes
    /// correctly too -- both shapes appear in the same response bodies.
    func testForgeResponseDecodesMixedCaseJSON() throws {
        let json = """
        {
          "mission": {
            "id": "11111111-1111-1111-1111-111111111111",
            "user_id": "22222222-2222-2222-2222-222222222222",
            "squad_id": null,
            "title": "Ship the club app",
            "deliverable": "Publish three completed case studies",
            "goal_type": "career",
            "deadline": "2026-10-15",
            "duration_days": 40,
            "hours_available_per_day": 2,
            "tiers": {
              "minimum": {"hours": 10},
              "target": {"hours": 30},
              "stretch": {"hours": 60}
            },
            "tightest_feasible_tier": "target",
            "status": "active",
            "created_at": "2026-09-05T10:00:00Z"
          },
          "feasibility": {
            "feasible": {"minimum": true, "target": true, "stretch": false},
            "tightestFeasibleTier": "target",
            "tradeoffs": []
          }
        }
        """.data(using: .utf8)!

        let response = try APIClient.decoder.decode(ForgeResponse.self, from: json)
        XCTAssertEqual(response.mission.title, "Ship the club app")
        XCTAssertEqual(response.mission.tightestFeasibleTier, .target)
        XCTAssertTrue(response.feasibility.feasible.minimum)
        XCTAssertFalse(response.feasibility.feasible.stretch)
        XCTAssertEqual(response.feasibility.tightestFeasibleTier, .target)
    }

    func testForgeRequestEncodesCamelCaseKeysUnchanged() throws {
        let request = ForgeRequest(
            title: "Ship it",
            deliverable: "Publish three case studies",
            goalType: "career",
            deadline: Date(timeIntervalSince1970: 1_760_000_000),
            hoursAvailablePerDay: 2
        )
        let data = try APIClient.encoder.encode(request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        XCTAssertNotNil(json?["hoursAvailablePerDay"]) // not hours_available_per_day
        XCTAssertNotNil(json?["goalType"])
    }
}
