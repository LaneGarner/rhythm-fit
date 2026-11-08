import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// The network stream already has a display cadence. Avoid a second typing
// animation and rich-text parsing for each partial token response.
export const StreamingText = React.memo(function StreamingText({
  text,
}: {
  text: string;
  isDark?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>
      {text}
    </Text>
  );
});
