import CoreLocation
import HealthKit
import WatchConnectivity
import SwiftUI

@main
struct RhythmWatchApp: App {
    @WKApplicationDelegateAdaptor(WorkoutController.self) private var workout

    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            WorkoutView(workout: workout)
                .onChange(of: scenePhase, initial: true) { _, phase in
                    workout.updateRouteLocation(isActive: phase == .active)
                }
        }
    }
}

struct CurrentSet: Decodable {
    var key: String?
    var title: String?
    var detail: String?
    var number: Int?
    var totalSets: Int?

    var setLabel: String? {
        guard let number else { return nil }
        if let totalSets { return "Set \(number) of \(totalSets)" }
        return "Set \(number)"
    }
    var timerLabel: String?
    var remaining: Int?
    var deadline: Double?
}

@MainActor
final class WorkoutController: NSObject, ObservableObject, WKApplicationDelegate, HKWorkoutSessionDelegate, CLLocationManagerDelegate, WCSessionDelegate {
    @Published var title = "Strength training"
    @Published var isStrength = true
    @Published var startedAt: Date?
    @Published var pausedAt: Date?
    @Published var saved = false
    @Published var error: String?
    @Published var busy = false
    @Published var currentSet: CurrentSet?
    @Published var completing = false

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        self.session(session, didReceiveApplicationContext: session.receivedApplicationContext)
        Task { @MainActor in publishState() }
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        if let command = message["workoutControl"] as? String {
            Task { @MainActor in
                switch command {
                case "pause" where pausedAt == nil && startedAt != nil: togglePause()
                case "resume" where pausedAt != nil: togglePause()
                case "end": await finish()
                default: break
                }
            }
        } else {
            self.session(session, didReceiveApplicationContext: message)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        guard let json = applicationContext["rhythmSet"] as? String,
              let set = try? JSONDecoder().decode(CurrentSet.self, from: Data(json.utf8)) else { return }
        Task { @MainActor in currentSet = set }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in publishState() }
    }

    private func publishState() {
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }
        let state = startedAt == nil ? "idle" : pausedAt == nil ? "running" : "paused"
        let update = ["workoutState": state]
        try? WCSession.default.updateApplicationContext(update)
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(update, replyHandler: nil)
        }
    }

    func sendSetAction(_ action: String, key: String) async {
        guard let session, !completing else { return }
        completing = true
        do {
            if WCSession.isSupported(), WCSession.default.isReachable {
                WCSession.default.sendMessage(["setAction": "\(action):\(key)"], replyHandler: nil) { _ in
                    Task { try? await session.sendToRemoteWorkoutSession(data: Data("\(action):\(key)".utf8)) }
                }
            } else {
                try await session.sendToRemoteWorkoutSession(data: Data("\(action):\(key)".utf8))
            }
            try await Task.sleep(for: .seconds(3))
        } catch {
            self.error = error.localizedDescription
        }
        completing = false
    }
    private let store = HKHealthStore()
    private let location = CLLocationManager()
    private var routeBuilder: HKWorkoutRouteBuilder?
    private var routeWrites: Task<Int, Never>?
    private var routeStartedAt: Date?
    private var watchIsActive = false
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?

    func handle(_ configuration: HKWorkoutConfiguration) {
        Task { await start(configuration) }
    }

    func start(_ configuration: HKWorkoutConfiguration = HKWorkoutConfiguration()) async {
        guard startedAt == nil, !busy else { return }
        busy = true
        defer { busy = false }
        error = nil
        saved = false
        if configuration.activityType == .other {
            configuration.activityType = .traditionalStrengthTraining
            configuration.locationType = .indoor
        }
        isStrength = configuration.activityType == .traditionalStrengthTraining
        switch configuration.activityType {
        case .walking: title = configuration.locationType == .indoor ? "Indoor walk" : "Outdoor walk"
        case .running: title = configuration.locationType == .indoor ? "Indoor run" : "Outdoor run"
        case .cycling: title = configuration.locationType == .indoor ? "Indoor cycle" : "Outdoor cycle"
        default: title = "Strength training"
        }
        do {
            let outdoor = configuration.locationType == .outdoor
            var share: Set<HKSampleType> = [.workoutType()]
            if outdoor { share.insert(HKSeriesType.workoutRoute()) }
            let distanceType: HKQuantityType?
            switch configuration.activityType {
            case .walking, .running: distanceType = HKQuantityType(.distanceWalkingRunning)
            case .cycling: distanceType = HKQuantityType(.distanceCycling)
            default: distanceType = nil
            }
            var read: Set<HKObjectType> = [HKQuantityType(.heartRate), HKQuantityType(.activeEnergyBurned)]
            if let distanceType { read.insert(distanceType) }
            if outdoor { read.insert(HKSeriesType.workoutRoute()) }
            try await store.requestAuthorization(toShare: share, read: read)
            let session = try HKWorkoutSession(healthStore: store, configuration: configuration)
            session.delegate = self
            let builder = session.associatedWorkoutBuilder()
            builder.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: configuration)
            let date = Date()
            session.startActivity(with: date)
            do {
                try await builder.beginCollection(at: date)
            } catch {
                session.end()
                throw error
            }
            self.session = session
            self.builder = builder
            startedAt = date
            publishState()
            if outdoor {
                routeBuilder = builder.seriesBuilder(for: HKSeriesType.workoutRoute()) as? HKWorkoutRouteBuilder
                routeStartedAt = date
                location.delegate = self
                location.desiredAccuracy = kCLLocationAccuracyBest
                updateRouteLocation(isActive: watchIsActive)
            }
            Task {
                do { try await session.startMirroringToCompanionDevice() }
                catch { NSLog("Rhythm workout mirroring failed: %@", error.localizedDescription) }
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func togglePause() {
        if let pausedAt {
            startedAt = startedAt?.addingTimeInterval(Date().timeIntervalSince(pausedAt))
            self.pausedAt = nil
            session?.resume()
        } else {
            pausedAt = Date()
            session?.pause()
        }
        publishState()
    }

    func finish() async {
        guard let session, let builder, !busy else { return }
        busy = true
        defer { busy = false }
        let recordedOutdoorWorkout = routeStartedAt != nil
        routeStartedAt = nil
        location.stopUpdatingLocation()
        let pointCount = await routeWrites?.value ?? 0
        session.end()
        do {
            try await builder.endCollection(at: Date())
            if let workout = try await builder.finishWorkout() {
                saved = true
                if let routeBuilder, pointCount > 0 {
                    do {
                        _ = try await routeBuilder.finishRoute(with: workout, metadata: nil)
                    } catch {
                        NSLog("Rhythm failed to save workout route: %@", error.localizedDescription)
                    }
                } else if recordedOutdoorWorkout {
                    NSLog("Rhythm outdoor workout saved without route locations")
                }
            }
        } catch {
            self.error = error.localizedDescription
        }
        routeWrites = nil
        routeBuilder = nil
        currentSet = nil
        self.session = nil
        self.builder = nil
        startedAt = nil
        pausedAt = nil
        publishState()
    }

    func updateRouteLocation(isActive: Bool) {
        watchIsActive = isActive
        guard routeBuilder != nil, routeStartedAt != nil else { return }
        switch location.authorizationStatus {
        case .notDetermined:
            if isActive { location.requestWhenInUseAuthorization() }
        case .authorizedAlways, .authorizedWhenInUse:
            location.startUpdatingLocation()
        default:
            location.stopUpdatingLocation()
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in updateRouteLocation(isActive: watchIsActive) }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if (error as? CLError)?.code != .locationUnknown {
            NSLog("Rhythm workout location updates failed: %@", error.localizedDescription)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            guard let routeBuilder, let routeStartedAt, pausedAt == nil, !busy else { return }
            let points = locations.filter {
                $0.timestamp >= routeStartedAt && $0.horizontalAccuracy >= 0 && $0.horizontalAccuracy <= 50
            }
            guard !points.isEmpty else { return }

            let previousWrite = routeWrites
            routeWrites = Task {
                let count = await previousWrite?.value ?? 0
                do {
                    try await routeBuilder.insertRouteData(points)
                    return count + points.count
                } catch {
                    NSLog("Rhythm failed to add workout route locations: %@", error.localizedDescription)
                    return count
                }
            }
        }
    }

    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession, didReceiveDataFromRemoteWorkoutSession data: [Data]
    ) {
        Task { @MainActor in
            guard session === workoutSession else { return }
            for message in data {
                if let snapshot = try? JSONDecoder().decode(CurrentSet.self, from: message) {
                    currentSet = snapshot
                    continue
                }
                let command = String(data: message, encoding: .utf8)
                if let command, command.hasPrefix("switch:"), !busy {
                    let parts = command.split(separator: ":")
                    if parts.count == 3, let activity = UInt(parts[1]), let location = Int(parts[2]),
                       let workoutType = HKWorkoutActivityType(rawValue: activity),
                       let locationType = HKWorkoutSessionLocationType(rawValue: location) {
                        let configuration = HKWorkoutConfiguration()
                        configuration.activityType = workoutType
                        configuration.locationType = locationType
                        await finish()
                        if saved { await start(configuration) }
                    }
                    continue
                }
                switch command {
                case "pause" where pausedAt == nil: togglePause()
                case "resume" where pausedAt != nil: togglePause()
                case "end": await finish()
                default: break
                }
            }
        }
    }

    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState, date: Date
    ) {}

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        Task { @MainActor in
            guard session === workoutSession, !busy else { return }
            self.error = error.localizedDescription
            location.stopUpdatingLocation()
            routeBuilder = nil
            routeWrites = nil
            routeStartedAt = nil
            session = nil
            builder = nil
            startedAt = nil
            pausedAt = nil
            publishState()
        }
    }

    var heartRate: Int? {
        builder?.statistics(for: HKQuantityType(.heartRate))?
            .mostRecentQuantity().map { Int($0.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))) }
    }
}

struct WorkoutView: View {
    @ObservedObject var workout: WorkoutController
    @State private var confirmEnd = false

    var body: some View {
        Group {
            if let start = workout.startedAt {
                TabView {
                    if workout.isStrength {
                        ScrollView { currentSetPage }
                    }
                    ScrollView { metricsPage(start: start) }
                    ScrollView {
                        VStack(spacing: 8) {
                            Text("Workout controls").font(.headline)
                            Button(workout.pausedAt == nil ? "Pause workout" : "Resume workout") {
                                workout.togglePause()
                            }
                            Button("End workout", role: .destructive) { confirmEnd = true }
                        }
                        .padding(.horizontal, 4)
                    }
                }
                .tabViewStyle(.page)
            } else if workout.saved {
                ScrollView {
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.title2)
                            .foregroundStyle(Color(red: 125.0 / 255, green: 191.0 / 255, blue: 148.0 / 255))
                            .accessibilityHidden(true)
                        Text("Session complete").font(.headline)
                        Text("Workout saved to Apple Health.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        if let error = workout.error {
                            Text(error).font(.footnote).foregroundStyle(.secondary)
                        }
                        Button("OK") {
                            workout.saved = false
                            workout.error = nil
                        }
                    }
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 4)
                }
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        if let url = Bundle.main.url(forResource: "RhythmMark", withExtension: "png"),
                           let logo = UIImage(contentsOfFile: url.path) {
                            Image(uiImage: logo).resizable().scaledToFit().frame(width: 48, height: 48)
                                .accessibilityHidden(true)
                        }
                        Text("Rhythm Fitness").font(.headline)
                        Text("Start a session on your iPhone with Apple Watch recording enabled in Settings.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        if let error = workout.error {
                            Text(error).font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .padding(.horizontal, 4)
                }
            }
        }
        .disabled(workout.busy)
        .confirmationDialog("End workout?", isPresented: $confirmEnd) {
            Button("End workout", role: .destructive) { Task { await workout.finish() } }
        }
    }

    private var currentSetPage: some View {
        VStack(spacing: 8) {
            if let set = workout.currentSet, let key = set.key {
                if set.timerLabel == "Rest timer" {
                    TimelineView(.periodic(from: .now, by: 0.25)) { context in
                        let remaining = remainingSeconds(set, at: context.date)
                        if remaining > 0 {
                            VStack(spacing: 6) {
                                Text("Rest").font(.headline)
                                digits(remaining)
                                Button("End rest") {
                                    Task { await workout.sendSetAction("endRest", key: key) }
                                }
                                .disabled(workout.completing)
                                VStack(spacing: 2) {
                                    Text("Next")
                                    Text(set.title ?? "Next exercise")
                                    if let label = set.setLabel {
                                        Text(label)
                                    }
                                    if let detail = set.detail, !detail.isEmpty {
                                        Text(detail)
                                    }
                                }
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                            }
                        } else {
                            setDetails(set, key: key)
                        }
                    }
                } else {
                    setDetails(set, key: key)
                }
            } else {
                Text(workout.title).font(.headline)
                Text("Open your session on iPhone to see the current set.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            if let error = workout.error {
                Text(error).font(.footnote).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 4)
    }

    private func setDetails(_ set: CurrentSet, key: String) -> some View {
        VStack(spacing: 8) {
            if let label = set.setLabel {
                Text(label).font(.caption).foregroundStyle(.secondary)
            }
            Text(set.title ?? "Current exercise").font(.headline)
                .multilineTextAlignment(.center)
            if let detail = set.detail, !detail.isEmpty {
                Text(detail).multilineTextAlignment(.center)
            }
            Button("Mark Complete") {
                Task { await workout.sendSetAction("complete", key: key) }
            }
            .disabled(workout.completing)
        }
    }

    private func metricsPage(start: Date) -> some View {
        TimelineView(.periodic(from: start, by: 0.25)) { context in
            let elapsed = max(0, Int((workout.pausedAt ?? context.date).timeIntervalSince(start)))
            VStack(spacing: 6) {
                Text(workout.title).font(.headline)
                Text("Workout elapsed").font(.caption).foregroundStyle(.secondary)
                digits(elapsed)
                if let bpm = workout.heartRate {
                    Label("\(bpm) BPM", systemImage: "heart.fill")
                        .foregroundStyle(.secondary)
                }

            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 4)
        }
    }

    private func remainingSeconds(_ set: CurrentSet, at date: Date) -> Int {
        set.deadline.map {
            Int(max(0, ceil($0 / 1000 - date.timeIntervalSince1970)))
        } ?? set.remaining ?? 0
    }

    private func digits(_ seconds: Int) -> some View {
        Text(formatted(seconds))
            .font(.system(size: 42, weight: .bold, design: .monospaced))
            .minimumScaleFactor(0.55)
            .lineLimit(1)
    }

    private func formatted(_ seconds: Int) -> String {
        String(format: "%02d:%02d", seconds / 60, seconds % 60)
    }
}
