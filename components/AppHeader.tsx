import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useContext } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { RootStackParamList } from '../App';
import { ThemeContext } from '../theme/ThemeContext';

interface AppHeaderProps {
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export default function AppHeader({ rightAction, children }: AppHeaderProps) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  // Use the navigation prop from React Navigation
  // This requires the component to receive navigation as a prop, or use the useNavigation hook.
  // We'll use the useNavigation hook for functional components.
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View
      className="pt-16 pb-9 px-4 border-b border-gray-200 flex-row items-center"
      style={{
        backgroundColor: isDark ? '#111' : '#fff',
        borderBottomColor: isDark ? '#222' : '#e5e7eb',
      }}
    >
      {/* Left: Optional (spacer if no action) */}
      {rightAction ? rightAction : <View style={{ width: 40 }} />}

      {/* Center: Children */}
      <View className="flex-1 items-center justify-center">{children}</View>

      {/* Right: Settings Cog */}
      <TouchableOpacity
        hitSlop={14}
        onPress={() => navigation.navigate('Settings')}
        className="p-2"
        accessibilityLabel="Settings"
      >
        <Ionicons
          name="settings-outline"
          size={28}
          color={isDark ? '#e5e5e5' : '#64748b'}
        />
      </TouchableOpacity>
    </View>
  );
}

import { Text } from 'react-native';

interface AppHeaderTitleProps {
  title: string;
  subtitle?: string;
}

export const AppHeaderTitle = ({ title, subtitle }: AppHeaderTitleProps) => {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-1 items-center">
      <Text
        className="text-2xl font-bold"
        style={{ color: isDark ? '#fff' : '#111' }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          className="mt-1"
          style={{
            color: isDark ? '#e5e5e5' : '#666',
            fontSize: 14,
            lineHeight: 18,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};
