import { Ionicons } from '@expo/vector-icons';
import React, { useContext } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: {
    icon?: string;
    text?: string;
    onPress: () => void;
  };
  rightAction?: {
    icon?: string;
    text?: string;
    onPress: () => void;
  };
}

export default function Header({
  title,
  subtitle,
  leftAction,
  rightAction,
}: HeaderProps) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  return (
    <View
      className="pt-16 pb-5 px-4 border-b border-gray-200 flex-row items-center"
      style={{
        backgroundColor: isDark ? '#111' : '#fff',
        borderBottomColor: isDark ? '#222' : '#e5e7eb',
      }}
    >
      {/* Left Action */}
      {leftAction ? (
        <TouchableOpacity
          hitSlop={14}
          onPress={leftAction.onPress}
          className="p-2"
        >
          {leftAction.icon ? (
            <Ionicons
              name={leftAction.icon as any}
              size={28}
              color={isDark ? '#e5e5e5' : '#64748b'}
            />
          ) : (
            <Text className="text-blue-500 text-lg">{leftAction.text}</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}

      {/* Centered Title */}
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

      {/* Right Action */}
      {rightAction ? (
        <TouchableOpacity
          hitSlop={14}
          onPress={rightAction.onPress}
          className="p-2"
        >
          {rightAction.icon ? (
            <Ionicons
              name={rightAction.icon as any}
              size={28}
              color={isDark ? '#e5e5e5' : '#64748b'}
            />
          ) : (
            <Text className="text-blue-500 text-lg">{rightAction.text}</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
}
