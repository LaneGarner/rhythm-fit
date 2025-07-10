import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ACTIVITY_EMOJIS, ACTIVITY_TYPES } from '../constants';
import { ThemeContext } from '../theme/ThemeContext';
import { Activity, ActivityType, RecurringConfig } from '../types/activity';
import ActivityNameInput from './ActivityNameInput';
import RecurringActivityModal from './RecurringActivityModal';

interface ActivityFormProps {
  mode: 'create' | 'edit';
  initialActivity?: Activity;
  onSave: (activity: Activity, recurringConfig?: RecurringConfig) => void;
  onCancel: () => void;
}

export default function ActivityForm({
  mode,
  initialActivity,
  onSave,
  onCancel,
}: ActivityFormProps) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const [activityName, setActivityName] = useState(initialActivity?.name || '');
  const [activityType, setActivityType] = useState<ActivityType>(
    initialActivity?.type || 'weight-training'
  );
  const [selectedEmoji, setSelectedEmoji] = useState(
    initialActivity?.emoji || ''
  );
  const [notes, setNotes] = useState(initialActivity?.notes || '');
  const [selectedDate, setSelectedDate] = useState(
    initialActivity?.date ? dayjs(initialActivity.date).toDate() : new Date()
  );
  const [tempSelectedDate, setTempSelectedDate] = useState(
    initialActivity?.date ? dayjs(initialActivity.date).toDate() : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringConfig, setRecurringConfig] =
    useState<RecurringConfig | null>(initialActivity?.recurring || null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const notesInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      'keyboardWillShow',
      e => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      'keyboardWillHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  const scrollToInput = (inputRef: React.RefObject<TextInput | null>) => {
    if (inputRef.current && scrollViewRef.current) {
      inputRef.current.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100,
            animated: true,
          });
        },
        () => {
          console.log('Failed to measure input position');
        }
      );
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempSelectedDate(selectedDate);
    }
  };

  const handleDatePickerDone = () => {
    setSelectedDate(tempSelectedDate);
    setShowDatePicker(false);
  };

  const handleDatePickerCancel = () => {
    setTempSelectedDate(selectedDate);
    setShowDatePicker(false);
  };

  const handleSave = () => {
    // Validate required fields
    const newErrors: { [key: string]: string } = {};

    if (!activityName.trim()) {
      newErrors.name = 'Activity name is required';
    }

    if (!activityType) {
      newErrors.type = 'Activity type is required';
    }

    if (!selectedEmoji) {
      newErrors.emoji = 'Emoji is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const activity: Activity = {
      id: initialActivity?.id || Date.now().toString(),
      date: dayjs(selectedDate).format('YYYY-MM-DD'),
      type: activityType,
      name: activityName.trim(),
      emoji: selectedEmoji,
      completed: initialActivity?.completed || false,
      notes: notes.trim() || undefined,
      sets: initialActivity?.sets || [],
      recurring: recurringConfig || undefined,
    };

    onSave(activity, recurringConfig || undefined);
  };

  const handleNameSelect = (name: string, type?: string) => {
    setActivityName(name);
    if (type) {
      setActivityType(type as ActivityType);
      const defaultEmoji =
        ACTIVITY_EMOJIS[type as keyof typeof ACTIVITY_EMOJIS];
      if (defaultEmoji) {
        setSelectedEmoji(defaultEmoji);
      }
    }
  };

  const handleAddToLibrary = async (name: string) => {
    // This would need to be implemented based on your storage utilities
    console.log('Add to library:', name);
  };

  const isSaveDisabled =
    !activityName.trim() || !activityType || !selectedEmoji;

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#F9FAFB' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 72,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: isDark ? '#111' : '#fff',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#222' : '#e5e7eb',
        }}
      >
        <TouchableOpacity
          hitSlop={14}
          onPress={onCancel}
          style={{ paddingVertical: 4, paddingHorizontal: 8, marginRight: 8 }}
        >
          <Text style={{ color: '#2563eb', fontSize: 18, fontWeight: '500' }}>
            Back
          </Text>
        </TouchableOpacity>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 66,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: isDark ? '#fff' : '#111',
              textAlign: 'center',
            }}
          >
            {mode === 'create' ? 'New Activity' : 'Edit Activity'}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 200,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        ref={scrollViewRef}
      >
        <View className="p-4 space-y-8">
          {/* Activity Name */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Activity Name *
            </Text>
            <ActivityNameInput
              value={activityName}
              onChangeText={setActivityName}
              onSelectSuggestion={handleNameSelect}
              onAddToLibrary={handleAddToLibrary}
              placeholder="e.g., Bench Press, Pull-ups, Running"
              error={errors.name}
            />
          </View>

          {/* Date Selection */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Date
            </Text>
            <TouchableOpacity
              onPress={() => {
                setTempSelectedDate(selectedDate);
                setShowDatePicker(true);
              }}
              className={`px-4 py-3 border rounded-lg flex-row justify-between items-center ${
                isDark
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              <Text
                className={`text-base ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                {dayjs(selectedDate).format('dddd, MMMM D, YYYY')}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </TouchableOpacity>
          </View>

          {/* Activity Type */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Activity Type *
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ACTIVITY_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setActivityType(type.value as ActivityType)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      activityType === type.value
                        ? isDark
                          ? '#6366f1'
                          : '#a5b4fc'
                        : isDark
                          ? '#444'
                          : '#d1d5db',
                    backgroundColor:
                      activityType === type.value
                        ? isDark
                          ? '#23263a'
                          : '#e0e7ff'
                        : isDark
                          ? '#1a1a1a'
                          : '#fff',
                  }}
                >
                  <Text
                    className={`text-base ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {type.emoji} {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.type && (
              <Text className="text-red-500 text-sm mt-1">{errors.type}</Text>
            )}
          </View>

          {/* Emoji Selection */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Emoji *
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {Object.entries(ACTIVITY_EMOJIS).map(([type, emoji]) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setSelectedEmoji(emoji)}
                  className={`p-3 rounded-lg border-2 ${
                    selectedEmoji === emoji
                      ? 'border-blue-500 bg-blue-50'
                      : isDark
                        ? 'border-gray-600 bg-gray-800'
                        : 'border-gray-300 bg-white'
                  }`}
                >
                  <Text className="text-2xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.emoji && (
              <Text className="text-red-500 text-sm mt-1">{errors.emoji}</Text>
            )}
          </View>

          {/* Recurring Options */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Recurring
            </Text>
            <TouchableOpacity
              onPress={() => setShowRecurringModal(true)}
              className={`px-4 py-3 border rounded-lg flex-row justify-between items-center ${
                isDark
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              <Text
                className={`text-base ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                {recurringConfig
                  ? `${recurringConfig.pattern === 'daily' ? 'Every day' : 'Weekly'} (${recurringConfig.occurrences} times)`
                  : 'Set up recurring schedule'}
              </Text>
              <Ionicons
                name="repeat-outline"
                size={20}
                color={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Notes
            </Text>
            <TextInput
              ref={notesInputRef}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes about this activity"
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              multiline
              numberOfLines={3}
              className={`px-4 py-3 border rounded-lg text-base ${
                isDark
                  ? 'bg-gray-800 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onFocus={() => {
                setTimeout(() => {
                  scrollToInput(notesInputRef);
                }, 100);
              }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky Save Button */}
      <View
        className={`absolute left-0 right-0 p-4 border-t ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
        style={{
          bottom: isKeyboardVisible ? keyboardHeight : 0,
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaveDisabled}
          className={`py-3 px-6 rounded-lg ${
            isSaveDisabled ? 'bg-gray-400' : 'bg-blue-500 active:bg-blue-600'
          }`}
        >
          <Text className="text-white text-center font-semibold text-lg">
            {mode === 'create' ? 'Save Activity' : 'Update Activity'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={true}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Backdrop */}
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
            activeOpacity={1}
            onPress={handleDatePickerCancel}
          />
          {/* Bottom Sheet Content */}
          <View
            className={`rounded-t-3xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}
            style={{ paddingBottom: 32, paddingTop: 8, paddingHorizontal: 0 }}
          >
            {/* Header */}
            <View
              className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
            >
              <View className="flex-row justify-between items-center">
                <TouchableOpacity onPress={handleDatePickerCancel}>
                  <Text
                    className={`text-lg ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text
                  className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  Select Date
                </Text>
                <TouchableOpacity onPress={handleDatePickerDone}>
                  <Text
                    className={`text-lg font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Selected Date Display + Today Button */}
            <View
              className={`flex-row items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
            >
              <Text
                className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {dayjs(tempSelectedDate).format('dddd, MMMM D, YYYY')}
              </Text>
              <TouchableOpacity
                onPress={() => setTempSelectedDate(new Date())}
                style={{
                  marginLeft: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#2563eb22' : '#2563eb22',
                }}
              >
                <Text
                  style={{ color: '#2563eb', fontWeight: '600', fontSize: 16 }}
                >
                  Today
                </Text>
              </TouchableOpacity>
            </View>
            {/* Date Picker */}
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
              }}
            >
              <DateTimePicker
                value={tempSelectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
                minimumDate={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)}
                style={{ height: 200, width: '100%' }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Recurring Modal */}
      <RecurringActivityModal
        visible={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        onSave={setRecurringConfig}
        startDate={dayjs(selectedDate).format('YYYY-MM-DD')}
      />
    </View>
  );
}
