import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getChatSuggestions,
  ChatSuggestions as SuggestionsType,
} from '../services/chatApi';
import { useTheme } from '../theme/ThemeContext';
import {
  loadSuggestionsCollapsed,
  saveSuggestionsCollapsed,
} from '../utils/storage';

interface ChatSuggestionsProps {
  onSuggestionPress: (suggestion: string) => void;
  visible?: boolean;
  chatSessionId?: string;
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

const EXPANDED_HEIGHT = 52;
const COLLAPSED_HEIGHT = 44;
const ANIMATION_DURATION = 200;

export const ChatSuggestions = (props: ChatSuggestionsProps) => {
  const { onSuggestionPress, visible = true, chatSessionId } = props;
  const { colors } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);
  const [allSuggestions, setAllSuggestions] = useState<string[]>(
    cachedSuggestions || FALLBACK_SUGGESTIONS
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const collapseAnim = useRef(new Animated.Value(1)).current;
  const prevSessionIdRef = useRef<string | undefined>(chatSessionId);

  // Load collapsed state from storage on mount
  useEffect(() => {
    loadSuggestionsCollapsed().then(collapsed => {
      setIsCollapsed(collapsed);
      collapseAnim.setValue(collapsed ? 0 : 1);
      setIsLoaded(true);
    });
  }, []);

  // Auto-expand when chat session changes (new chat started)
  useEffect(() => {
    if (
      isLoaded &&
      chatSessionId &&
      prevSessionIdRef.current &&
      chatSessionId !== prevSessionIdRef.current
    ) {
      // New chat session started, expand suggestions
      if (isCollapsed) {
        handleExpand();
      }
    }
    prevSessionIdRef.current = chatSessionId;
  }, [chatSessionId, isLoaded]);

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

  const handleCollapse = () => {
    Animated.timing(collapseAnim, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start(() => {
      setIsCollapsed(true);
      saveSuggestionsCollapsed(true);
    });
  };

  const handleExpand = () => {
    setIsCollapsed(false);
    saveSuggestionsCollapsed(false);
    Animated.timing(collapseAnim, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  };

  if (!visible) {
    return null;
  }

  const animatedHeight = collapseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_HEIGHT, EXPANDED_HEIGHT],
  });

  const expandedOpacity = collapseAnim;
  const collapsedOpacity = collapseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Animated.View
      style={{
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        height: animatedHeight,
        overflow: 'hidden',
      }}
      className="border-t"
    >
      {/* Collapsed state - hint bar */}
      <Animated.View
        style={{
          opacity: collapsedOpacity,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        pointerEvents={isCollapsed ? 'auto' : 'none'}
      >
        <TouchableOpacity
          onPress={handleExpand}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 10,
            minHeight: 44,
            minWidth: 44,
          }}
          accessibilityRole="button"
          accessibilityLabel="Show suggestions"
          accessibilityHint="Double tap to show chat suggestions"
          activeOpacity={0.7}
        >
          <Ionicons
            name="bulb-outline"
            size={16}
            color={colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Show chat suggestions
          </Text>
          <Ionicons
            name="chevron-up"
            size={16}
            color={colors.textSecondary}
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Expanded state - suggestions */}
      <Animated.View
        style={{
          opacity: expandedOpacity,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          flex: 1,
        }}
        pointerEvents={isCollapsed ? 'none' : 'auto'}
      >
        {/* Collapse button */}
        <TouchableOpacity
          onPress={handleCollapse}
          style={{
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 4,
            marginLeft: -8,
          }}
          accessibilityRole="button"
          accessibilityLabel="Hide suggestions"
          accessibilityHint="Double tap to hide chat suggestions"
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-down"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

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
      </Animated.View>
    </Animated.View>
  );
};
