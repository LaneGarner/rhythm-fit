import React, { useContext, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch } from 'react-redux';
import ActivityNameInput from '../components/ActivityNameInput';
import { ACTIVITY_EMOJIS, ACTIVITY_TYPES } from '../constants';
import { addActivity } from '../redux/activitySlice';
import { ThemeContext } from '../theme/ThemeContext';
import { Activity } from '../types/activity';

const CUSTOM_EMOJIS_KEY = 'custom_emojis';

export default function ActivityScreen({ navigation, route }: any) {
  const { date } = route.params || {};
  const dispatch = useDispatch();
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const [activityName, setActivityName] = useState('');
  const [activityType, setActivityType] = useState<string>('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

    const newActivity: Activity = {
      id: Date.now().toString(),
      date: date || new Date().toISOString().split('T')[0],
      type: activityType as any,
      name: activityName.trim(),
      emoji: selectedEmoji,
      completed: false,
      notes: notes.trim() || undefined,
      sets: [],
    };

    dispatch(addActivity(newActivity));
    navigation.goBack();
  };

  const handleNameSelect = (name: string, type?: string) => {
    setActivityName(name);
    if (type) {
      setActivityType(type);
      // Set default emoji for the activity type
      const defaultEmoji =
        ACTIVITY_EMOJIS[type as keyof typeof ACTIVITY_EMOJIS];
      if (defaultEmoji) {
        setSelectedEmoji(defaultEmoji);
      }
    }
  };

  const isSaveDisabled =
    !activityName.trim() || !activityType || !selectedEmoji;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="p-4 space-y-6">
          {/* Activity Name - At the top */}
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
              placeholder="e.g., Bench Press, Yoga, Basketball"
              error={errors.name}
            />
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
                  onPress={() => setActivityType(type.value)}
                  className={`px-4 py-2 rounded-lg border-2 ${
                    activityType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : isDark
                        ? 'border-gray-600 bg-gray-800'
                        : 'border-gray-300 bg-white'
                  }`}
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
            />
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View
        className={`absolute bottom-0 left-0 right-0 p-4 border-t ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaveDisabled}
          className={`py-3 px-6 rounded-lg ${
            isSaveDisabled ? 'bg-gray-400' : 'bg-blue-500 active:bg-blue-600'
          }`}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Save Activity
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
