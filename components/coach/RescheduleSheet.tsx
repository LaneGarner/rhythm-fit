import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useWeekBoundaries } from '../../hooks/useWeekBoundaries';
import { batchUpdateActivities } from '../../redux/activitySlice';
import { AppDispatch, RootState } from '../../redux/store';
import { useTheme } from '../../theme/ThemeContext';
import { Activity } from '../../types/activity';

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Reschedule this week's workouts. Quick shifts and per-day moves apply
// instantly via batchUpdateActivities; an undo banner restores the prior state
// (undo over confirmation — no nagging dialogs).
export default function RescheduleSheet({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const activities = useSelector((s: RootState) => s.activities.data);
  const { getWeekStart, getWeekEnd } = useWeekBoundaries();

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  const [undoSnapshot, setUndoSnapshot] = useState<Activity[] | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')),
    [weekStart]
  );

  const thisWeek = useMemo(
    () =>
      activities
        .filter(a => {
          const d = dayjs(a.date);
          return (
            d.isSameOrAfter(weekStart, 'day') &&
            d.isSameOrBefore(weekEnd, 'day')
          );
        })
        .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix()),
    [activities, weekStart, weekEnd]
  );

  const dayGroups = useMemo(() => {
    const byDate: Record<string, Activity[]> = {};
    for (const a of thisWeek) {
      (byDate[a.date] = byDate[a.date] || []).push(a);
    }
    return Object.keys(byDate)
      .sort()
      .map(date => ({ date, items: byDate[date] }));
  }, [thisWeek]);

  // Apply a date remap; remember the originals so it can be undone.
  const applyMove = (toMove: Activity[], remap: (a: Activity) => string) => {
    if (toMove.length === 0) return;
    setUndoSnapshot(toMove.map(a => ({ ...a })));
    const updated = toMove.map(a => ({ ...a, date: remap(a) }));
    dispatch(batchUpdateActivities(updated));
  };

  const pushWeek = () =>
    applyMove(thisWeek, a => dayjs(a.date).add(7, 'day').format('YYYY-MM-DD'));

  const moveDay = (fromDate: string, toDate: string) => {
    const items = thisWeek.filter(a => a.date === fromDate);
    applyMove(items, () => toDate);
    setExpandedDate(null);
  };

  const undo = () => {
    if (!undoSnapshot) return;
    dispatch(batchUpdateActivities(undoSnapshot));
    setUndoSnapshot(null);
  };

  const close = () => {
    setUndoSnapshot(null);
    setExpandedDate(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
        onPress={close}
        accessibilityLabel="Close reschedule"
      />
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 28,
        }}
      >
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.borderSecondary,
            alignSelf: 'center',
            marginBottom: 16,
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
            Reschedule this week
          </Text>
          <TouchableOpacity
            onPress={close}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{
              width: 44,
              height: 44,
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 13,
            lineHeight: 18,
            marginBottom: 16,
          }}
        >
          Changes apply right away — undo any time below.
        </Text>

        {thisWeek.length === 0 ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              paddingVertical: 16,
              textAlign: 'center',
            }}
          >
            Nothing scheduled this week to move.
          </Text>
        ) : (
          <>
            <TouchableOpacity
              onPress={pushWeek}
              accessibilityRole="button"
              accessibilityLabel="Push everything to next week"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 14,
                minHeight: 48,
                borderRadius: 10,
                backgroundColor: colors.surfaceSecondary,
                marginBottom: 16,
              }}
            >
              <Ionicons
                name="arrow-forward-circle"
                size={20}
                color={colors.primary.main}
              />
              <Text
                style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}
              >
                Push everything to next week
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              Or move a single day
            </Text>
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              }}
            >
              {dayGroups.map((g, idx) => (
                <View
                  key={g.date}
                  style={{
                    borderBottomWidth: idx === dayGroups.length - 1 ? 0 : 1,
                    borderBottomColor: colors.borderSecondary,
                  }}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setExpandedDate(expandedDate === g.date ? null : g.date)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${dayjs(g.date).format('dddd')}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      minHeight: 48,
                    }}
                  >
                    <Text
                      style={{
                        width: 42,
                        color: colors.textSecondary,
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {dayjs(g.date).format('ddd')}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, color: colors.text, fontSize: 14 }}
                    >
                      {g.items.map(a => a.name).join(', ')}
                    </Text>
                    <Ionicons
                      name={
                        expandedDate === g.date ? 'chevron-up' : 'chevron-down'
                      }
                      size={16}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>

                  {expandedDate === g.date ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 8,
                        paddingHorizontal: 14,
                        paddingBottom: 12,
                      }}
                    >
                      {weekDates.map(d => {
                        const ds = d.format('YYYY-MM-DD');
                        const isCurrent = ds === g.date;
                        return (
                          <TouchableOpacity
                            key={ds}
                            disabled={isCurrent}
                            onPress={() => moveDay(g.date, ds)}
                            hitSlop={HIT_SLOP}
                            accessibilityRole="button"
                            accessibilityLabel={`Move to ${d.format('dddd')}`}
                            style={{
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              minHeight: 40,
                              borderRadius: 18,
                              backgroundColor: isCurrent
                                ? colors.primary.background
                                : colors.surface,
                              borderWidth: 1,
                              borderColor: isCurrent
                                ? colors.primary.main
                                : colors.border,
                            }}
                          >
                            <Text
                              style={{
                                color: isCurrent
                                  ? colors.primary.main
                                  : colors.text,
                                fontSize: 13,
                                fontWeight: isCurrent ? '600' : '400',
                              }}
                            >
                              {d.format('ddd')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        )}

        {undoSnapshot ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 16,
              padding: 12,
              borderRadius: 10,
              backgroundColor: colors.surfaceSecondary,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 14 }}>
              Schedule updated
            </Text>
            <TouchableOpacity
              onPress={undo}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Undo reschedule"
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text
                style={{
                  color: colors.primary.main,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                Undo
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
