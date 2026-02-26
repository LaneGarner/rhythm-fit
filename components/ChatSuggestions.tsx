import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import {
  getChatSuggestions,
  ChatSuggestions as SuggestionsType,
} from '../services/chatApi';
import { useTheme } from '../theme/ThemeContext';

interface ChatSuggestionsProps {
  onSuggestionPress: (suggestion: string) => void;
  visible?: boolean;
}

// Fallback suggestions in case API fails
const FALLBACK_SUGGESTIONS = [
  'Create a push day workout for Monday',
  'Make me a leg day workout',
  'What can I do for recovery?',
  'How can I improve my nutrition?',
  'How do I improve my squat form?',
  'What supplements should I consider?',
  'Design a beginner-friendly workout',
  'How can I break through a plateau?',
];

// Cache for suggestions from API
let cachedSuggestions: string[] | null = null;

export const ChatSuggestions = (props: ChatSuggestionsProps) => {
  const { onSuggestionPress, visible = true } = props;
  const { colors } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const [allSuggestions, setAllSuggestions] = useState<string[]>(
    cachedSuggestions || FALLBACK_SUGGESTIONS
  );
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch suggestions from API on mount
  useEffect(() => {
    if (cachedSuggestions) return; // Already cached

    getChatSuggestions()
      .then(data => {
        const suggestions = Object.values(data).flat();
        cachedSuggestions = suggestions;
        setAllSuggestions(suggestions);
      })
      .catch(() => {
        // Use fallback on error
        setAllSuggestions(FALLBACK_SUGGESTIONS);
      });
  }, []);

  // Randomly select 4 suggestions each render
  const randomSuggestions = useMemo(() => {
    const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  }, [refreshKey, allSuggestions]);

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
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        height: 52,
      }}
      className="border-t"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          flex: 1,
        }}
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 8, alignItems: 'center' }}
        >
          <View className="flex-row space-x-2" style={{ alignItems: 'center' }}>
            {randomSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion}-${index}`}
                hitSlop={8}
                onPress={() => onSuggestionPress(suggestion)}
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  height: 36,
                }}
                className="px-3 rounded-full border justify-center"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={suggestion}
                accessibilityHint="Double tap to use this suggestion"
              >
                <Text
                  style={{
                    color: colors.text,
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
                backgroundColor: colors.primary.main,
                borderColor: colors.primary.main,
                height: 36,
              }}
              className="px-3 rounded-full border flex-row items-center justify-center"
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="More suggestions"
              accessibilityHint="Double tap to show different suggestions"
            >
              <Ionicons
                name="refresh-outline"
                size={14}
                color={colors.textInverse}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  color: colors.textInverse,
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
    </View>
  );
};
