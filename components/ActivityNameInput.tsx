import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import {
  EXERCISE_DATABASE,
  findExerciseByName,
  searchExercises,
} from '../constants/exercises';
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
  const [isFocused, setIsFocused] = useState(false);
  const [isSelectingSuggestion, setIsSelectingSuggestion] = useState(false);
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

  // Show suggestions immediately on focus
  useEffect(() => {
    if (isFocused) {
      const allExercises = EXERCISE_DATABASE.map(ex => ex.name);
      const recentActivities = activities
        .filter(a => dayjs(a.date).isAfter(dayjs().subtract(30, 'day')))
        .map(a => a.name)
        .filter(Boolean)
        .slice(0, 5);

      const initialSuggestions = [
        ...new Set([...allExercises.slice(0, 10), ...recentActivities]),
      ];
      setSuggestions(initialSuggestions);
      setShowSuggestions(true);
    }
  }, [isFocused, activities]);

  // Update suggestions based on input
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
        .slice(0, 5);

      // Combine and deduplicate
      const allSuggestions = [
        ...new Set([...suggestionNames, ...recentActivities]),
      ];
      setSuggestions(allSuggestions);
    } else if (isFocused) {
      // Show recent activities even when input is empty
      const recentActivities = activities
        .filter(a => dayjs(a.date).isAfter(dayjs().subtract(30, 'day')))
        .map(a => a.name)
        .filter(Boolean)
        .slice(0, 5);

      const allExercises = EXERCISE_DATABASE.map(ex => ex.name);
      const initialSuggestions = [
        ...new Set([...allExercises.slice(0, 10), ...recentActivities]),
      ];
      setSuggestions(initialSuggestions);
    }
  }, [localValue, activities, isFocused]);

  const handleSelectSuggestion = (suggestion: string) => {
    console.log(
      'ActivityNameInput: handleSelectSuggestion called with:',
      suggestion
    );
    setIsSelectingSuggestion(true);
    setLocalValue(suggestion);
    setShowSuggestions(false);
    // Sync to parent
    onChangeText(suggestion);
    console.log('ActivityNameInput: onChangeText called with:', suggestion);
    // Then call onSelectSuggestion with type if available
    if (onSelectSuggestion) {
      const exercise = findExerciseByName(suggestion);
      console.log('ActivityNameInput: found exercise:', exercise);
      if (exercise) {
        console.log(
          'ActivityNameInput: calling onSelectSuggestion with type:',
          suggestion,
          exercise.type
        );
        onSelectSuggestion(suggestion, exercise.type);
      } else {
        console.log(
          'ActivityNameInput: calling onSelectSuggestion without type:',
          suggestion
        );
        onSelectSuggestion(suggestion);
      }
    } else {
      console.log(
        'ActivityNameInput: onSelectSuggestion callback not provided'
      );
    }
    // Reset the flag after a short delay
    setTimeout(() => setIsSelectingSuggestion(false), 100);
  };

  const handleBlur = () => {
    console.log(
      'ActivityNameInput: handleBlur called, localValue:',
      localValue,
      'value:',
      value,
      'isSelectingSuggestion:',
      isSelectingSuggestion
    );
    setIsFocused(false);
    // Don't sync to parent if we're in the middle of selecting a suggestion
    if (!isSelectingSuggestion && localValue !== value) {
      console.log(
        'ActivityNameInput: syncing localValue to parent on blur:',
        localValue
      );
      onChangeText(localValue);
    }
    // Delay hiding suggestions to allow for touch events
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
  };

  const handleAddToLibrary = () => {
    if (localValue.trim()) {
      onAddToLibrary?.(localValue.trim());
      setShowSuggestions(false);
    }
  };

  // Determine if Add to Library should be shown
  const inputTrimmed = localValue.trim().toLowerCase();
  const showAddToLibrary =
    inputTrimmed.length > 0 &&
    !suggestions.some(s => s.trim().toLowerCase() === inputTrimmed) &&
    !!onAddToLibrary;

  return (
    <View className="relative">
      <TextInput
        ref={inputRef}
        value={localValue}
        onChangeText={setLocalValue}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1,
          borderRadius: 8,
          fontSize: 16,
          textAlignVertical: 'center',
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderColor: error ? '#EF4444' : isDark ? '#4B5563' : '#D1D5DB',
          color: isDark ? '#FFFFFF' : '#111827',
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View
          className={`absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border ${
            isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
          }`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
            zIndex: 1000,
          }}
          onTouchStart={() =>
            console.log('ActivityNameInput: Dropdown container touched')
          }
        >
          <ScrollView
            style={{ maxHeight: 240 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
          >
            {suggestions.map((suggestion, index) => {
              const isRecent = activities.some(
                a =>
                  a.name === suggestion &&
                  dayjs(a.date).isAfter(dayjs().subtract(30, 'day'))
              );
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    console.log(
                      'ActivityNameInput: TouchableOpacity onPress called for:',
                      suggestion
                    );
                    handleSelectSuggestion(suggestion);
                  }}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#374151' : '#F3F4F6',
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    minHeight: 44, // Ensure minimum touch target size
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-base ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}
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
          </ScrollView>

          {showAddToLibrary && (
            <TouchableOpacity
              onPress={handleAddToLibrary}
              className={`p-4 border-t border-gray-200 dark:border-gray-700 ${
                isDark ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <View className="flex-row items-center">
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={isDark ? '#3B82F6' : '#2563EB'}
                />
                <Text className="ml-2 text-blue-500 font-medium">
                  Add "{localValue.trim()}" to library
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
