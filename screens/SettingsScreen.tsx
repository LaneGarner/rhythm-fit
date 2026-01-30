import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch } from 'react-redux';
import HeaderButton from '../components/HeaderButton';
import { HEADER_STYLES } from '../constants';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { clearSyncData } from '../services/syncService';
import { clearUserData } from '../utils/storage';
import { clearAllActivities } from '../redux/activitySlice';
import { isBackendConfigured } from '../config/api';

export default function SettingsScreen({ navigation }: any) {
  const { themeMode, setThemeMode, colorScheme, colors } = useTheme();
  const { user, signOut, isConfigured } = useAuth();
  const { firstDayOfWeek, setFirstDayOfWeek } = usePreferences();
  const dispatch = useDispatch();
  const isDark = colorScheme === 'dark';
  const showAccountSection = isConfigured && isBackendConfigured();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearUserData();
          await clearSyncData();
          dispatch(clearAllActivities());
          await signOut();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          });
        },
      },
    ]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View
        className={HEADER_STYLES}
        style={{
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
            Settings
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
            onPress={() => navigation.navigate('EmojiLibrary')}
          >
            <View className="flex-1">
              <Text
                className="text-base font-medium"
                style={{ color: colors.text }}
              >
                Custom Emojis
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ color: colors.textSecondary }}
              >
                Manage emojis you've added
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
          {/* Dark Mode */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-4"
            onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
          >
            <Text className="text-base" style={{ color: colors.text }}>
              Dark Mode
            </Text>
            <Switch
              value={isDark}
              onValueChange={value => setThemeMode(value ? 'dark' : 'light')}
              trackColor={{
                false: colors.toggleTrack,
                true: colors.primary.main,
              }}
              thumbColor="#ffffff"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
