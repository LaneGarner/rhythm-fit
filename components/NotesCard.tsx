import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface NotesCardProps {
  notes: string;
}

export default function NotesCard({ notes }: NotesCardProps) {
  const { colors } = useTheme();

  if (!notes) return null;

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 8,
        backgroundColor: colors.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Ionicons
          name="document-text-outline"
          size={18}
          color={colors.textSecondary}
          style={{ marginRight: 6 }}
        />
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: colors.textSecondary,
          }}
        >
          Notes
        </Text>
      </View>
      <Text
        style={{
          fontSize: 16,
          color: colors.text,
        }}
      >
        {notes}
      </Text>
    </View>
  );
}
