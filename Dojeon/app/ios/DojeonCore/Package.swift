// swift-tools-version: 5.10
import PackageDescription

// DojeonCore -- everything the app needs except the SwiftUI screens
// themselves: SwiftData models, the Supabase/Gemini-backed networking
// layer, feature services, and view models ready for a UI to bind to.
//
// No external dependencies on purpose (plain URLSession, no supabase-swift
// SDK) -- keeps this package trivial to open and build without dependency
// resolution getting in the way. Add it to an Xcode App project as a
// local Swift package dependency, then build SwiftUI views on top of the
// ViewModels in Sources/DojeonCore/ViewModels.
let package = Package(
    name: "DojeonCore",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "DojeonCore", targets: ["DojeonCore"])
    ],
    targets: [
        .target(name: "DojeonCore"),
        .testTarget(name: "DojeonCoreTests", dependencies: ["DojeonCore"]),
    ]
)
