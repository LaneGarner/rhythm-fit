import React, { useContext } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { HEADER_STYLES } from '../constants';
import { ThemeContext } from '../theme/ThemeContext';

const modes = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function SettingsScreen({ navigation }: any) {
  const { themeMode, setThemeMode, colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

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
