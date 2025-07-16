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
import {
  Activity,
  ActivityType,
  RecurringConfig,
  SetData,
} from '../types/activity';
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
  const [sets, setSets] = useState<SetData[]>(initialActivity?.sets || []);
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

  // Auto-set emoji when activity type changes or is initially set
  useEffect(() => {
    if (activityType && !selectedEmoji) {
      const defaultEmoji = ACTIVITY_EMOJIS[activityType];
      if (defaultEmoji) {
        setSelectedEmoji(defaultEmoji);
      }
    }
  }, [activityType, selectedEmoji]);

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
      newErrors.name = 'Required field';
    }

    if (!activityType) {
      newErrors.type = 'Required field';
    }

    if (!selectedEmoji) {
      newErrors.emoji = 'Required field';
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
      sets: sets,
      recurring: recurringConfig || undefined,
    };

    onSave(activity, recurringConfig || undefined);
  };

  const handleNameSelect = (name: string, type?: string) => {
    console.log(
      'ActivityForm: handleNameSelect called with:',
      name,
      'type:',
      type
    );
    setActivityName(name);
    console.log('ActivityForm: setActivityName called with:', name);
    if (type) {
      console.log('ActivityForm: setting activity type to:', type);
      setActivityType(type as ActivityType);
      const defaultEmoji =
        ACTIVITY_EMOJIS[type as keyof typeof ACTIVITY_EMOJIS];
      console.log(
        'ActivityForm: default emoji for type',
        type,
        'is:',
        defaultEmoji
      );
      if (defaultEmoji) {
        console.log('ActivityForm: setting selected emoji to:', defaultEmoji);
        setSelectedEmoji(defaultEmoji);
      }
    }
  };

  const handleAddToLibrary = async (name: string) => {
    // This would need to be implemented based on your storage utilities
    console.log('Add to library:', name);
  };

  const handleAddSet = () => {
    const newSet: SetData = {
      id: Date.now().toString(),
      reps: 0,
      weight: 0,
      completed: false,
    };
    setSets([...sets, newSet]);
  };

  const handleUpdateSet = (setId: string, updates: Partial<SetData>) => {
    setSets(sets.map(set => (set.id === setId ? { ...set, ...updates } : set)));
  };

  const handleDuplicateSet = (setToDuplicate: SetData) => {
    const newSet: SetData = {
      id: Date.now().toString(),
      reps: setToDuplicate.reps,
      weight: setToDuplicate.weight,
      completed: false,
    };
    setSets([...sets, newSet]);
  };

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
                  onPress={() => {
                    setActivityType(type.value as ActivityType);
                    // Automatically select the emoji for this activity type
                    setSelectedEmoji(type.emoji);
                  }}
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
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      selectedEmoji === emoji
                        ? isDark
                          ? '#6366f1'
                          : '#a5b4fc'
                        : isDark
                          ? '#444'
                          : '#d1d5db',
                    backgroundColor:
                      selectedEmoji === emoji
                        ? isDark
                          ? '#23263a'
                          : '#e0e7ff'
                        : isDark
                          ? '#1a1a1a'
                          : '#fff',
                  }}
                >
                  <Text
                    className={`text-2xl ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {emoji}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.emoji && (
              <Text className="text-red-500 text-sm mt-1">{errors.emoji}</Text>
            )}
          </View>

          {/* Sets */}
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text
                className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                Sets ({sets.length})
              </Text>
              <TouchableOpacity
                onPress={handleAddSet}
                className="bg-blue-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-semibold">Add Set</Text>
              </TouchableOpacity>
            </View>

            {sets.map((set, index) => (
              <View
                key={set.id}
                className={`p-4 rounded-lg mb-3 ${
                  isDark ? 'bg-gray-800' : 'bg-white'
                } shadow-sm`}
              >
                <Text
                  className={`text-lg font-semibold mb-3 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Set {index + 1}
                </Text>
                <View className="flex-row space-x-4">
                  <View className="flex-1">
                    <Text
                      className={`text-sm mb-1 ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      Weight (lbs)
                    </Text>
                    <TextInput
                      value={set.weight?.toString() || ''}
                      onChangeText={text =>
                        handleUpdateSet(set.id, { weight: parseInt(text) || 0 })
                      }
                      keyboardType="numeric"
                      className={`px-3 py-2 border rounded-lg ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="0"
                      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-sm mb-1 ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      Reps
                    </Text>
                    <TextInput
                      value={set.reps?.toString() || ''}
                      onChangeText={text =>
                        handleUpdateSet(set.id, { reps: parseInt(text) || 0 })
                      }
                      keyboardType="numeric"
                      className={`px-3 py-2 border rounded-lg ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="0"
                      placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDuplicateSet(set)}
                  className="mt-3 bg-blue-500 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white text-center font-semibold">
                    Duplicate
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {sets.length === 0 && (
              <Text
                className={`text-center py-8 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                No sets added yet. Tap "Add Set" to get started.
              </Text>
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
          className={`py-3 px-6 rounded-lg bg-blue-500 active:bg-blue-600`}
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
