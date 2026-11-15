import ExpoModulesCore
import HealthKit
import WatchConnectivity

public final class WatchWorkoutModule: Module {
  private let store = HKHealthStore()
  private let companion = SetCompanion()
  private lazy var mirrored: AnyObject? = {
    if #available(iOS 17, *) { return MirroredWorkout(store: self.store) }
    return nil
  }()

  public func definition() -> ModuleDefinition {
    Name("WatchWorkout")
    Events("onCompanionUpdate")
    OnCreate {
      self.companion.onUpdate = { [weak self] in
        self?.sendEvent("onCompanionUpdate", [:])
      }
      self.companion.activate()
      if #available(iOS 17, *) { (self.mirrored as? MirroredWorkout)?.observe() }
    }

    AsyncFunction("start") { (type: String) async throws in
      let configuration = HKWorkoutConfiguration()
      switch type {
      case "strength": configuration.activityType = .traditionalStrengthTraining
      case "walk", "indoorWalk", "ruck": configuration.activityType = .walking
      case "run", "indoorRun": configuration.activityType = .running
      case "outdoorCycle", "indoorCycle": configuration.activityType = .cycling
      default:
        throw NSError(domain: "Rhythm.WatchWorkout", code: 2)
      }
      configuration.locationType = type == "strength" || type.hasPrefix("indoor") ? .indoor : .outdoor
      if #available(iOS 17, *), let mirrored = self.mirrored as? MirroredWorkout,
         try await mirrored.switchWorkoutIfConnected(to: configuration) { return }
      try await self.store.startWatchApp(toHandle: configuration)
    }
    AsyncFunction("state") { () -> String? in
      guard #available(iOS 17, *) else { return nil }
      return self.companion.state ?? (self.mirrored as? MirroredWorkout)?.state
    }.runOnQueue(.main)
    AsyncFunction("matches") { (type: String) -> Bool in
      guard #available(iOS 17, *), let workout = self.mirrored as? MirroredWorkout else { return false }
      return workout.matches(type)
    }.runOnQueue(.main)
    AsyncFunction("exchangeSet") { (snapshot: String) async throws -> String? in
      let pending = await self.companion.exchange(snapshot)
      if #available(iOS 17, *), let workout = self.mirrored as? MirroredWorkout {
        do {
          let mirroredPending = try await workout.exchangeSet(snapshot)
          return pending ?? mirroredPending
        } catch {
          if let pending { return pending }
          throw error
        }
      }
      return pending
    }
    AsyncFunction("control") { (command: String) async throws in
      if await self.companion.sendControl(command) { return }
      guard #available(iOS 17, *), let workout = self.mirrored as? MirroredWorkout else { return }
      try await workout.control(command)
    }
  }
}

@available(iOS 17, *)
private final class MirroredWorkout: NSObject, HKWorkoutSessionDelegate {
  private let store: HKHealthStore

  init(store: HKHealthStore) {
    self.store = store
  }

  private var session: HKWorkoutSession?
  private var pendingSet: String?
  private var lastSnapshot: String?

  @MainActor
  func exchangeSet(_ snapshot: String) async throws -> String? {
    guard let session else { return nil }
    if snapshot != lastSnapshot {
      try await session.sendToRemoteWorkoutSession(data: Data(snapshot.utf8))
      lastSnapshot = snapshot
    }
    defer { pendingSet = nil }
    return pendingSet
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didReceiveDataFromRemoteWorkoutSession data: [Data]) {
    DispatchQueue.main.async {
      guard self.session === workoutSession else { return }
      for message in data {
        guard let command = String(data: message, encoding: .utf8),
              command.hasPrefix("complete:") || command.hasPrefix("endRest:") else { continue }
        self.pendingSet = command
      }
    }
  }

  var state: String? {
    switch session?.state {
    case .running: return "running"
    case .paused: return "paused"
    default: return nil
    }
  }

  func matches(_ type: String) -> Bool {
    guard let configuration = session?.workoutConfiguration, state != nil else { return false }
    let indoor = configuration.locationType == .indoor
    switch configuration.activityType {
    case .traditionalStrengthTraining: return type == "strength"
    case .walking: return indoor ? type == "indoorWalk" : type == "walk" || type == "ruck"
    case .running: return type == (indoor ? "indoorRun" : "run")
    case .cycling: return type == (indoor ? "indoorCycle" : "outdoorCycle")
    default: return false
    }
  }

  func observe() {
    guard #available(iOS 17, *) else { return }
    store.workoutSessionMirroringStartHandler = { [weak self] session in
      DispatchQueue.main.async {
        self?.session = session
        self?.lastSnapshot = nil
        self?.pendingSet = nil
        session.delegate = self
      }
    }
  }

  @MainActor
  func switchWorkoutIfConnected(to configuration: HKWorkoutConfiguration) async throws -> Bool {
    guard let session, state != nil else { return false }
    if session.workoutConfiguration.activityType == configuration.activityType &&
       session.workoutConfiguration.locationType == configuration.locationType { return true }
    let command = "switch:\(configuration.activityType.rawValue):\(configuration.locationType.rawValue)"
    try await session.sendToRemoteWorkoutSession(data: Data(command.utf8))
    return true
  }

  @MainActor
  func control(_ command: String) async throws {
    guard #available(iOS 17, *), let session,
          session.state == .running || session.state == .paused else {
      throw NSError(domain: "Rhythm.WatchWorkout", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "No active Watch workout is connected."
      ])
    }
    try await session.sendToRemoteWorkoutSession(data: Data(command.utf8))
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState,
                      from fromState: HKWorkoutSessionState, date: Date) {
    guard toState == .ended else { return }
    DispatchQueue.main.async {
      if self.session === workoutSession { self.session = nil }
    }
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {}
}

private final class SetCompanion: NSObject, WCSessionDelegate {
  private var pendingSet: String?
  private var reportedState: String?
  var onUpdate: (() -> Void)?

  var state: String? {
    guard WCSession.isSupported(), WCSession.default.isReachable,
          reportedState == "running" || reportedState == "paused" else { return nil }
    return reportedState
  }

  @MainActor
  func sendControl(_ command: String) -> Bool {
    guard state != nil else { return false }
    WCSession.default.sendMessage(["workoutControl": command], replyHandler: nil)
    return true
  }

  func activate() {
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  @MainActor
  func exchange(_ snapshot: String) -> String? {
    if WCSession.isSupported(), WCSession.default.activationState == .activated,
       WCSession.default.applicationContext["rhythmSet"] as? String != snapshot {
      try? WCSession.default.updateApplicationContext(["rhythmSet": snapshot])
      if WCSession.default.isReachable {
        WCSession.default.sendMessage(["rhythmSet": snapshot], replyHandler: nil)
      }
    }
    defer { pendingSet = nil }
    return pendingSet
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    let action = message["setAction"] as? String
    let state = message["workoutState"] as? String
    DispatchQueue.main.async {
      if let action { self.pendingSet = action }
      if let state { self.reportedState = state }
      self.onUpdate?()
    }
  }
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
  func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
    self.session(session, didReceiveMessage: context)
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    DispatchQueue.main.async { self.onUpdate?() }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) { session.activate() }
}
