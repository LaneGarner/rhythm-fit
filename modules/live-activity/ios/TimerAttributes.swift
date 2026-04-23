import ActivityKit
import Foundation

// This type must stay byte-identical to targets/widget/TimerAttributes.swift
// so ActivityKit can decode the shared payload across targets.
public struct TimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var startedAt: Date
    public var endsAt: Date?
    public var mode: String
    public var isPaused: Bool
    public var emomCurrentRound: Int?
    public var emomTotalRounds: Int?
    public var setProgressText: String?

    public init(
      startedAt: Date,
      endsAt: Date?,
      mode: String,
      isPaused: Bool,
      emomCurrentRound: Int?,
      emomTotalRounds: Int?,
      setProgressText: String?
    ) {
      self.startedAt = startedAt
      self.endsAt = endsAt
      self.mode = mode
      self.isPaused = isPaused
      self.emomCurrentRound = emomCurrentRound
      self.emomTotalRounds = emomTotalRounds
      self.setProgressText = setProgressText
    }
  }

  public var activityId: String
  public var activityName: String

  public init(activityId: String, activityName: String) {
    self.activityId = activityId
    self.activityName = activityName
  }
}
