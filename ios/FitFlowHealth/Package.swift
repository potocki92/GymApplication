// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FitFlowHealth",
    platforms: [
        // HealthKit istnieje na iOS i watchOS. iPad ma tylko podzbiór typów,
        // dlatego kod defensywnie sprawdza HKHealthStore.isHealthDataAvailable().
        .iOS(.v17),
        .watchOS(.v10),
    ],
    products: [
        .library(
            name: "FitFlowHealthKit",
            targets: ["FitFlowHealthKit"]
        ),
    ],
    targets: [
        .target(
            name: "FitFlowHealthKit",
            path: "Sources/FitFlowHealthKit"
        ),
        .testTarget(
            name: "FitFlowHealthKitTests",
            dependencies: ["FitFlowHealthKit"],
            path: "Tests/FitFlowHealthKitTests"
        ),
    ]
)
