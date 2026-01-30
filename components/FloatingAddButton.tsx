import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface FloatingAddButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
}

export default function FloatingAddButton({
  onPress,
  accessibilityLabel = 'Add',
}: FloatingAddButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        position: 'absolute',
        bottom: 50,
        right: 34,
        backgroundColor: colors.primary.main,
        borderRadius: 32,
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
      }}
      activeOpacity={0.85}
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="add" size={32} color="#fff" />
    </TouchableOpacity>
  );
}
