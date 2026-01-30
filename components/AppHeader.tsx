import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { RootStackParamList } from '../App';
import { useTheme } from '../theme/ThemeContext';

interface AppHeaderProps {
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export default function AppHeader({ rightAction, children }: AppHeaderProps) {
  const { colors } = useTheme();

  // Use the navigation prop from React Navigation
  // This requires the component to receive navigation as a prop, or use the useNavigation hook.
  // We'll use the useNavigation hook for functional components.
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View
      className="pt-16 pb-9 px-4 border-b border-gray-200 flex-row items-center"
      style={{
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
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
          color={colors.textSecondary}
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
  const { colors } = useTheme();

  return (
    <View className="flex-1 items-center">
      <Text className="text-2xl font-bold" style={{ color: colors.text }}>
        {title}
      </Text>
      {subtitle && (
        <Text
          className="mt-1"
          style={{
            color: colors.textSecondary,
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
