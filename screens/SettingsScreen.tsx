import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch } from 'react-redux';
import HeaderButton from '../components/HeaderButton';
import SegmentedControl from '../components/SegmentedControl';
import { useTutorial } from '../components/tutorial';
import { ThemePreference, useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { clearSyncData, flushPendingSync } from '../services/syncService';
import { clearUserData } from '../utils/storage';
import { clearAllActivities } from '../redux/activitySlice';
import { isBackendConfigured } from '../config/api';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { deleteAccount } from '../services/accountService';
import {
  AI_DATA_DISCLOSURE,
  grantAIDataConsent,
  hasAIDataConsent,
  revokeAIDataConsent,
} from '../services/aiConsentService';
import {
  MANAGE_SUBSCRIPTIONS_URL,
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
  TERMS_OF_USE_URL,
} from '../services/legalLinks';

export default function SettingsScreen({ navigation }: any) {
  const { themePreference, setThemePreference, colorScheme, colors } =
    useTheme();
  const { user, signOut, isConfigured, getAccessToken } = useAuth();
  const {
    firstDayOfWeek,
    setFirstDayOfWeek,
    autoRestTimer,
    setAutoRestTimer,
    timerVibration,
    setTimerVibration,
    timerSound,
    setTimerSound,
  } = usePreferences();
  const {
    startTutorial,
    registerTarget,
    unregisterTarget,
    isActive: tutorialActive,
  } = useTutorial();
  const dispatch = useDispatch();
  const { insets, isLandscape } = useResponsiveLayout();
  const equipmentRef = useRef<View>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [aiDataSharingEnabled, setAIDataSharingEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setAIDataSharingEnabled(false);
      return () => {
        active = false;
      };
    }
    hasAIDataConsent(user.id)
      .then(enabled => {
        if (active) setAIDataSharingEnabled(enabled);
      })
      .catch(() => {
        if (active) setAIDataSharingEnabled(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const registerEquipment = useCallback(() => {
    if (equipmentRef.current) {
      equipmentRef.current.measure((x, y, width, height, pageX, pageY) => {
        registerTarget('equipment-setting', {
          x,
          y,
          width,
          height,
          pageX,
          pageY,
        });
      });
    }
  }, [registerTarget]);

  useEffect(() => {
    if (tutorialActive) {
      const timer = setTimeout(registerEquipment, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      unregisterTarget('equipment-setting');
    };
  }, [tutorialActive, registerEquipment, unregisterTarget]);
  const showAccountSection = isConfigured && isBackendConfigured();

  const handleStartTutorial = () => {
    navigation.navigate('Main', { screen: 'Weekly' });
    // Small delay to ensure navigation completes
    setTimeout(() => {
      startTutorial();
    }, 100);
  };

  // The Auth screen is only registered in the navigator while signed out, so
  // we can't reset to it synchronously right after signOut() — `user` only
  // flips to null on the next render. Flag the intent here and let the effect
  // below navigate once the Auth screen is actually back in the stack.
  const pendingSignOutRef = useRef(false);

  useEffect(() => {
    if (pendingSignOutRef.current && !user) {
      pendingSignOutRef.current = false;
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    }
  }, [user, navigation]);

  const performSignOut = async () => {
    await clearUserData();
    await clearSyncData();
    dispatch(clearAllActivities());
    pendingSignOutRef.current = true;
    await signOut();
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          // Sign-out wipes local data and the pending sync queue — push any
          // unsynced changes first so they aren't silently discarded.
          const token = await getAccessToken();
          const flushed = token ? await flushPendingSync(token) : true;
          if (flushed) {
            await performSignOut();
            return;
          }
          Alert.alert(
            'Some changes haven’t synced',
            'Recent workout changes could not be uploaded. Signing out now will permanently discard them.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign Out Anyway',
                style: 'destructive',
                onPress: performSignOut,
              },
            ]
          );
        },
      },
    ]);
  };

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to Open Link', 'Please try again in a moment.');
    }
  };

  const performAccountDeletion = async () => {
    if (!user || isDeletingAccount) return;
    setIsDeletingAccount(true);
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Your session has expired. Sign in and try again.');
      }
      await deleteAccount(token);
    } catch (error) {
      Alert.alert(
        'Account Not Deleted',
        error instanceof Error
          ? error.message
          : 'The account could not be deleted. Please try again.'
      );
      setIsDeletingAccount(false);
      return;
    }

    // Remote deletion is irreversible. Local cleanup is best-effort and must
    // never make the UI claim the account still exists.
    await Promise.allSettled([
      revokeAIDataConsent(user.id),
      clearUserData(),
      clearSyncData(),
    ]);
    dispatch(clearAllActivities());
    pendingSignOutRef.current = true;
    await signOut();
    setIsDeletingAccount(false);
  };

  const confirmAccountDeletion = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your profile, workouts, preferences, and AI coach history. It does not cancel an Apple subscription.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Manage Subscription',
          onPress: () => openLink(MANAGE_SUBSCRIPTIONS_URL),
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Delete Account Permanently?',
              'This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Permanently',
                  style: 'destructive',
                  onPress: performAccountDeletion,
                },
              ]
            ),
        },
      ]
    );
  };

  const changeAIDataSharing = async (enabled: boolean) => {
    if (!user) return;
    if (!enabled) {
      await revokeAIDataConsent(user.id);
      setAIDataSharingEnabled(false);
      return;
    }

    Alert.alert('Allow AI coach data sharing?', AI_DATA_DISCLOSURE, [
      { text: 'Not Now', style: 'cancel' },
      {
        text: 'Allow',
        onPress: async () => {
          try {
            await grantAIDataConsent(user.id);
            setAIDataSharingEnabled(true);
          } catch {
            Alert.alert(
              'Choice Not Saved',
              'Please try again before using the AI coach.'
            );
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View
        className="pb-4 px-4 bg-white border-b border-gray-200 flex-row items-center"
        style={{
          paddingTop: insets.top + 8,
          paddingLeft: Math.max(16, insets.left),
          paddingRight: Math.max(16, insets.right),
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        }}
      >
        <HeaderButton label="Back" onPress={() => navigation.goBack()} />
        <View className="flex-1 items-center">
          <Text
            className="text-2xl font-bold mt-0"
            style={{ color: colors.text }}
          >
            Settings & Preferences
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        className="flex-1 px-6 pt-8"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Account Section */}
        {showAccountSection && (
          <>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 15,
                fontWeight: '500',
                marginBottom: 8,
                marginLeft: 16,
              }}
            >
              Account
            </Text>
            {user ? (
              <View style={{ marginBottom: 32 }}>
                <View
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <View className="p-4">
                    <Text
                      className="text-sm"
                      style={{ color: colors.textSecondary }}
                    >
                      Signed in as
                    </Text>
                    <Text
                      className="text-base font-medium mt-1"
                      style={{ color: colors.text }}
                    >
                      {user.email}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 0.5,
                      backgroundColor: colors.border,
                      marginLeft: 16,
                    }}
                  />
                  <TouchableOpacity
                    hitSlop={14}
                    className="p-4"
                    onPress={handleLogout}
                  >
                    <Text className="text-red-500 text-center font-medium">
                      Sign Out
                    </Text>
                  </TouchableOpacity>
                  <View
                    style={{
                      height: 0.5,
                      backgroundColor: colors.border,
                      marginLeft: 16,
                    }}
                  />
                  <TouchableOpacity
                    hitSlop={14}
                    className="p-4"
                    onPress={() => openLink(MANAGE_SUBSCRIPTIONS_URL)}
                    accessibilityRole="link"
                  >
                    <Text
                      className="text-center font-medium"
                      style={{ color: colors.primary.main }}
                    >
                      Manage Apple Subscription
                    </Text>
                  </TouchableOpacity>
                  <View
                    style={{
                      height: 0.5,
                      backgroundColor: colors.border,
                      marginLeft: 16,
                    }}
                  />
                  <TouchableOpacity
                    hitSlop={14}
                    className="p-4"
                    onPress={confirmAccountDeletion}
                    disabled={isDeletingAccount}
                    accessibilityRole="button"
                    accessibilityLabel="Delete account"
                    accessibilityState={{ disabled: isDeletingAccount }}
                    style={{ opacity: isDeletingAccount ? 0.6 : 1 }}
                  >
                    <Text className="text-red-500 text-center font-medium">
                      {isDeletingAccount
                        ? 'Deleting Account…'
                        : 'Delete Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: 32 }}>
                <View
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <View className="p-4">
                    <Text
                      className="text-sm"
                      style={{ color: colors.textSecondary }}
                    >
                      Sign in to sync your workouts across devices
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 0.5,
                      backgroundColor: colors.border,
                      marginLeft: 16,
                    }}
                  />
                  <TouchableOpacity
                    hitSlop={14}
                    className="p-4"
                    onPress={() =>
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Auth' }],
                      })
                    }
                  >
                    <Text
                      style={{ color: colors.primary.main }}
                      className="text-center font-medium"
                    >
                      Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {user && (
          <>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 15,
                fontWeight: '500',
                marginBottom: 8,
                marginLeft: 16,
              }}
            >
              AI Coach Privacy
            </Text>
            <View
              style={{
                backgroundColor: colors.surfaceSecondary,
                borderRadius: 10,
                marginBottom: 32,
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                className="flex-row items-center justify-between p-4"
                onPress={() => changeAIDataSharing(!aiDataSharingEnabled)}
                accessibilityRole="switch"
                accessibilityLabel="Share data with OpenAI for AI Coach"
                accessibilityState={{ checked: aiDataSharingEnabled }}
              >
                <View className="flex-1 mr-3">
                  <Text className="text-base" style={{ color: colors.text }}>
                    AI Coach Data Sharing
                  </Text>
                  <Text
                    className="text-sm mt-1"
                    style={{ color: colors.textSecondary }}
                  >
                    Allow coach messages and relevant fitness context to be
                    processed by OpenAI. Turning this off disables AI Coach
                    requests.
                  </Text>
                </View>
                <Switch
                  value={aiDataSharingEnabled}
                  onValueChange={changeAIDataSharing}
                  trackColor={{
                    false: colors.toggleTrack,
                    true: colors.primary.main,
                  }}
                  thumbColor="#ffffff"
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Library Section */}
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            fontWeight: '500',
            marginBottom: 8,
            marginLeft: 16,
            marginTop: 8,
          }}
        >
          Library
        </Text>
        <View
          style={{
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 10,
            marginBottom: 32,
            overflow: 'hidden',
          }}
        >
          <TouchableOpacity
            ref={equipmentRef}
            onLayout={registerEquipment}
            hitSlop={14}
            className="p-4 flex-row items-center justify-between"
            onPress={() => navigation.navigate('Equipment')}
          >
            <View className="flex-1">
              <Text
                className="text-base font-medium"
                style={{ color: colors.text }}
              >
                Equipment
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: colors.textSecondary }}
              >
                Configure your barbells & plates
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
          <View
            style={{
              height: 0.5,
              backgroundColor: colors.border,
              marginLeft: 16,
            }}
          />
          <TouchableOpacity
            hitSlop={14}
            className="p-4 flex-row items-center justify-between"
            onPress={() => navigation.navigate('ActivityLibrary')}
          >
            <View className="flex-1">
              <Text
                className="text-base font-medium"
                style={{ color: colors.text }}
              >
                Custom Activities
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: colors.textSecondary }}
              >
                Manage activities you've created
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Tools Section */}
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            fontWeight: '500',
            marginBottom: 8,
            marginLeft: 16,
          }}
        >
          Tools
        </Text>
        <View
          style={{
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 10,
            marginBottom: 32,
            overflow: 'hidden',
          }}
        >
          <TouchableOpacity
            hitSlop={14}
            className="p-4 flex-row items-center justify-between"
            onPress={() => navigation.navigate('Calculator')}
          >
            <View className="flex-1">
              <Text
                className="text-base font-medium"
                style={{ color: colors.text }}
              >
                Weight Calculator
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: colors.textSecondary }}
              >
                Find which plates to load for a target weight
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            fontWeight: '500',
            marginBottom: 8,
            marginLeft: 16,
          }}
        >
          Preferences
        </Text>
        <View
          style={{
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {/* First Day of Week */}
          <View className="p-4">
            <Text
              className="text-base font-medium mb-3"
              style={{ color: colors.text }}
            >
              First Day of Week
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setFirstDayOfWeek(0)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor:
                    firstDayOfWeek === 0
                      ? colors.primary.main
                      : colors.backgroundTertiary,
                }}
                accessibilityRole="button"
                accessibilityLabel={`Sunday${firstDayOfWeek === 0 ? ', selected' : ''}`}
                accessibilityState={{ selected: firstDayOfWeek === 0 }}
              >
                <Text
                  className="text-center font-medium"
                  style={{
                    color:
                      firstDayOfWeek === 0 ? colors.textInverse : colors.text,
                  }}
                >
                  Sunday
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFirstDayOfWeek(1)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor:
                    firstDayOfWeek === 1
                      ? colors.primary.main
                      : colors.backgroundTertiary,
                }}
                accessibilityRole="button"
                accessibilityLabel={`Monday${firstDayOfWeek === 1 ? ', selected' : ''}`}
                accessibilityState={{ selected: firstDayOfWeek === 1 }}
              >
                <Text
                  className="text-center font-medium"
                  style={{
                    color:
                      firstDayOfWeek === 1 ? colors.textInverse : colors.text,
                  }}
                >
                  Monday
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View
            style={{
              height: 0.5,
              backgroundColor: colors.border,
              marginLeft: 16,
            }}
          />
          {/* Appearance */}
          <View className="p-4">
            <Text className="text-base mb-3" style={{ color: colors.text }}>
              Appearance
            </Text>
            <SegmentedControl<ThemePreference>
              options={[
                {
                  value: 'system',
                  label: 'System',
                  icon: 'phone-portrait-outline',
                },
                { value: 'light', label: 'Light', icon: 'sunny-outline' },
                { value: 'dark', label: 'Dark', icon: 'moon-outline' },
              ]}
              value={themePreference}
              onValueChange={setThemePreference}
              accessibilityLabel="Appearance mode"
            />
            <Text
              className="text-xs mt-2"
              style={{ color: colors.textSecondary }}
            >
              {themePreference === 'system'
                ? 'Matches device settings'
                : themePreference === 'light'
                  ? 'Always light'
                  : 'Always dark'}
            </Text>
          </View>
          <View
            style={{
              height: 0.5,
              backgroundColor: colors.border,
              marginLeft: 16,
            }}
          />
          {/* Auto Rest Timer */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4"
            onPress={() => setAutoRestTimer(!autoRestTimer)}
            accessibilityRole="switch"
            accessibilityLabel="Auto rest timer"
            accessibilityState={{ checked: autoRestTimer }}
          >
            <View className="flex-1 mr-3">
              <Text className="text-base" style={{ color: colors.text }}>
                Auto Rest Timer
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: colors.textSecondary }}
              >
                Automatically starts a countdown timer after completing a set.
              </Text>
            </View>
            <Switch
              value={autoRestTimer}
              onValueChange={setAutoRestTimer}
              trackColor={{
                false: colors.toggleTrack,
                true: colors.primary.main,
              }}
              thumbColor="#ffffff"
            />
          </TouchableOpacity>
          <View
            style={{
              height: 0.5,
              backgroundColor: colors.border,
              marginLeft: 16,
            }}
          />
          {/* Timer Vibration */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4"
            onPress={() => setTimerVibration(!timerVibration)}
            accessibilityRole="switch"
            accessibilityLabel="Timer vibration"
            accessibilityState={{ checked: timerVibration }}
          >
            <View className="flex-1 mr-3">
              <Text className="text-base" style={{ color: colors.text }}>
                Timer Vibration
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: colors.textSecondary }}
              >
                Vibrate when the countdown timer finishes.
              </Text>
            </View>
            <Switch
              value={timerVibration}
              onValueChange={setTimerVibration}
              trackColor={{
                false: colors.toggleTrack,
                true: colors.primary.main,
              }}
              thumbColor="#ffffff"
            />
          </TouchableOpacity>
          <View
            style={{
              height: 0.5,
              backgroundColor: colors.border,
              marginLeft: 16,
            }}
          />
          {/* Timer Sound */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4"
            onPress={() => setTimerSound(!timerSound)}
            accessibilityRole="switch"
            accessibilityLabel="Timer sound"
            accessibilityState={{ checked: timerSound }}
          >
            <View className="flex-1 mr-3">
              <Text className="text-base" style={{ color: colors.text }}>
                Timer Sound
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: colors.textSecondary }}
              >
                Play a sound when the countdown timer finishes.
              </Text>
            </View>
            <Switch
              value={timerSound}
              onValueChange={setTimerSound}
              trackColor={{
                false: colors.toggleTrack,
                true: colors.primary.main,
              }}
              thumbColor="#ffffff"
            />
          </TouchableOpacity>
          <View
            style={{
              height: 0.5,
              backgroundColor: colors.border,
              marginLeft: 16,
            }}
          />
          {/* Notifications */}
          <TouchableOpacity
            hitSlop={14}
            className="p-4 flex-row items-center justify-between"
            onPress={() => navigation.navigate('NotificationSettings')}
            accessibilityRole="button"
            accessibilityLabel="Notification settings"
          >
            <View className="flex-1">
              <Text
                className="text-base font-medium"
                style={{ color: colors.text }}
              >
                Notifications
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: colors.textSecondary }}
              >
                Reminders, timers, and summaries
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
          <View
            style={{
              height: 0.5,
              backgroundColor: colors.border,
              marginLeft: 16,
            }}
          />
          {/* App Tutorial */}
          <TouchableOpacity
            hitSlop={14}
            className="p-4 flex-row items-center justify-between"
            onPress={handleStartTutorial}
            accessibilityRole="button"
            accessibilityLabel="Start app tutorial"
          >
            <View className="flex-1">
              <Text
                className="text-base font-medium"
                style={{ color: colors.text }}
              >
                App Tutorial
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: colors.textSecondary }}
              >
                Learn how to use Rhythm
              </Text>
            </View>
            <Ionicons
              name="play-circle-outline"
              size={22}
              color={colors.primary.main}
            />
          </TouchableOpacity>
        </View>

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            fontWeight: '500',
            marginBottom: 8,
            marginLeft: 16,
            marginTop: 32,
          }}
        >
          Legal &amp; Support
        </Text>
        <View
          style={{
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {[
            ['Privacy Policy', PRIVACY_POLICY_URL],
            ['Terms of Use', TERMS_OF_USE_URL],
            ['Support', SUPPORT_URL],
            ['Manage Subscription', MANAGE_SUBSCRIPTIONS_URL],
          ].map(([label, url], index) => (
            <React.Fragment key={label}>
              {index > 0 && (
                <View
                  style={{
                    height: 0.5,
                    backgroundColor: colors.border,
                    marginLeft: 16,
                  }}
                />
              )}
              <TouchableOpacity
                hitSlop={14}
                className="p-4 flex-row items-center justify-between"
                onPress={() => openLink(url)}
                accessibilityRole="link"
                accessibilityLabel={label}
              >
                <Text className="text-base" style={{ color: colors.text }}>
                  {label}
                </Text>
                <Ionicons
                  name="open-outline"
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
