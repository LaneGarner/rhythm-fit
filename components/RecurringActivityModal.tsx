import React, { useContext, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  findNodeHandle,
} from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';
import {
  RecurringConfig,
  RecurringFrequency,
  RecurringPattern,
} from '../types/activity';

interface RecurringActivityModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (config: RecurringConfig) => void;
  startDate: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export default function RecurringActivityModal({
  visible,
  onClose,
  onSave,
  startDate,
}: RecurringActivityModalProps) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const [pattern, setPattern] = useState<RecurringPattern>('weekly');
  const [frequency, setFrequency] = useState<RecurringFrequency>('every');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [occurrences, setOccurrences] = useState<string>('4');

  const scrollViewRef = useRef<ScrollView>(null);
  const occurrencesInputRef = useRef<TextInput>(null);

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    const config: RecurringConfig = {
      pattern,
      frequency,
      daysOfWeek: pattern === 'weekly' ? selectedDays : undefined,
      startDate,
      occurrences: parseInt(occurrences) || 4,
    };
    onSave(config);
    onClose();
  };

  const scrollToOccurrencesInput = () => {
    if (occurrencesInputRef.current && scrollViewRef.current) {
      const scrollViewNode = findNodeHandle(scrollViewRef.current);
      if (scrollViewNode) {
        occurrencesInputRef.current.measureLayout(
          scrollViewNode,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
          },
          () => {}
        );
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
        {/* Header */}
        <View
          className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <View className="flex-row justify-between items-center">
            <TouchableOpacity onPress={onClose}>
              <Text
                className={`text-lg ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              Recurring Activity
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text
                className={`text-lg font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-4" ref={scrollViewRef}>
          {/* Pattern Selection */}
          <View className="mb-6">
            <Text
              className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              Pattern
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity
                onPress={() => setPattern('daily')}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor:
                    pattern === 'daily'
                      ? isDark
                        ? '#6366f1'
                        : '#a5b4fc'
                      : isDark
                        ? '#444'
                        : '#d1d5db',
                  backgroundColor:
                    pattern === 'daily'
                      ? isDark
                        ? '#23263a'
                        : '#e0e7ff'
                      : isDark
                        ? '#1a1a1a'
                        : '#fff',
                }}
              >
                <Text
                  className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  Every day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPattern('weekly')}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor:
                    pattern === 'weekly'
                      ? isDark
                        ? '#6366f1'
                        : '#a5b4fc'
                      : isDark
                        ? '#444'
                        : '#d1d5db',
                  backgroundColor:
                    pattern === 'weekly'
                      ? isDark
                        ? '#23263a'
                        : '#e0e7ff'
                      : isDark
                        ? '#1a1a1a'
                        : '#fff',
                }}
              >
                <Text
                  className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  Weekly on specific days
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Frequency Selection (for weekly pattern) */}
          {pattern === 'weekly' && (
            <View className="mb-6">
              <Text
                className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Frequency
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setFrequency('every')}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      frequency === 'every'
                        ? isDark
                          ? '#6366f1'
                          : '#a5b4fc'
                        : isDark
                          ? '#444'
                          : '#d1d5db',
                    backgroundColor:
                      frequency === 'every'
                        ? isDark
                          ? '#23263a'
                          : '#e0e7ff'
                        : isDark
                          ? '#1a1a1a'
                          : '#fff',
                  }}
                >
                  <Text
                    className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    Every week
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFrequency('this')}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      frequency === 'this'
                        ? isDark
                          ? '#6366f1'
                          : '#a5b4fc'
                        : isDark
                          ? '#444'
                          : '#d1d5db',
                    backgroundColor:
                      frequency === 'this'
                        ? isDark
                          ? '#23263a'
                          : '#e0e7ff'
                        : isDark
                          ? '#1a1a1a'
                          : '#fff',
                  }}
                >
                  <Text
                    className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    This week only
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Day Selection (for weekly pattern) */}
          {pattern === 'weekly' && (
            <View className="mb-6">
              <Text
                className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Days of Week
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <TouchableOpacity
                    key={day.value}
                    onPress={() => toggleDay(day.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: selectedDays.includes(day.value)
                        ? isDark
                          ? '#6366f1'
                          : '#a5b4fc'
                        : isDark
                          ? '#444'
                          : '#d1d5db',
                      backgroundColor: selectedDays.includes(day.value)
                        ? isDark
                          ? '#23263a'
                          : '#e0e7ff'
                        : isDark
                          ? '#1a1a1a'
                          : '#fff',
                    }}
                  >
                    <Text
                      className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Occurrences */}
          {pattern === 'weekly' && frequency === 'this' ? null : (
            <View className="mb-6">
              <Text
                className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Number of Occurrences
              </Text>
              <TextInput
                ref={occurrencesInputRef}
                value={occurrences}
                onChangeText={setOccurrences}
                keyboardType="numeric"
                className={`px-3 py-2 border rounded-lg ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="4"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                onFocus={scrollToOccurrencesInput}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
