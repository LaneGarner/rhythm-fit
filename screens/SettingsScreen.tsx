import React, { useContext } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { HEADER_STYLES } from '../constants';
import { ThemeContext } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { clearSyncData } from '../services/syncService';
import { clearUserData } from '../utils/storage';
import { clearAllActivities } from '../redux/activitySlice';
import { isBackendConfigured } from '../config/api';

const modes = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function SettingsScreen({ navigation }: any) {
  const { themeMode, setThemeMode, colorScheme } = useContext(ThemeContext);
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
    <View
      className="flex-1"
      style={{ backgroundColor: isDark ? '#000' : '#fff' }}
    >
      <View
        className={HEADER_STYLES}
        style={{
          backgroundColor: isDark ? '#111' : '#fff',
          borderBottomColor: isDark ? '#222' : '#e5e7eb',
        }}
      >
        <TouchableOpacity hitSlop={14} onPress={() => navigation.goBack()}>
          <Text className="text-blue-500 text-lg">Back</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text
            className="text-2xl font-bold mt-0"
            style={{ color: isDark ? '#fff' : '#111' }}
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
              style={{ color: isDark ? '#e5e5e5' : '#222' }}
            >
              Account
            </Text>
            {user ? (
              <View className="mb-8">
                <View
                  className="p-4 rounded-lg mb-3"
                  style={{ backgroundColor: isDark ? '#111' : '#f9f9f9' }}
                >
                  <Text
                    className="text-sm"
                    style={{ color: isDark ? '#999' : '#666' }}
                  >
                    Signed in as
                  </Text>
                  <Text
                    className="text-base font-medium mt-1"
                    style={{ color: isDark ? '#fff' : '#111' }}
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
                  style={{ color: isDark ? '#999' : '#666' }}
                >
                  Sign in to sync your workouts across devices
                </Text>
                <TouchableOpacity
                  hitSlop={14}
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: isDark ? '#2563eb' : '#3b82f6' }}
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
          style={{ color: isDark ? '#e5e5e5' : '#222' }}
        >
          Library
        </Text>
        <TouchableOpacity
          hitSlop={14}
          className="p-4 rounded-lg mb-3 flex-row items-center justify-between"
          style={{ backgroundColor: isDark ? '#111' : '#f9f9f9' }}
          onPress={() => navigation.navigate('ActivityLibrary')}
        >
          <View>
            <Text
              className="text-base font-medium"
              style={{ color: isDark ? '#fff' : '#111' }}
            >
              Custom Activities
            </Text>
            <Text
              className="text-sm mt-1"
              style={{ color: isDark ? '#999' : '#666' }}
            >
              Manage activities you've created
            </Text>
          </View>
          <Text style={{ color: isDark ? '#666' : '#999', fontSize: 18 }}>
            {'>'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={14}
          className="p-4 rounded-lg mb-8 flex-row items-center justify-between"
          style={{ backgroundColor: isDark ? '#111' : '#f9f9f9' }}
          onPress={() => navigation.navigate('EmojiLibrary')}
        >
          <View>
            <Text
              className="text-base font-medium"
              style={{ color: isDark ? '#fff' : '#111' }}
            >
              Custom Emojis
            </Text>
            <Text
              className="text-sm mt-1"
              style={{ color: isDark ? '#999' : '#666' }}
            >
              Manage emojis you've added
            </Text>
          </View>
          <Text style={{ color: isDark ? '#666' : '#999', fontSize: 18 }}>
            {'>'}
          </Text>
        </TouchableOpacity>

        {/* Equipment Section */}
        <Text
          className="text-lg font-semibold mb-4"
          style={{ color: isDark ? '#e5e5e5' : '#222' }}
        >
          Equipment
        </Text>
        <TouchableOpacity
          hitSlop={14}
          className="p-4 rounded-lg mb-8 flex-row items-center justify-between"
          style={{ backgroundColor: isDark ? '#111' : '#f9f9f9' }}
          onPress={() => navigation.navigate('Equipment')}
        >
          <View>
            <Text
              className="text-base font-medium"
              style={{ color: isDark ? '#fff' : '#111' }}
            >
              Barbells & Plates
            </Text>
            <Text
              className="text-sm mt-1"
              style={{ color: isDark ? '#999' : '#666' }}
            >
              Configure your gym equipment
            </Text>
          </View>
          <Text style={{ color: isDark ? '#666' : '#999', fontSize: 18 }}>
            {'>'}
          </Text>
        </TouchableOpacity>

        {/* Appearance Section */}
        <Text
          className="text-lg font-semibold mb-4"
          style={{ color: isDark ? '#e5e5e5' : '#222' }}
        >
          Appearance
        </Text>
        {modes.map(mode => (
          <TouchableOpacity
            key={mode.value}
            hitSlop={14}
            className={`flex-row items-center mb-4 p-4 rounded-lg border ${themeMode === mode.value ? 'border-blue-500' : 'border-gray-300'}`}
            style={{ backgroundColor: isDark ? '#111' : '#f9f9f9' }}
            onPress={() => setThemeMode(mode.value as any)}
          >
            <View
              className={`w-5 h-5 rounded-full mr-3 ${themeMode === mode.value ? 'bg-blue-500' : 'bg-gray-300'}`}
            />
            <Text
              className="text-base"
              style={{ color: isDark ? '#fff' : '#111' }}
            >
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
