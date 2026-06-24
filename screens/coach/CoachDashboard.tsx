import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useWeekBoundaries } from '../../hooks/useWeekBoundaries';
import { RootState } from '../../redux/store';
import { buildCoachAnalytics } from '../../services/coachAnalyticsService';
import { useTheme } from '../../theme/ThemeContext';
import { Activity } from '../../types/activity';

interface Tip {
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'info' | 'warning' | 'success';
  title: string;
  body: string;
}

interface Props {
  hasProfile: boolean;
  onStartOnboarding: () => void;
  onOpenChat: (seed?: string) => void;
  onRegenerate: () => void;
  onReschedule: () => void;
  onReconfigure: () => void;
}

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function CoachDashboard({
  hasProfile,
  onStartOnboarding,
  onOpenChat,
  onRegenerate,
  onReschedule,
  onReconfigure,
}: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const activities = useSelector((s: RootState) => s.activities.data);
  const { getWeekStart, getWeekEnd } = useWeekBoundaries();

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  const thisWeek = useMemo(() => {
    return activities
      .filter(a => {
        const d = dayjs(a.date);
        return (
          d.isSameOrAfter(weekStart, 'day') && d.isSameOrBefore(weekEnd, 'day')
        );
      })
      .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());
  }, [activities, weekStart, weekEnd]);

  const dayGroups = useMemo(() => {
    const groups: { date: string; label: string; items: Activity[] }[] = [];
    const byDate: Record<string, Activity[]> = {};
    for (const a of thisWeek) {
      (byDate[a.date] = byDate[a.date] || []).push(a);
    }
    Object.keys(byDate)
      .sort()
      .forEach(date => {
        groups.push({
          date,
          label: dayjs(date).format('ddd'),
          items: byDate[date],
        });
      });
    return groups;
  }, [thisWeek]);

  const completedCount = thisWeek.filter(a => a.completed).length;

  const tips = useMemo(() => deriveTips(activities), [activities]);

  const openDay = (date: string) =>
    navigation.navigate('Weekly', { screen: 'Day', params: { date } });

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      style={{ backgroundColor: colors.background }}
    >
      {/* This week's plan */}
      <Card colors={colors}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
            This week's plan
          </Text>
          {thisWeek.length > 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {completedCount} of {thisWeek.length} done
            </Text>
          ) : null}
        </View>

        {dayGroups.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                textAlign: 'center',
                marginBottom: 14,
                lineHeight: 20,
              }}
            >
              {hasProfile
                ? 'Nothing scheduled this week yet.'
                : "No plan yet. Answer a few questions and I'll build one and schedule it."}
            </Text>
            <PrimaryAction
              label={hasProfile ? 'Regenerate plan' : 'Build my plan'}
              icon="sparkles"
              colors={colors}
              onPress={hasProfile ? onRegenerate : onStartOnboarding}
            />
          </View>
        ) : (
          dayGroups.map((g, idx) => {
            const allDone = g.items.every(a => a.completed);
            return (
              <TouchableOpacity
                key={g.date}
                onPress={() => openDay(g.date)}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={`${dayjs(g.date).format('dddd')}, ${g.items.length} exercises`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  minHeight: 44,
                  borderBottomWidth: idx === dayGroups.length - 1 ? 0 : 1,
                  borderBottomColor: colors.borderSecondary,
                }}
              >
                <Ionicons
                  name={allDone ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={allDone ? colors.success.main : colors.textTertiary}
                />
                <Text
                  style={{
                    width: 38,
                    color: colors.textSecondary,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {g.label}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, color: colors.text, fontSize: 14 }}
                >
                  {g.items.map(a => a.name).join(', ')}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                  {g.items.length} ex
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </Card>

      {/* Coach tips */}
      <Card colors={colors}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Ionicons name="bulb" size={18} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
            Coach tips
          </Text>
        </View>
        {tips.length === 0 ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            Log a few workouts and I'll start spotting patterns — progress,
            imbalances, and where to push next.
          </Text>
        ) : (
          tips.map((tip, i) => (
            <TipRow
              key={i}
              tip={tip}
              colors={colors}
              onPress={() => onOpenChat(tip.title)}
            />
          ))
        )}
      </Card>

      {/* Quick actions */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <QuickAction
          label="Regenerate"
          icon="refresh"
          colors={colors}
          onPress={onRegenerate}
        />
        <QuickAction
          label="Reschedule"
          icon="calendar"
          colors={colors}
          onPress={onReschedule}
        />
        <QuickAction
          label="Reconfigure"
          icon="options"
          colors={colors}
          onPress={onReconfigure}
        />
        <QuickAction
          label="Ask coach"
          icon="chatbubble-ellipses"
          colors={colors}
          highlight
          onPress={() => onOpenChat()}
        />
      </View>
    </ScrollView>
  );
}

// Derive up to 3 proactive tips from analytics already computed elsewhere.
function deriveTips(activities: Activity[]): Tip[] {
  if (activities.length === 0) return [];
  const a = buildCoachAnalytics(activities);
  const tips: Tip[] = [];

  if (a.recentPRs.length > 0) {
    const pr = a.recentPRs[0];
    tips.push({
      icon: 'trophy',
      tone: 'success',
      title: `New PR on ${pr.exercise}`,
      body: `Nice work — ${pr.value}${pr.type === 'weight' ? ' lbs' : ' reps'}. Keep the momentum going.`,
    });
  }

  if (a.stalledExercises.length > 0) {
    const s = a.stalledExercises[0];
    tips.push({
      icon: 'trending-up',
      tone: 'info',
      title: `${s.name} has stalled`,
      body: `No progress in ~${Math.round(s.daysSinceProgress / 7)} weeks. Try a deload or a variation to break through.`,
    });
  }

  if (a.muscleImbalances.undertrained.length > 0) {
    tips.push({
      icon: 'alert-circle',
      tone: 'warning',
      title: `${a.muscleImbalances.undertrained[0]} undertrained`,
      body: 'Want me to add some work for it this week?',
    });
  }

  if (tips.length < 3 && a.consistency.currentStreak >= 3) {
    tips.push({
      icon: 'flame',
      tone: 'success',
      title: `${a.consistency.currentStreak}-day streak`,
      body: "You're showing up. Consistency is the whole game.",
    });
  }

  return tips.slice(0, 3);
}

function Card({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {children}
    </View>
  );
}

function TipRow({
  tip,
  colors,
  onPress,
}: {
  tip: Tip;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}) {
  const toneColor =
    tip.tone === 'success'
      ? colors.success
      : tip.tone === 'warning'
        ? colors.warning
        : colors.primary;
  const accent = (toneColor as any).main ?? colors.primary.main;
  // Subtle tinted surface with a colored left accent; text stays high-contrast
  // (bright accent for the title, theme text for the body) in both light/dark.
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${tip.title}. ${tip.body}. Ask the coach.`}
      style={{
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        borderRadius: 10,
        backgroundColor: colors.surfaceSecondary,
        borderLeftWidth: 3,
        borderLeftColor: accent,
        marginBottom: 8,
      }}
    >
      <Ionicons
        name={tip.icon}
        size={18}
        color={accent}
        style={{ marginTop: 1 }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 13,
            fontWeight: '600',
            marginBottom: 2,
          }}
        >
          {tip.title}
        </Text>
        <Text
          style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}
        >
          {tip.body}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function QuickAction({
  label,
  icon,
  colors,
  onPress,
  highlight,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
  highlight?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 14,
        minHeight: 48,
        borderRadius: 10,
        backgroundColor: highlight ? colors.primary.background : colors.surface,
        borderWidth: 1,
        borderColor: highlight ? colors.primary.main : colors.border,
      }}
    >
      <Ionicons
        name={icon}
        size={18}
        color={highlight ? colors.primary.main : colors.text}
      />
      <Text
        style={{
          color: highlight ? colors.primary.main : colors.text,
          fontSize: 13,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PrimaryAction({
  label,
  icon,
  colors,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 13,
        paddingHorizontal: 20,
        minHeight: 48,
        borderRadius: 12,
        backgroundColor: colors.primary.main,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.textInverse} />
      <Text
        style={{ color: colors.textInverse, fontSize: 15, fontWeight: '600' }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
