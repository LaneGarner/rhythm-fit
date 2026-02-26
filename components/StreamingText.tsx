import React, { useEffect, useRef, useState } from 'react';
import { WorkoutContentWithLinks } from './WorkoutContentWithLinks';

interface StreamingTextProps {
  text: string;
  isDark?: boolean;
}

export const StreamingText = ({ text, isDark }: StreamingTextProps) => {
  const [revealedLength, setRevealedLength] = useState(0);
  const textRef = useRef(text);

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

  const revealedText = text.substring(0, revealedLength);

  return <WorkoutContentWithLinks text={revealedText} isDark={isDark} />;
};
