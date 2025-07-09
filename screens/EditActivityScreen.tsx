import React, { useContext, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ActivityNameInput from '../components/ActivityNameInput';
import { ACTIVITY_EMOJIS, ACTIVITY_TYPES } from '../constants';
import { updateActivity } from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { ThemeContext } from '../theme/ThemeContext';
import { Activity, ActivityType } from '../types/activity';

export default function EditActivityScreen({ navigation, route }: any) {
  const { activityId } = route.params;
  const dispatch = useDispatch();
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const activities = useSelector((state: RootState) => state.activities.data);
  const activity = activities.find(a => a.id === activityId);

  const [selectedType, setSelectedType] = useState<ActivityType>(
    activity?.type || 'weight-training'
  );
  const [name, setName] = useState(activity?.name || '');
  const [notes, setNotes] = useState(activity?.notes || '');
  const [selectedEmoji, setSelectedEmoji] = useState(activity?.emoji || '🏋️');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Track if emoji was manually changed by user
  const [emojiManuallyChanged, setEmojiManuallyChanged] = useState(false);

  // Auto-select emoji when activity type changes (only if emoji wasn't manually changed)
  useEffect(() => {
    if (!emojiManuallyChanged) {
      const defaultEmoji = ACTIVITY_EMOJIS[selectedType] || '💪';
      setSelectedEmoji(defaultEmoji);
    }
  }, [selectedType, emojiManuallyChanged]);

  const handleSave = () => {
    // Validate required fields
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Activity name is required';
    }

    if (!selectedType) {
      newErrors.type = 'Activity type is required';
    }

    if (!selectedEmoji) {
      newErrors.emoji = 'Emoji is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!activity) return;

    const updatedActivity: Activity = {
      ...activity,
      type: selectedType,
      name: name.trim(),
      emoji: selectedEmoji,
      notes: notes.trim() || undefined,
    };

    dispatch(updateActivity(updatedActivity));
    navigation.goBack();
  };

  const handleActivityTypeChange = (type: ActivityType) => {
    setSelectedType(type);
    // Reset the manual change flag when activity type changes
    setEmojiManuallyChanged(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    setEmojiManuallyChanged(true);
  };

  const isSaveDisabled = !name.trim() || !selectedType || !selectedEmoji;

  if (!activity) {
    return (
      <View
        className={`flex-1 justify-center items-center ${
          isDark ? 'bg-gray-900' : 'bg-gray-50'
        }`}
      >
        <Text className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Activity not found
        </Text>
      </View>
    );
  }

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
          {/* Header */}
          <View>
            <Text
              className={`text-2xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Edit Activity
            </Text>
            <Text
              className={`text-base mt-1 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              {new Date(activity.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
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
                  onPress={() =>
                    handleActivityTypeChange(type.value as ActivityType)
                  }
                  className={`px-4 py-2 rounded-lg border-2 ${
                    selectedType === type.value
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
              value={name}
              onChangeText={setName}
              placeholder="e.g., Bench Press, Yoga, Basketball"
              error={errors.name}
            />
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
                  onPress={() => handleEmojiSelect(emoji)}
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
              placeholder="Any notes about this activity..."
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
            Save Changes
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
