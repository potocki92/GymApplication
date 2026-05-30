// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RepifyHealth",
    platforms: [
        // HealthKit istnieje na iOS i watchOS. iPad ma tylko podzbiór typów,
        // dlatego kod defensywnie sprawdza HKHealthStore.isHealthDataAvailable().
        .iOS(.v17),
        .watchOS(.v10),
    ],
    products: [
        .library(
            name: "RepifyHealthKit",
            targets: ["RepifyHealthKit"]
        ),
    ],
    targets: [
        .target(
            name: "RepifyHealthKit",
            path: "Sources/RepifyHealthKit"
        ),
        .testTarget(
            name: "RepifyHealthKitTests",
            dependencies: ["RepifyHealthKit"],
            path: "Tests/RepifyHealthKitTests"
        ),
    ]
)
