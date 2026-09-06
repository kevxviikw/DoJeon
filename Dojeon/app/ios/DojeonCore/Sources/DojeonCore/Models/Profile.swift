import Foundation
import SwiftData

/// Local cache of a `profiles` row. Supabase Postgres is the source of
/// truth; this exists so Today/Squad screens have something to render
/// offline and so SwiftUI has a stable, observable local object.
@Model
public final class Profile {
    @Attribute(.unique) public var id: UUID
    public var displayName: String
    public var createdAt: Date

    public init(id: UUID, displayName: String, createdAt: Date = .now) {
        self.id = id
        self.displayName = displayName
        self.createdAt = createdAt
    }
}
