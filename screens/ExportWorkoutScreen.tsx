import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import HeaderButton from '../components/HeaderButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import {
  readWorkoutBackup,
  shareWorkoutExport,
} from '../services/workoutBackupService';
import {
  createWorkoutExport,
  ExportFormat,
  ExportRange,
  selectWorkoutData,
  workoutExportSummary,
  WorkoutBackupData,
} from '../utils/workoutExport';

const formats: { id: ExportFormat; label: string; detail: string }[] = [
  {
    id: 'json',
    label: 'JSON',
    detail: 'Full backup, including queued changes and any recovery copy.',
  },
  {
    id: 'csv',
    label: 'CSV',
    detail: 'One row per set for spreadsheets. Not a full backup.',
  },
  {
    id: 'text',
    label: 'Text',
    detail: 'A readable workout log to copy or save.',
  },
];
function Choice({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={{
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16 }}>{label}</Text>
        {detail && (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              marginTop: 4,
              lineHeight: 20,
            }}
          >
            {detail}
          </Text>
        )}
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? colors.primary.main : colors.textTertiary}
      />
    </TouchableOpacity>
  );
}
export default function ExportWorkoutScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { insets, hasTopTabBar } = useResponsiveLayout();
  const [source, setSource] = useState<WorkoutBackupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rangeType, setRangeType] = useState<'all' | 'dates'>('all');
  const [from, setFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [format, setFormat] = useState<ExportFormat>('json');
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setError(null);
    setSource(null);
    try {
      const data = await readWorkoutBackup(user?.id);
      const summary = workoutExportSummary(data);
      setFrom(summary.earliest || dayjs().format('YYYY-MM-DD'));
      setTo(summary.latest || dayjs().format('YYYY-MM-DD'));
      setSource(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to read local workouts.'
      );
    }
  }, [user?.id]);
  useEffect(() => {
    load();
  }, [load]);
  const range: ExportRange = useMemo(
    () => (rangeType === 'all' ? { type: 'all' } : { type: 'dates', from, to }),
    [rangeType, from, to]
  );
  const invalid = rangeType === 'dates' && from > to;
  const summary = useMemo(
    () =>
      source && !invalid
        ? workoutExportSummary(selectWorkoutData(source, range))
        : null,
    [source, range, invalid]
  );
  const panel = {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    overflow: 'hidden' as const,
  };
  const heading = {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500' as const,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 16,
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + (hasTopTabBar ? 64 : 16),
          paddingBottom: 16,
          paddingHorizontal: Math.max(16, insets.left),
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <HeaderButton label="Back" onPress={() => navigation.goBack()} />
        <Text
          accessibilityRole="header"
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
          }}
        >
          Export workout data
        </Text>
        <View style={{ width: 55 }} />
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        }}
      >
        <Text style={heading}>Date range</Text>
        <View style={panel}>
          <Choice
            label="All history"
            selected={rangeType === 'all'}
            onPress={() => setRangeType('all')}
          />
          <Choice
            label="Choose dates"
            selected={rangeType === 'dates'}
            onPress={() => setRangeType('dates')}
          />
          {rangeType === 'dates' && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
              {(['from', 'to'] as const).map(key => (
                <TouchableOpacity
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`${key === 'from' ? 'Start' : 'End'} date: ${key === 'from' ? from : to}`}
                  onPress={() => setPicker(key)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: colors.text }}>
                    {key === 'from' ? 'Start date' : 'End date'}
                  </Text>
                  <Text style={{ color: colors.primary.main }}>
                    {dayjs(key === 'from' ? from : to).format('MMM D, YYYY')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {invalid && (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.error.main, marginTop: 8 }}
          >
            End date must be on or after start date.
          </Text>
        )}
        <Text style={heading}>Format</Text>
        <View style={panel}>
          {formats.map(option => (
            <Choice
              key={option.id}
              label={option.label}
              detail={option.detail}
              selected={format === option.id}
              onPress={() => setFormat(option.id)}
            />
          ))}
        </View>
        <Text style={heading}>Summary</Text>
        <View style={[panel, { padding: 16, gap: 8 }]}>
          {!source && !error && (
            <ActivityIndicator accessibilityLabel="Reading local workout data" />
          )}
          {error && (
            <>
              <Text
                accessibilityRole="alert"
                style={{ color: colors.error.main }}
              >
                {error}
              </Text>
              <HeaderButton label="Try again" onPress={load} />
            </>
          )}
          {summary && (
            <>
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}
              >
                {summary.days} workout days · {summary.activities} activities ·{' '}
                {summary.sets} sets
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {summary.earliest && summary.latest
                  ? `${dayjs(summary.earliest).format('MMM D, YYYY')} – ${dayjs(summary.latest).format('MMM D, YYYY')}`
                  : 'No dated activities in this range.'}
              </Text>
              {format === 'json' && (
                <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
                  Also includes {summary.pending} queued changes
                  {source?.preSyncSnapshot
                    ? ` and a recovery copy with ${summary.recoveryActivities} activities`
                    : ''}
                  .
                </Text>
              )}
              {rangeType === 'dates' && format === 'json' && (
                <Text style={{ color: colors.textSecondary }}>
                  This is a date-range backup, not your full history.
                </Text>
              )}
            </>
          )}
        </View>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            lineHeight: 20,
            marginVertical: 16,
          }}
        >
          Uses data saved on this phone. Works offline and while signed out.
          Sign-in credentials are excluded.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Export workout data"
          accessibilityState={{ disabled: !summary || busy || invalid }}
          disabled={!summary || busy || invalid}
          onPress={async () => {
            if (!source) return;
            setBusy(true);
            try {
              await shareWorkoutExport(source, range, format);
            } catch (error) {
              Alert.alert(
                'Export Not Saved',
                error instanceof Error ? error.message : 'Please try again.'
              );
            } finally {
              setBusy(false);
            }
          }}
          style={{
            backgroundColor: colors.primary.main,
            padding: 16,
            borderRadius: 10,
            opacity: !summary || busy || invalid ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              textAlign: 'center',
              color: colors.textInverse,
              fontSize: 16,
              fontWeight: '600',
            }}
          >
            {busy ? 'Preparing export…' : 'Export data'}
          </Text>
        </TouchableOpacity>
        {format === 'text' && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Copy workout text"
            disabled={!summary || busy || invalid}
            onPress={async () => {
              if (!source) return;
              setBusy(true);
              try {
                await Clipboard.setStringAsync(
                  createWorkoutExport(source, range, 'text').contents
                );
                Alert.alert('Copied', 'Workout log copied.');
              } catch (error) {
                Alert.alert(
                  'Could Not Copy',
                  error instanceof Error ? error.message : 'Please try again.'
                );
              } finally {
                setBusy(false);
              }
            }}
            style={{ padding: 16, alignItems: 'center' }}
          >
            <Text style={{ color: colors.primary.main, fontSize: 16 }}>
              Copy text
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      {picker &&
        (Platform.OS === 'ios' ? (
          <Modal
            transparent
            animationType="slide"
            onRequestClose={() => setPicker(null)}
          >
            <View
              style={{
                flex: 1,
                justifyContent: 'flex-end',
                backgroundColor: '#00000055',
              }}
            >
              <View
                style={{
                  backgroundColor: colors.surface,
                  padding: 16,
                  paddingBottom: Math.max(insets.bottom, 16),
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>
                    {picker === 'from' ? 'Start date' : 'End date'}
                  </Text>
                  <HeaderButton label="Done" onPress={() => setPicker(null)} />
                </View>
                <DateTimePicker
                  value={dayjs(picker === 'from' ? from : to).toDate()}
                  mode="date"
                  display="spinner"
                  onChange={(_event, date) => {
                    if (date)
                      (picker === 'from' ? setFrom : setTo)(
                        dayjs(date).format('YYYY-MM-DD')
                      );
                  }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={dayjs(picker === 'from' ? from : to).toDate()}
            mode="date"
            onChange={(_event, date) => {
              if (date)
                (picker === 'from' ? setFrom : setTo)(
                  dayjs(date).format('YYYY-MM-DD')
                );
              setPicker(null);
            }}
          />
        ))}
    </View>
  );
}
