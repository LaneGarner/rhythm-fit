import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface StreamingTextProps {
  text: string;
}

export const StreamingText = ({ text }: StreamingTextProps) => {
  const { colors } = useTheme();
  const [revealedLength, setRevealedLength] = useState(0);
  const textRef = useRef(text);
  const fadeAnim = useRef(new Animated.Value(0.3)).current;
  const prevRevealedRef = useRef(0);

  textRef.current = text;

  useEffect(() => {
    const timer = setInterval(() => {
      setRevealedLength(prev => {
        const target = textRef.current.length;
        if (prev >= target) return prev;
        const gap = target - prev;
        const step = Math.max(1, Math.ceil(gap * 0.2));
        return Math.min(prev + step, target);
      });
    }, 25);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (revealedLength > prevRevealedRef.current) {
      fadeAnim.setValue(0.3);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }).start();
      prevRevealedRef.current = revealedLength;
    }
  }, [revealedLength]);

  const fadeWindow = 3;
  const splitPoint = Math.max(0, revealedLength - fadeWindow);
  const stableText = text.substring(0, splitPoint);
  const fadingText = text.substring(splitPoint, revealedLength);

  const textStyle = {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  };

  return (
    <Text style={textStyle}>
      {stableText}
      <Animated.Text style={{ opacity: fadeAnim }}>{fadingText}</Animated.Text>
    </Text>
  );
};
