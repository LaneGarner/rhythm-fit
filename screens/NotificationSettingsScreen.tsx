import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import HeaderButton from '../components/HeaderButton';
import { usePreferences } from '../context/PreferencesContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import {
  getPermissionStatus,
  requestPermission,
} from '../services/notifications';
import { useTheme } from '../theme/ThemeContext';
import { NotificationSettings } from '../types/preferences';

type PickerTarget =
  | 'scheduledReminderTime'
  | 'inactivityTime'
  | 'weeklySummaryTime'
  | null;

function parseHHMMToDate(value: string): Date {
  const [h, m] = value.split(':');
  const date = new Date();
  date.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0, 0, 0);
  return date;
}

function dateToHHMM(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatDisplayTime(value: string): string {
  const [hStr, mStr] = value.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

export default function NotificationSettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { insets } = useResponsiveLayout();
  const { notificationSettings, setNotificationSettings } = usePreferences();
  const [permissionStatus, setPermissionStatus] =
    useState<string>('undetermined');
  const [picker, setPicker] = useState<PickerTarget>(null);

  useEffect(() => {
    getPermissionStatus().then(setPermissionStatus);
  }, []);

  const update = (patch: Partial<NotificationSettings>) => {
    setNotificationSettings({ ...notificationSettings, ...patch });
  };

  const handleEnableNotifications = async () => {
    const status = await requestPermission();
    setPermissionStatus(status);
    if (status !== 'granted') {
      // If blocked, user must go to Settings
      Linking.openSettings();
    } else {
      update({ enabled: true });
    }
  };

  const permissionDenied =
    permissionStatus === 'denied' || permissionStatus === 'blocked';
  const permissionGranted = permissionStatus === 'granted';

  const Row = ({
    label,
    description,
    value,
    onValueChange,
    disabled,
  }: {
    label: string;
    description?: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      className="flex-row items-center justify-between p-4"
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
    >
      <View className="flex-1 mr-3">
        <Text
          className="text-base"
          style={{ color: disabled ? colors.textSecondary : colors.text }}
        >
          {label}
        </Text>
        {description && (
          <Text
            className="text-sm mt-1"
            style={{ color: colors.textSecondary }}
          >
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: colors.toggleTrack,
          true: colors.primary.main,
        }}
        thumbColor="#ffffff"
      />
    </TouchableOpacity>
  );

  const TimeRow = ({
    label,
    value,
    onPress,
    disabled,
  }: {
    label: string;
    value: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between p-4"
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatDisplayTime(value)}`}
    >
      <Text
        className="text-base"
        style={{ color: disabled ? colors.textSecondary : colors.text }}
      >
        {label}
      </Text>
      <Text
        className="text-base"
        style={{
          color: disabled ? colors.textSecondary : colors.primary.main,
        }}
      >
        {formatDisplayTime(value)}
      </Text>
    </TouchableOpacity>
  );

  const Divider = () => (
    <View
      style={{
        height: 0.5,
        backgroundColor: colors.border,
        marginLeft: 16,
      }}
    />
  );

  const disabled = !notificationSettings.enabled || !permissionGranted;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View
        className="pb-4 px-4 flex-row items-center"
        style={{
          paddingTop: insets.top + 8,
          paddingLeft: Math.max(16, insets.left),
          paddingRight: Math.max(16, insets.right),
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        }}
      >
        <HeaderButton label="Back" onPress={() => navigation.goBack()} />
        <View className="flex-1 items-center">
          <Text className="text-2xl font-bold" style={{ color: colors.text }}>
            Notifications
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {permissionDenied && (
          <View
            style={{
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 10,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <Text
              className="text-base font-medium mb-1"
              style={{ color: colors.text }}
            >
              Notifications are off
            </Text>
            <Text
              className="text-sm mb-3"
              style={{ color: colors.textSecondary }}
            >
              Enable notifications in your device settings to receive reminders.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openSettings()}
              style={{
                backgroundColor: colors.primary.main,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                alignSelf: 'flex-start',
              }}
              accessibilityRole="button"
              accessibilityLabel="Open device settings"
            >
              <Text style={{ color: colors.textInverse, fontWeight: '600' }}>
                Open Settings
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {permissionStatus === 'undetermined' && (
          <View style={{ marginBottom: 24 }}>
            <TouchableOpacity
              onPress={handleEnableNotifications}
              style={{
                backgroundColor: colors.primary.main,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel="Enable notifications"
            >
              <Text
                style={{
                  color: colors.textInverse,
                  fontWeight: '600',
                  fontSize: 16,
                }}
              >
                Enable Notifications
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View
          style={{
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 10,
            marginBottom: 24,
            overflow: 'hidden',
          }}
        >
          <Row
            label="Notifications"
            description="Master switch for all Rhythm notifications."
            value={notificationSettings.enabled && permissionGranted}
            onValueChange={async v => {
              if (v && !permissionGranted) {
                await handleEnableNotifications();
              } else {
                update({ enabled: v });
              }
            }}
          />
        </View>

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            fontWeight: '500',
            marginBottom: 8,
            marginLeft: 16,
          }}
        >
          Workouts
        </Text>
        <View
          style={{
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 10,
            marginBottom: 24,
            overflow: 'hidden',
          }}
        >
          <Row
            label="Timer completion"
            description="Alert when your countdown or EMOM finishes in the background."
            value={notificationSettings.timerCompletion}
            onValueChange={v => update({ timerCompletion: v })}
            disabled={disabled}
          />
          <Divider />
          <Row
            label="Unfinished workouts"
            description="Remind you 30 min after leaving a workout with partial progress."
            value={notificationSettings.unfinishedWorkout}
            onValueChange={v => update({ unfinishedWorkout: v })}
            disabled={disabled}
          />
          <Divider />
          <Row
            label="Daily reminder"
            description="Morning nudge when today's workout isn't complete."
            value={notificationSettings.scheduledReminder}
            onValueChange={v => update({ scheduledReminder: v })}
            disabled={disabled}
          />
          {notificationSettings.scheduledReminder && (
            <>
              <Divider />
              <TimeRow
                label="Reminder time"
                value={notificationSettings.scheduledReminderTime}
                onPress={() => setPicker('scheduledReminderTime')}
                disabled={disabled}
              />
            </>
          )}
        </View>

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            fontWeight: '500',
            marginBottom: 8,
            marginLeft: 16,
          }}
        >
          Consistency
        </Text>
        <View
          style={{
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 10,
            marginBottom: 24,
            overflow: 'hidden',
          }}
        >
          <Row
            label="Inactivity nudge"
            description="Check in if you haven't logged a workout for a while."
            value={notificationSettings.inactivityNudge}
            onValueChange={v => update({ inactivityNudge: v })}
            disabled={disabled}
          />
          {notificationSettings.inactivityNudge && (
            <>
              <Divider />
              <View className="p-4 flex-row items-center justify-between">
                <Text
                  className="text-base"
                  style={{
                    color: disabled ? colors.textSecondary : colors.text,
                  }}
                >
                  Trigger after (days)
                </Text>
                <TextInput
                  keyboardType="number-pad"
                  value={String(notificationSettings.inactivityThresholdDays)}
                  editable={!disabled}
                  onChangeText={v => {
                    const n = Math.max(1, Math.min(30, parseInt(v, 10) || 0));
                    update({ inactivityThresholdDays: n });
                  }}
                  style={{
                    minWidth: 60,
                    textAlign: 'right',
                    fontSize: 16,
                    color: disabled
                      ? colors.textSecondary
                      : colors.primary.main,
                  }}
                  accessibilityLabel="Inactivity threshold in days"
                />
              </View>
              <Divider />
              <TimeRow
                label="Nudge time"
                value={notificationSettings.inactivityTime}
                onPress={() => setPicker('inactivityTime')}
                disabled={disabled}
              />
            </>
          )}
          <Divider />
          <Row
            label="Weekly summary"
            description="Sunday recap of workouts completed this week."
            value={notificationSettings.weeklySummary}
            onValueChange={v => update({ weeklySummary: v })}
            disabled={disabled}
          />
          {notificationSettings.weeklySummary && (
            <>
              <Divider />
              <TimeRow
                label="Summary time"
                value={notificationSettings.weeklySummaryTime}
                onPress={() => setPicker('weeklySummaryTime')}
                disabled={disabled}
              />
            </>
          )}
        </View>
      </ScrollView>

      {picker !== null && (
        <View>
          <DateTimePicker
            value={parseHHMMToDate(notificationSettings[picker])}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              if (Platform.OS === 'android') {
                setPicker(null);
              }
              if (selectedDate) {
                update({
                  [picker]: dateToHHMM(selectedDate),
                } as Partial<NotificationSettings>);
              }
            }}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={() => setPicker(null)}
              style={{
                padding: 12,
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
              accessibilityRole="button"
              accessibilityLabel="Done selecting time"
            >
              <Text
                style={{
                  color: colors.primary.main,
                  fontSize: 17,
                  fontWeight: '600',
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
