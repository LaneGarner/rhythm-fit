import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';

interface ChatSuggestionsProps {
  onSuggestionPress: (suggestion: string) => void;
  visible?: boolean;
}

const WORKOUT_SUGGESTIONS = [
  'Create a push day workout for Monday',
  'Make me a leg day workout',
  'Design a pull workout with 5 exercises',
  'Create a full body workout over 3 days',
  'Make me an upper body workout',
  'Design a beginner-friendly workout',
  'Create a HIIT cardio session',
  'Make me a core strengthening routine',
  'Design a home workout with no equipment',
  'Create a gym workout for chest and triceps',
];

const RECOVERY_SUGGESTIONS = [
  'What can I do for recovery?',
  'Suggest some stretching exercises',
  'Create a mobility routine',
  'What are good recovery activities?',
  'How can I improve my sleep for recovery?',
  'Suggest foam rolling exercises',
  'What should I do on rest days?',
];

const NUTRITION_SUGGESTIONS = [
  'How can I improve my nutrition?',
  'What should I eat before a workout?',
  'Suggest post-workout meals',
  'How much protein should I eat daily?',
  'What are good pre-workout snacks?',
  'Help me plan healthy meals',
  'What supplements should I consider?',
];

const PROGRESS_SUGGESTIONS = [
  'How can I track my progress?',
  'What exercises improve strength?',
  'How often should I increase weights?',
  "Copy this week's activities to next week",
  'How can I break through a plateau?',
  "What's a good progression plan?",
];

const FORM_SUGGESTIONS = [
  'How do I improve my squat form?',
  "What's proper deadlift technique?",
  'Show me correct push-up form',
  'How do I do a proper plank?',
  "What's the right way to bench press?",
  'Help me with pull-up technique',
];

const ALL_SUGGESTIONS = [
  ...WORKOUT_SUGGESTIONS,
  ...RECOVERY_SUGGESTIONS,
  ...NUTRITION_SUGGESTIONS,
  ...PROGRESS_SUGGESTIONS,
  ...FORM_SUGGESTIONS,
];

export const ChatSuggestions = (props: ChatSuggestionsProps) => {
  const { onSuggestionPress, visible = true } = props;
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Randomly select 4 suggestions each render
  const randomSuggestions = useMemo(() => {
    const shuffled = [...ALL_SUGGESTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  }, [refreshKey]);

  const handleMoreSuggestions = () => {
    setRefreshKey(prev => prev + 1);
    // Scroll to beginning to show the first new suggestion
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: 0, animated: true });
    }, 50);
  };

  if (!visible) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: isDark ? '#111' : '#fff',
        borderTopColor: isDark ? '#222' : '#e5e7eb',
      }}
      className="border-t px-4 py-2"
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 0 }}
      >
        <View className="flex-row space-x-2">
          {randomSuggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={`${suggestion}-${index}`}
              hitSlop={8}
              onPress={() => onSuggestionPress(suggestion)}
              style={{
                backgroundColor: isDark ? '#18181b' : '#f3f4f6',
                borderColor: isDark ? '#333' : '#e5e7eb',
              }}
              className="px-3 py-2 rounded-full border"
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: isDark ? '#e5e5e5' : '#374151',
                  fontSize: 14,
                }}
                numberOfLines={1}
              >
                {suggestion}
              </Text>
            </TouchableOpacity>
          ))}

          {/* More Suggestions Button */}
          <TouchableOpacity
            hitSlop={8}
            onPress={handleMoreSuggestions}
            style={{
              backgroundColor: isDark ? '#2563eb' : '#3b82f6',
              borderColor: isDark ? '#2563eb' : '#3b82f6',
            }}
            className="px-3 py-2 rounded-full border flex-row items-center"
            activeOpacity={0.7}
          >
            <Ionicons
              name="refresh-outline"
              size={14}
              color="#fff"
              style={{ marginRight: 4 }}
            />
            <Text
              style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: '500',
              }}
              numberOfLines={1}
            >
              More
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};
