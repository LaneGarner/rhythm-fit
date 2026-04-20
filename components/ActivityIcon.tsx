import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text } from 'react-native';
import { getIconForType } from '../services/activityTypeService';
import { useTheme } from '../theme/ThemeContext';

interface ActivityIconProps {
  emoji?: string | null;
  activityType?: string | null;
  size?: number;
  color?: string;
}

function ActivityIcon({
  emoji,
  activityType,
  size = 24,
  color,
}: ActivityIconProps) {
  const { colors } = useTheme();

  if (emoji && emoji.trim().length > 0) {
    return <Text style={{ fontSize: size }}>{emoji}</Text>;
  }

  return (
    <Ionicons
      name={getIconForType(activityType)}
      size={size}
      color={color ?? colors.text}
    />
  );
}

export default ActivityIcon;
