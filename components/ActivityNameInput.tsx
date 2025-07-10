import dayjs from 'dayjs';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { findExerciseByName, searchExercises } from '../constants/exercises';
import { RootState } from '../redux/store';
import { ThemeContext } from '../theme/ThemeContext';

interface ActivityNameInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectSuggestion?: (suggestion: string, type?: string) => void;
  onAddToLibrary?: (name: string) => void;
  placeholder?: string;
  error?: string;
}

export default function ActivityNameInput({
  value,
  onChangeText,
  onSelectSuggestion,
  onAddToLibrary,
  placeholder = 'Activity name',
  error,
}: ActivityNameInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Overlay handler to close dropdown
  const handleOverlayPress = () => setShowSuggestions(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const activities = useSelector((state: RootState) => state.activities.data);

  // Sync local state if parent value changes (e.g., parent clears input)
  React.useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (localValue.trim().length > 0) {
      const results = searchExercises(localValue);
      const suggestionNames = results.map(ex => ex.name);

      // Add recent activities (last 30 days)
      const recentActivities = activities
        .filter(a => dayjs(a.date).isAfter(dayjs().subtract(30, 'day')))
        .map(a => a.name)
        .filter(
          name => name && name.toLowerCase().includes(localValue.toLowerCase())
        )
        .slice(0, 5); // Limit to 5 recent suggestions

      // Combine and deduplicate
      const allSuggestions = [
        ...new Set([...suggestionNames, ...recentActivities]),
      ];
      setSuggestions(allSuggestions);
      setShowSuggestions(allSuggestions.length > 0);

      // If the input matches a known exercise, auto-select type and emoji
      const exact = findExerciseByName(localValue.trim());
      if (exact && onSelectSuggestion) {
        onSelectSuggestion(exact.name, exact.type);
      }
    } else {
      // Show recent activities even when input is empty
      const recentActivities = activities
        .filter(a => dayjs(a.date).isAfter(dayjs().subtract(30, 'day')))
        .map(a => a.name)
        .filter(Boolean)
        .slice(0, 5);

      setSuggestions(recentActivities);
      setShowSuggestions(recentActivities.length > 0);
    }
  }, [localValue, activities]);

  const handleSelectSuggestion = (suggestion: string) => {
    setLocalValue(suggestion);
    setShowSuggestions(false);
    Keyboard.dismiss();
    // Sync to parent
    onChangeText(suggestion);
    // Then call onSelectSuggestion with type if available
    if (onSelectSuggestion) {
      const exercise = findExerciseByName(suggestion);
      if (exercise) {
        onSelectSuggestion(suggestion, exercise.type);
      } else {
        onSelectSuggestion(suggestion);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Sync to parent on blur
    if (localValue !== value) {
      onChangeText(localValue);
    }
    // Delay hiding suggestions to allow for touch events
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Determine if Add to Library should be shown
  const inputTrimmed = localValue.trim().toLowerCase();
  const showAddToLibrary =
    inputTrimmed.length > 0 &&
    !suggestions.some(s => s.trim().toLowerCase() === inputTrimmed) &&
    !!onAddToLibrary;

  return (
    <View className="relative" pointerEvents="box-none">
      {/* Overlay to block background scroll/touches when dropdown is open */}
      {showSuggestions && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleOverlayPress}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
            backgroundColor: 'transparent',
          }}
        />
      )}
      <TextInput
        ref={inputRef}
        value={localValue}
        onChangeText={setLocalValue}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
        className={`px-4 py-3 border text-base ${
          showSuggestions ? 'rounded-t-lg' : 'rounded-lg'
        } ${
          isDark
            ? 'bg-gray-800 border-gray-600 text-white'
            : 'bg-white border-gray-300 text-gray-900'
        } ${error ? 'border-red-500' : ''}`}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {error && <Text className="text-red-500 text-sm mt-1 ml-1">{error}</Text>}

      {/* Separator between input and dropdown */}
      {showSuggestions && (
        <View
          style={{ height: 1, backgroundColor: isDark ? '#374151' : '#E5E7EB' }}
        />
      )}

      {showSuggestions &&
        (suggestions.length > 0 || value.trim().length > 0) && (
          <View
            className={`absolute top-full left-0 right-0 z-50 max-h-48 border-b border-l border-r rounded-b-2xl ${
              isDark
                ? 'bg-gray-900 border-gray-700'
                : 'bg-gray-50 border-gray-300'
            }`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 8,
              overflow: 'visible',
              zIndex: 50,
            }}
            pointerEvents="box-none"
          >
            <ScrollView
              className="max-h-48"
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 0 }}
            >
              {suggestions.map((suggestion, index) => {
                const isRecent = activities.some(
                  a =>
                    a.name === suggestion &&
                    dayjs(a.date).isAfter(dayjs().subtract(30, 'day'))
                );
                // If this is the last suggestion and there's no Add to Library, add extra margin
                const isLast =
                  index === suggestions.length - 1 && !showAddToLibrary;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSelectSuggestion(suggestion)}
                    className={`px-4 py-3 border-b ${
                      isDark
                        ? 'border-gray-700 active:bg-gray-800'
                        : 'border-gray-200 active:bg-gray-100'
                    } ${isLast ? 'mb-4' : ''}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`text-base ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}
                        style={{ lineHeight: 24, paddingVertical: 2 }}
                      >
                        {suggestion}
                      </Text>
                      {isRecent && (
                        <Text
                          className={`text-xs ${
                            isDark ? 'text-blue-400' : 'text-blue-600'
                          }`}
                        >
                          Recent
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {/* Add to library option if no exact match */}
              {showAddToLibrary && (
                <TouchableOpacity
                  onPress={() => onAddToLibrary(localValue.trim())}
                  className={`px-4 py-3 ${
                    isDark ? 'bg-blue-900' : 'bg-blue-50'
                  } mb-4`}
                >
                  <Text
                    className={`text-base font-semibold ${
                      isDark ? 'text-blue-300' : 'text-blue-700'
                    }`}
                    style={{ lineHeight: 24, paddingVertical: 2 }}
                  >
                    + Add "{value.trim()}" to library
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
    </View>
  );
}
