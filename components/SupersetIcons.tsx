import React from 'react';
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Activity } from '../types/activity';
import ActivityIcon from './ActivityIcon';

interface SupersetIconsProps {
  activities: Activity[];
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  separatorStyle?: StyleProp<TextStyle>;
}

function SupersetIcons({
  activities,
  size = 24,
  color,
  style,
  separatorStyle,
}: SupersetIconsProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.text;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {activities.map((activity, index) => (
        <React.Fragment key={activity.id}>
          <ActivityIcon
            emoji={activity.emoji}
            activityType={activity.type}
            size={size}
            color={resolvedColor}
          />
          {index < activities.length - 1 && (
            <Text
              style={[
                {
                  fontSize: size * 0.75,
                  color: resolvedColor,
                  marginHorizontal: 4,
                },
                separatorStyle,
              ]}
            >
              →
            </Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

export default SupersetIcons;
