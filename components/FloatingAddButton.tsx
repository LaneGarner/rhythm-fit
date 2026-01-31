import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef } from 'react';
import { LayoutChangeEvent, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface FloatingAddButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

const FloatingAddButton = forwardRef<View, FloatingAddButtonProps>(
  ({ onPress, accessibilityLabel = 'Add', onLayout }, ref) => {
    const { colors } = useTheme();

    return (
      <View
        ref={ref}
        onLayout={onLayout}
        style={{
          position: 'absolute',
          bottom: 30,
          right: 34,
        }}
      >
        <TouchableOpacity
          onPress={onPress}
          style={{
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
      </View>
    );
  }
);

export default FloatingAddButton;
