import React from 'react';
import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch } from 'react-redux';
import HeaderButton from '../components/HeaderButton';
import { HEADER_STYLES } from '../constants';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { clearSyncData } from '../services/syncService';
import { clearUserData } from '../utils/storage';
import { clearAllActivities } from '../redux/activitySlice';
import { isBackendConfigured } from '../config/api';


export default function SettingsScreen({ navigation }: any) {
  const { themeMode, setThemeMode, colorScheme, colors } = useTheme();
  const { user, signOut, isConfigured } = useAuth();
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

      <View className="flex-1 px-6 pt-8">
        {/* Account Section */}
        {showAccountSection && (
          <>
            <Text
              className="text-lg font-semibold mb-4"
              style={{ color: colors.text }}
            >
              Account
            </Text>
            {user ? (
              <View className="mb-8">
                <View
                  className="p-4 rounded-lg mb-3"
                  style={{ backgroundColor: colors.surfaceSecondary }}
                >
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
                <TouchableOpacity
                  hitSlop={14}
                  className="p-4 rounded-lg border border-red-500"
                  style={{ backgroundColor: isDark ? '#1a0000' : '#fff5f5' }}
                  onPress={handleLogout}
                >
                  <Text className="text-red-500 text-center font-medium">
                    Sign Out
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="mb-8">
                <Text
                  className="text-sm mb-3"
                  style={{ color: colors.textSecondary }}
                >
                  Sign in to sync your workouts across devices
                </Text>
                <TouchableOpacity
                  hitSlop={14}
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: colors.primary.main }}
                  onPress={() =>
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Auth' }],
                    })
                  }
                >
                  <Text className="text-white text-center font-medium">
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Library Section */}
        <Text
          className="text-lg font-semibold mb-4"
          style={{ color: colors.text }}
        >
          Library
        </Text>
        <TouchableOpacity
          hitSlop={14}
          className="p-4 rounded-lg mb-3 flex-row items-center justify-between"
          style={{ backgroundColor: colors.surfaceSecondary }}
          onPress={() => navigation.navigate('Equipment')}
        >
          <View>
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
          <Text style={{ color: colors.textSecondary, fontSize: 18 }}>
            {'>'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={14}
          className="p-4 rounded-lg mb-3 flex-row items-center justify-between"
          style={{ backgroundColor: colors.surfaceSecondary }}
          onPress={() => navigation.navigate('ActivityLibrary')}
        >
          <View>
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
          <Text style={{ color: colors.textSecondary, fontSize: 18 }}>
            {'>'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={14}
          className="p-4 rounded-lg mb-8 flex-row items-center justify-between"
          style={{ backgroundColor: colors.surfaceSecondary }}
          onPress={() => navigation.navigate('EmojiLibrary')}
        >
          <View>
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
          <Text style={{ color: colors.textSecondary, fontSize: 18 }}>
            {'>'}
          </Text>
        </TouchableOpacity>

        {/* Appearance Section */}
        <Text
          className="text-lg font-semibold mb-4"
          style={{ color: colors.text }}
        >
          Appearance
        </Text>
        <View
          className="flex-row items-center justify-between p-4 rounded-lg"
          style={{ backgroundColor: colors.surfaceSecondary }}
        >
          <Text className="text-base" style={{ color: colors.text }}>
            Dark Mode
          </Text>
          <Switch
            value={isDark}
            onValueChange={value => setThemeMode(value ? 'dark' : 'light')}
            trackColor={{ false: '#767577', true: colors.primary.main }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    </View>
  );
}
