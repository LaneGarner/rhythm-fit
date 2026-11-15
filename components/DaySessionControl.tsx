import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import { buildSessionItems, nextSessionIndex } from '../utils/workoutSession';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DaySessionControl({
  date,
  navigation,
}: {
  date: string;
  navigation: any;
}) {
  const activities = useSelector((state: RootState) => state.activities.data);
  const controls = useWorkoutSession();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const items = useMemo(
    () => buildSessionItems(activities, date),
    [activities, date]
  );
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const session = controls.session?.date === date ? controls.session : null;
  const currentIndex = session ? nextSessionIndex(session, activities, session.index) : -1;
  const current = session?.items[currentIndex];
  if (!items.length && !current) return null;
  const navigate = (item: (typeof items)[number]) =>
    navigation.navigate(item.route, item.params);
  const begin = () => {
    const chosen = items.filter(item => selected.has(item.id));
    if (!chosen.length) return;
    const start = () => {
      controls.start(date, chosen);
      setOpen(false);
      navigate(chosen[0]);
    };
    if (controls.session)
      Alert.alert(
        'Replace current session?',
        'Completed workouts stay saved.',
        [
          { text: 'Keep Session', style: 'cancel' },
          { text: 'Start New Session', onPress: start },
        ]
      );
    else start();
  };
  return (
    <>
      <View
        style={{
          marginHorizontal: 16,
          marginVertical: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 4,
          borderRadius: 12,
          backgroundColor: colors.cardBackground,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: '600' }}>
            {current ? 'Session in progress' : 'Workout session'}
          </Text>
          <TouchableOpacity
            disabled={!controls.ready}
            accessibilityRole="button"
            onPress={() => {
              if (current) {
                const item = controls.resume();
                if (item) navigate(item);
              } else {
                setSelected(new Set(items.map(item => item.id)));
                setOpen(true);
              }
            }}
            style={{
              minHeight: 44,
              paddingHorizontal: 12,
              justifyContent: 'center',
              borderRadius: 10,
              backgroundColor: colors.primary.main,
              opacity: controls.ready ? 1 : 0.4,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>
              {current ? 'Resume' : 'Start session'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 14 }}>
            {current && session
              ? `Activity ${currentIndex + 1} of ${session.items.length} · ${current.label}`
              : 'Choose activities to do in order with automatic rest timers.'}
          </Text>
          {current && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={controls.end}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                End session
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            paddingTop: Math.max(20, insets.top),
            paddingBottom: Math.max(16, insets.bottom),
            backgroundColor: colors.background,
          }}
        >
          <View style={{ padding: 20, gap: 8 }}>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              accessibilityRole="button"
            >
              <Text style={{ color: colors.primary.main, fontSize: 16 }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 28, fontWeight: '700', color: colors.text }}
            >
              Start a session
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
              Choose what to do together. Leave anything else for later.
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
            {items.map(item => {
              const included = selected.has(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: included }}
                  accessibilityLabel={item.label}
                  onPress={() =>
                    setSelected(previous => {
                      const next = new Set(previous);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 18,
                    gap: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: included
                        ? colors.primary.main
                        : colors.textSecondary,
                      fontSize: 24,
                    }}
                  >
                    {included ? '✓' : '○'}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontSize: 17,
                      fontWeight: '500',
                    }}
                  >
                    {item.label}
                  </Text>
                  {!included && (
                    <Text style={{ color: colors.textSecondary }}>Later</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {selected.size} of {items.length} selected
          </Text>
          <TouchableOpacity
            disabled={!selected.size}
            onPress={begin}
            accessibilityRole="button"
            style={{
              margin: 20,
              padding: 16,
              borderRadius: 12,
              backgroundColor: colors.primary.main,
              opacity: selected.size ? 1 : 0.4,
            }}
          >
            <Text
              style={{
                color: colors.textInverse,
                textAlign: 'center',
                fontSize: 17,
                fontWeight: '600',
              }}
            >
              Start session
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}
