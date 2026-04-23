import ActivityKit
import ExpoModulesCore
import Foundation

public class LiveActivityModule: Module {
  // Tracks current activities by their ActivityKit id so JS can refer to them.
  private var activities: [String: Any] = [:]

  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    AsyncFunction("areEnabled") { () -> Bool in
      if #available(iOS 16.1, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("start") { (options: LiveActivityStartOptions) -> String? in
      guard #available(iOS 16.1, *) else { return nil }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

      // Only one timer activity at a time — end any existing ones.
      for activity in Activity<TimerAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }

      let attributes = TimerAttributes(
        activityId: options.activityId,
        activityName: options.activityName
      )
      let state = TimerAttributes.ContentState(
        startedAt: Date(timeIntervalSince1970: options.startedAt / 1000),
        endsAt: options.endsAt.map { Date(timeIntervalSince1970: $0 / 1000) },
        mode: options.mode,
        isPaused: options.isPaused ?? false,
        emomCurrentRound: options.emomCurrentRound,
        emomTotalRounds: options.emomTotalRounds,
        setProgressText: options.setProgressText
      )

      do {
        let content = ActivityContent(state: state, staleDate: options.endsAt.map {
          Date(timeIntervalSince1970: $0 / 1000).addingTimeInterval(60)
        })
        let activity = try Activity.request(
          attributes: attributes,
          content: content,
          pushType: nil
        )
        self.activities[activity.id] = activity
        return activity.id
      } catch {
        return nil
      }
    }

    AsyncFunction("update") { (options: LiveActivityUpdateOptions) -> Void in
      guard #available(iOS 16.1, *) else { return }
      let targetActivities: [Activity<TimerAttributes>] = Activity<TimerAttributes>.activities
        .filter { options.activityKitId == nil || $0.id == options.activityKitId }

      for activity in targetActivities {
        let state = TimerAttributes.ContentState(
          startedAt: Date(timeIntervalSince1970: options.startedAt / 1000),
          endsAt: options.endsAt.map { Date(timeIntervalSince1970: $0 / 1000) },
          mode: options.mode,
          isPaused: options.isPaused ?? false,
          emomCurrentRound: options.emomCurrentRound,
          emomTotalRounds: options.emomTotalRounds,
          setProgressText: options.setProgressText
        )
        let content = ActivityContent(state: state, staleDate: options.endsAt.map {
          Date(timeIntervalSince1970: $0 / 1000).addingTimeInterval(60)
        })
        await activity.update(content)
      }
    }

    AsyncFunction("end") { (options: LiveActivityEndOptions) -> Void in
      guard #available(iOS 16.1, *) else { return }
      let dismissal: ActivityUIDismissalPolicy
      switch options.dismissalPolicy ?? "afterSeconds" {
      case "immediate":
        dismissal = .immediate
      case "default":
        dismissal = .default
      default:
        dismissal = .after(Date().addingTimeInterval(Double(options.dismissAfterSeconds ?? 4)))
      }

      let targets: [Activity<TimerAttributes>] = Activity<TimerAttributes>.activities
        .filter { options.activityKitId == nil || $0.id == options.activityKitId }

      for activity in targets {
        var finalContent: ActivityContent<TimerAttributes.ContentState>? = nil
        if let finalStateOpts = options.finalState {
          let state = TimerAttributes.ContentState(
            startedAt: Date(timeIntervalSince1970: finalStateOpts.startedAt / 1000),
            endsAt: finalStateOpts.endsAt.map { Date(timeIntervalSince1970: $0 / 1000) },
            mode: finalStateOpts.mode,
            isPaused: finalStateOpts.isPaused ?? false,
            emomCurrentRound: finalStateOpts.emomCurrentRound,
            emomTotalRounds: finalStateOpts.emomTotalRounds,
            setProgressText: finalStateOpts.setProgressText
          )
          finalContent = ActivityContent(state: state, staleDate: nil)
        }
        await activity.end(finalContent, dismissalPolicy: dismissal)
      }
    }

    AsyncFunction("endAll") { () -> Void in
      guard #available(iOS 16.1, *) else { return }
      for activity in Activity<TimerAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
  }
}

struct LiveActivityStartOptions: Record {
  @Field var activityId: String
  @Field var activityName: String
  @Field var mode: String
  @Field var startedAt: Double
  @Field var endsAt: Double?
  @Field var isPaused: Bool?
  @Field var emomCurrentRound: Int?
  @Field var emomTotalRounds: Int?
  @Field var setProgressText: String?
}

struct LiveActivityUpdateOptions: Record {
  @Field var activityKitId: String?
  @Field var mode: String
  @Field var startedAt: Double
  @Field var endsAt: Double?
  @Field var isPaused: Bool?
  @Field var emomCurrentRound: Int?
  @Field var emomTotalRounds: Int?
  @Field var setProgressText: String?
}

struct LiveActivityEndOptions: Record {
  @Field var activityKitId: String?
  @Field var dismissalPolicy: String?
  @Field var dismissAfterSeconds: Int?
  @Field var finalState: LiveActivityFinalState?
}

struct LiveActivityFinalState: Record {
  @Field var mode: String
  @Field var startedAt: Double
  @Field var endsAt: Double?
  @Field var isPaused: Bool?
  @Field var emomCurrentRound: Int?
  @Field var emomTotalRounds: Int?
  @Field var setProgressText: String?
}
