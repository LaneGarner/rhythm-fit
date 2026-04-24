import ActivityKit
import SwiftUI
import WidgetKit

// Shared helpers ------------------------------------------------------------

private func isCountdownMode(_ mode: String) -> Bool {
  return mode == "countDown" || mode == "rest" || mode == "emom"
}

private func modeSymbol(_ mode: String, isPaused: Bool) -> String {
  if isPaused { return "pause.fill" }
  switch mode {
  case "rest": return "zzz"
  case "countDown": return "timer"
  case "emom": return "repeat"
  case "countUp": return "stopwatch"
  default: return "timer"
  }
}

private func timerAccentColor(for mode: String, endsAt: Date?) -> Color {
  if mode == "rest" { return Color("$rest") }
  if let endsAt = endsAt, endsAt.timeIntervalSinceNow <= 10 {
    return Color("$warning")
  }
  return Color("$accent")
}

// Expanded lock-screen view -------------------------------------------------

struct LockScreenView: View {
  let context: ActivityViewContext<TimerAttributes>

  var body: some View {
    let mode = context.state.mode
    let accent = timerAccentColor(for: mode, endsAt: context.state.endsAt)

    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 8) {
        Image(systemName: modeSymbol(mode, isPaused: context.state.isPaused))
          .foregroundColor(accent)
          .font(.system(size: 14, weight: .semibold))
        Text(context.attributes.activityName)
          .font(.system(size: 15, weight: .semibold))
          .lineLimit(1)
        Spacer()
        if mode == "rest" {
          Text("REST")
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(accent)
        }
      }

      HStack(alignment: .firstTextBaseline) {
        timerText(context: context)
          .font(.system(size: 44, weight: .bold, design: .monospaced))
          .foregroundColor(.primary)
        Spacer()
        if let round = context.state.emomCurrentRound,
           let total = context.state.emomTotalRounds {
          Text("Round \(round)/\(total)")
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(.secondary)
        } else if let progress = context.state.setProgressText {
          Text(progress)
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(.secondary)
        }
      }

      if isCountdownMode(mode), let endsAt = context.state.endsAt, !context.state.isPaused {
        ProgressView(timerInterval: context.state.startedAt...endsAt, countsDown: true)
          .progressViewStyle(.linear)
          .tint(accent)
          .labelsHidden()
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .activityBackgroundTint(Color.black.opacity(mode == "rest" ? 0.35 : 0.6))
    .activitySystemActionForegroundColor(.white)
  }

  @ViewBuilder
  private func timerText(context: ActivityViewContext<TimerAttributes>) -> some View {
    if context.state.isPaused {
      // Freeze remaining/elapsed at paused time
      if isCountdownMode(context.state.mode), let endsAt = context.state.endsAt {
        let remaining = max(0, Int(endsAt.timeIntervalSince(context.state.startedAt)))
        Text(format(seconds: remaining))
      } else {
        let elapsed = max(0, Int(Date().timeIntervalSince(context.state.startedAt)))
        Text(format(seconds: elapsed))
      }
    } else if isCountdownMode(context.state.mode), let endsAt = context.state.endsAt {
      Text(timerInterval: context.state.startedAt...endsAt, countsDown: true)
    } else {
      Text(context.state.startedAt, style: .timer)
    }
  }
}

private func format(seconds: Int) -> String {
  let m = seconds / 60
  let s = seconds % 60
  return String(format: "%02d:%02d", m, s)
}

// Live Activity configuration ---------------------------------------------

struct TimerLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TimerAttributes.self) { context in
      LockScreenView(context: context)
        .widgetURL(URL(string: "rhythm://timer/\(context.attributes.activityId)"))
    } dynamicIsland: { context in
      let mode = context.state.mode
      let accent = timerAccentColor(for: mode, endsAt: context.state.endsAt)

      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 6) {
              Image(systemName: modeSymbol(mode, isPaused: context.state.isPaused))
                .foregroundColor(accent)
              Text(context.attributes.activityName)
                .font(.system(size: 13, weight: .semibold))
                .lineLimit(1)
            }
            if let round = context.state.emomCurrentRound,
               let total = context.state.emomTotalRounds {
              Text("Round \(round)/\(total)")
                .font(.system(size: 11))
                .foregroundColor(.secondary)
            } else if let progress = context.state.setProgressText {
              Text(progress)
                .font(.system(size: 11))
                .foregroundColor(.secondary)
            } else if mode == "rest" {
              Text("Rest")
                .font(.system(size: 11))
                .foregroundColor(.secondary)
            }
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          Group {
            if context.state.isPaused {
              Image(systemName: "pause.fill")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(accent)
            } else if isCountdownMode(mode), let endsAt = context.state.endsAt {
              Text(timerInterval: context.state.startedAt...endsAt, countsDown: true)
                .font(.system(size: 28, weight: .bold, design: .monospaced))
                .monospacedDigit()
                .multilineTextAlignment(.trailing)
            } else {
              Text(context.state.startedAt, style: .timer)
                .font(.system(size: 28, weight: .bold, design: .monospaced))
                .monospacedDigit()
                .multilineTextAlignment(.trailing)
            }
          }
          .frame(maxWidth: .infinity, alignment: .trailing)
        }
        DynamicIslandExpandedRegion(.bottom) {
          if isCountdownMode(mode),
             let endsAt = context.state.endsAt,
             !context.state.isPaused {
            ProgressView(timerInterval: context.state.startedAt...endsAt, countsDown: true)
              .progressViewStyle(.linear)
              .tint(accent)
              .labelsHidden()
          }
        }
      } compactLeading: {
        Image(systemName: modeSymbol(mode, isPaused: context.state.isPaused))
          .foregroundColor(accent)
          .accessibilityLabel(accessibilityLabel(for: context))
      } compactTrailing: {
        Group {
          if context.state.isPaused {
            Text("--:--")
          } else if isCountdownMode(mode), let endsAt = context.state.endsAt {
            Text(timerInterval: context.state.startedAt...endsAt, countsDown: true)
          } else {
            Text(context.state.startedAt, style: .timer)
          }
        }
        .monospacedDigit()
        .font(.system(size: 14, weight: .semibold, design: .monospaced))
        .foregroundColor(accent)
        .frame(minWidth: 44)
      } minimal: {
        Image(systemName: modeSymbol(mode, isPaused: context.state.isPaused))
          .foregroundColor(accent)
      }
      .widgetURL(URL(string: "rhythm://timer/\(context.attributes.activityId)"))
      .keylineTint(accent)
    }
  }

  private func accessibilityLabel(for context: ActivityViewContext<TimerAttributes>) -> String {
    let name = context.attributes.activityName
    let mode = context.state.mode
    if context.state.isPaused { return "\(name) timer paused" }
    switch mode {
    case "rest": return "Resting for \(name)"
    case "emom":
      if let r = context.state.emomCurrentRound, let t = context.state.emomTotalRounds {
        return "\(name), round \(r) of \(t)"
      }
      return "\(name) EMOM timer"
    case "countUp": return "\(name) timer running"
    default: return "\(name) countdown"
    }
  }
}
