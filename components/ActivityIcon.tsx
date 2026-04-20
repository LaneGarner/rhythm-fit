import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { getIconForType } from '../services/activityTypeService';
import { useTheme } from '../theme/ThemeContext';

interface ActivityIconProps {
  activityType?: string | null;
  size?: number;
  color?: string;
}

function ActivityIcon({ activityType, size = 24, color }: ActivityIconProps) {
  const { colors } = useTheme();

  return (
    <Ionicons
      name={getIconForType(activityType)}
      size={size}
      color={color ?? colors.text}
    />
  );
}

export default ActivityIcon;
