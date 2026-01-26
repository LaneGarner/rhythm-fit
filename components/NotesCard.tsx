import { Ionicons } from '@expo/vector-icons';
import React, { useContext } from 'react';
import { Text, View } from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';

interface NotesCardProps {
  notes: string;
}

export default function NotesCard({ notes }: NotesCardProps) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  if (!notes) return null;

  return (
    <View
      className={`p-4 rounded-lg ${
        isDark ? 'bg-gray-800' : 'bg-white'
      } shadow-sm`}
    >
      <View className="flex-row items-center mb-2">
        <Ionicons
          name="document-text-outline"
          size={18}
          color={isDark ? '#9CA3AF' : '#6B7280'}
          style={{ marginRight: 6 }}
        />
        <Text
          className={`text-sm font-medium ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          Notes
        </Text>
      </View>
      <Text
        className={`text-base ${isDark ? 'text-gray-200' : 'text-gray-700'}`}
      >
        {notes}
      </Text>
    </View>
  );
}
