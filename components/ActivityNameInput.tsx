import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { searchExercises } from '../constants/exercises';
import { ThemeContext } from '../theme/ThemeContext';

interface ActivityNameInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectSuggestion?: (suggestion: string, type?: string) => void;
  placeholder?: string;
  error?: string;
}

export default function ActivityNameInput({
  value,
  onChangeText,
  onSelectSuggestion,
  placeholder = 'Activity name',
  error,
}: ActivityNameInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (value.trim().length > 0) {
      const results = searchExercises(value);
      const suggestionNames = results.map(ex => ex.name);
      setSuggestions(suggestionNames);
      setShowSuggestions(suggestionNames.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  const handleSelectSuggestion = (suggestion: string) => {
    onChangeText(suggestion);
    setShowSuggestions(false);
    Keyboard.dismiss();

    if (onSelectSuggestion) {
      const exercise = searchExercises(suggestion)[0];
      onSelectSuggestion(suggestion, exercise?.type);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding suggestions to allow for touch events
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <View className="relative">
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
        className={`px-4 py-3 border rounded-lg text-base ${
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

      {showSuggestions && suggestions.length > 0 && (
        <View
          className={`absolute top-full left-0 right-0 z-50 max-h-48 rounded-lg border ${
            isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
          } shadow-lg`}
        >
          <ScrollView
            className="max-h-48"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSelectSuggestion(suggestion)}
                className={`px-4 py-3 border-b ${
                  isDark
                    ? 'border-gray-600 active:bg-gray-700'
                    : 'border-gray-200 active:bg-gray-50'
                }`}
              >
                <Text
                  className={`text-base ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
