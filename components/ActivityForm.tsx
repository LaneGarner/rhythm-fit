import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getActivityTypes,
  getActivityEmojis,
} from '../services/activityTypeService';
import { useAuth } from '../context/AuthContext';
import { addToLibrary } from '../services/libraryService';
import {
  getCachedCustomEmojis,
  addToEmojiLibrary,
  EmojiItem,
} from '../services/emojiLibraryService';
import { useTheme } from '../theme/ThemeContext';
import {
  Activity,
  ActivityType,
  DEFAULT_TRACKING_FIELDS,
  RecurringConfig,
  SetData,
  TrackingField,
} from '../types/activity';
import ActivityNameInput from './ActivityNameInput';
import RecurringActivityModal from './RecurringActivityModal';
import { secondsToTimeString, timeStringToSeconds } from '../utils/timeFormat';

interface ActivityFormProps {
  mode: 'create' | 'edit';
  initialActivity?: Activity;
  onSave: (activity: Activity, recurringConfig?: RecurringConfig) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function ActivityForm({
  mode,
  initialActivity,
  onSave,
  onCancel,
  onDelete,
}: ActivityFormProps) {
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';
  const { getAccessToken } = useAuth();

  const [activityName, setActivityName] = useState(initialActivity?.name || '');
  const [activityType, setActivityType] = useState<ActivityType>(
    initialActivity?.type || 'weight-training'
  );
  const [trackingFields, setTrackingFields] = useState<TrackingField[]>(
    initialActivity?.trackingFields ||
      DEFAULT_TRACKING_FIELDS[initialActivity?.type || 'weight-training']
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
  const [customEmojis, setCustomEmojis] = useState<EmojiItem[]>([]);
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const [customEmojiText, setCustomEmojiText] = useState('');

  const notesInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const setInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const customEmojiInputRef = useRef<TextInput>(null);

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

  // Load custom emojis on mount
  useEffect(() => {
    const loadCustomEmojis = async () => {
      const emojis = await getCachedCustomEmojis();
      setCustomEmojis(emojis);
    };
    loadCustomEmojis();
  }, []);

  // Scroll to custom emoji input when it appears
  useEffect(() => {
    if (showCustomEmojiInput) {
      setTimeout(() => {
        scrollToInput(customEmojiInputRef);
      }, 150);
    }
  }, [showCustomEmojiInput]);

  // Filter function to extract only emoji characters
  const filterToEmoji = (text: string): string => {
    const matches = text.match(/\p{Extended_Pictographic}/gu);
    return matches ? matches.join('') : '';
  };

  // Auto-set emoji when activity type changes or is initially set
  useEffect(() => {
    if (activityType && !selectedEmoji) {
      const defaultEmoji = getActivityEmojis()[activityType];
      if (defaultEmoji) {
        setSelectedEmoji(defaultEmoji);
      }
    }
  }, [activityType, selectedEmoji]);

  // Auto-set tracking fields when activity type changes (only for new activities)
  useEffect(() => {
    if (mode === 'create') {
      setTrackingFields(DEFAULT_TRACKING_FIELDS[activityType]);
    }
  }, [activityType, mode]);

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
          // Failed to measure input position
        }
      );
    }
  };

  const scrollToSetInput = (setId: string) => {
    const inputRef = setInputRefs.current[setId];
    if (inputRef && scrollViewRef.current) {
      inputRef.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100,
            animated: true,
          });
        },
        () => {
          // Failed to measure set input position
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
      trackingFields: trackingFields,
    };

    onSave(activity, recurringConfig || undefined);
  };

  const handleNameSelect = (name: string, type?: string) => {
    setActivityName(name);
    if (type) {
      setActivityType(type as ActivityType);
      const defaultEmoji = getActivityEmojis()[type];
      if (defaultEmoji) {
        setSelectedEmoji(defaultEmoji);
      }
    }
  };

  const handleAddToLibrary = async (name: string) => {
    // Save to library immediately (syncs to database if logged in)
    try {
      const token = await getAccessToken();
      const result = await addToLibrary(token, {
        name: name,
        type: activityType,
        category: 'Strength',
        muscle_groups: ['Full Body'],
        difficulty: 'Intermediate',
      });

      if (result.success) {
        Alert.alert(
          'Added to Library',
          `"${name}" has been added to your activity library.`
        );
      } else {
        Alert.alert(
          'Error',
          result.error || 'Failed to add activity to library.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add activity to library.');
    }
  };

  const handleAddSet = () => {
    const newSetId = Date.now().toString();
    const newSet: SetData = {
      id: newSetId,
      reps: undefined,
      weight: undefined,
      time: undefined,
      distance: undefined,
      completed: false,
    };
    setSets([...sets, newSet]);

    // Focus the first tracking field input of the new set after render
    setTimeout(() => {
      const firstField = trackingFields[0];
      setInputRefs.current[`${newSetId}-${firstField}`]?.focus();
    }, 100);
  };

  const handleUpdateSet = (setId: string, updates: Partial<SetData>) => {
    setSets(sets.map(set => (set.id === setId ? { ...set, ...updates } : set)));
  };

  const handleDuplicateSet = (setToDuplicate: SetData) => {
    const newSet: SetData = {
      id: Date.now().toString(),
      reps: setToDuplicate.reps,
      weight: setToDuplicate.weight,
      time: setToDuplicate.time,
      distance: setToDuplicate.distance,
      completed: false,
    };
    setSets([...sets, newSet]);
  };

  const handleDeleteSet = (setId: string) => {
    setSets(sets.filter(set => set.id !== setId));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          height: 132,
          paddingHorizontal: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {/* Left: Cancel button */}
        <TouchableOpacity
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          onPress={onCancel}
          style={{
            position: 'absolute',
            left: 16,
            top: 44,
            height: 88,
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Text
            style={{
              color: colors.primary.main,
              fontSize: 18,
              fontWeight: '500',
            }}
          >
            Cancel
          </Text>
        </TouchableOpacity>
        {/* Center: Title */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 44,
            height: 88,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: colors.text,
              textAlign: 'center',
            }}
          >
            {mode === 'create' ? 'New Activity' : 'Edit Activity'}
          </Text>
        </View>
        {/* Right: Save button */}
        <TouchableOpacity
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          onPress={handleSave}
          style={{
            position: 'absolute',
            right: 16,
            top: 44,
            height: 88,
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Text
            style={{
              color: colors.primary.main,
              fontSize: 18,
              fontWeight: '600',
            }}
          >
            Save
          </Text>
        </TouchableOpacity>
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
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              className={`px-4 py-3 border rounded-lg text-base ${
                isDark
                  ? 'bg-gray-800 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              textAlignVertical="top"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              onFocus={() => {
                setTimeout(() => {
                  scrollToInput(notesInputRef);
                }, 100);
              }}
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
                color={colors.textSecondary}
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
              {getActivityTypes().map(type => (
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
                          ? colors.primary.main
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
              {/* Preset emojis */}
              {Object.entries(getActivityEmojis()).map(([type, emoji]) => (
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
                          ? colors.primary.main
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

              {/* Custom emojis from library */}
              {customEmojis.map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedEmoji(item.emoji)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      selectedEmoji === item.emoji
                        ? isDark
                          ? colors.primary.main
                          : '#a5b4fc'
                        : isDark
                          ? '#444'
                          : '#d1d5db',
                    backgroundColor:
                      selectedEmoji === item.emoji
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
                    {item.emoji}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Add custom emoji button */}
              <TouchableOpacity
                onPress={() => setShowCustomEmojiInput(true)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <Text
                  className="text-2xl"
                  style={{ color: colors.textSecondary }}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom emoji input */}
            {showCustomEmojiInput && (
              <View className="flex-row items-center mt-3" style={{ gap: 12 }}>
                <TextInput
                  ref={customEmojiInputRef}
                  value={customEmojiText}
                  onChangeText={text => setCustomEmojiText(filterToEmoji(text))}
                  autoFocus
                  placeholder="Enter emoji"
                  placeholderTextColor={colors.textSecondary}
                  className={`px-3 border rounded-lg text-center ${
                    isDark
                      ? 'bg-gray-800 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  style={{
                    height: 40,
                    fontSize: 16,
                    width: 120,
                  }}
                  returnKeyType="done"
                  onFocus={() => {
                    setTimeout(() => {
                      scrollToInput(customEmojiInputRef);
                    }, 100);
                  }}
                  onSubmitEditing={async () => {
                    if (customEmojiText) {
                      setSelectedEmoji(customEmojiText);
                      const token = await getAccessToken();
                      const result = await addToEmojiLibrary(
                        token,
                        customEmojiText
                      );
                      if (result.success) {
                        setCustomEmojis(await getCachedCustomEmojis());
                      }
                    }
                    setShowCustomEmojiInput(false);
                    setCustomEmojiText('');
                    Keyboard.dismiss();
                  }}
                />
                <TouchableOpacity
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  onPress={async () => {
                    if (customEmojiText) {
                      setSelectedEmoji(customEmojiText);
                      const token = await getAccessToken();
                      const result = await addToEmojiLibrary(
                        token,
                        customEmojiText
                      );
                      if (result.success) {
                        setCustomEmojis(await getCachedCustomEmojis());
                      }
                    }
                    setShowCustomEmojiInput(false);
                    setCustomEmojiText('');
                    Keyboard.dismiss();
                  }}
                >
                  <Text
                    style={{
                      color: colors.primary.main,
                      fontWeight: '600',
                      fontSize: 15,
                    }}
                  >
                    Add
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  onPress={() => {
                    setShowCustomEmojiInput(false);
                    setCustomEmojiText('');
                    Keyboard.dismiss();
                  }}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 15,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {errors.emoji && (
              <Text className="text-red-500 text-sm mt-1">{errors.emoji}</Text>
            )}
          </View>

          {/* Tracking Fields */}
          <View>
            <Text
              className={`text-lg font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Tracking Fields
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(
                [
                  { field: 'weight', label: 'Weight' },
                  { field: 'reps', label: 'Reps' },
                  { field: 'time', label: 'Time' },
                  { field: 'distance', label: 'Distance' },
                ] as { field: TrackingField; label: string }[]
              ).map(({ field, label }) => {
                const isSelected = trackingFields.includes(field);
                return (
                  <TouchableOpacity
                    key={field}
                    onPress={() => {
                      if (isSelected) {
                        // Don't allow removing the last field
                        if (trackingFields.length > 1) {
                          setTrackingFields(
                            trackingFields.filter(f => f !== field)
                          );
                        }
                      } else {
                        setTrackingFields([...trackingFields, field]);
                      }
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected
                        ? isDark
                          ? colors.primary.main
                          : '#a5b4fc'
                        : isDark
                          ? '#444'
                          : '#d1d5db',
                      backgroundColor: isSelected
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
                      {label} {isSelected ? '✓' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {trackingFields.map(field => {
                    const fieldConfig: Record<
                      TrackingField,
                      { label: string; unit?: string }
                    > = {
                      weight: { label: 'Weight', unit: 'lbs' },
                      reps: { label: 'Reps' },
                      time: { label: 'Time', unit: 'm:ss' },
                      distance: { label: 'Distance', unit: 'mi' },
                    };
                    const config = fieldConfig[field];
                    const value = set[field];

                    return (
                      <View
                        key={field}
                        style={{
                          flex: 1,
                          minWidth:
                            trackingFields.length > 2 ? '45%' : undefined,
                        }}
                      >
                        <Text
                          className={`text-sm mb-1 ${
                            isDark ? 'text-gray-300' : 'text-gray-600'
                          }`}
                        >
                          {config.label}
                          {config.unit ? ` (${config.unit})` : ''}
                        </Text>
                        <TextInput
                          ref={ref => {
                            setInputRefs.current[`${set.id}-${field}`] = ref;
                          }}
                          value={
                            field === 'time'
                              ? secondsToTimeString(value)
                              : value != null
                                ? value.toString()
                                : ''
                          }
                          onChangeText={text =>
                            handleUpdateSet(set.id, {
                              [field]:
                                field === 'time'
                                  ? timeStringToSeconds(text)
                                  : text
                                    ? parseFloat(text)
                                    : undefined,
                            })
                          }
                          keyboardType={
                            field === 'time'
                              ? 'numbers-and-punctuation'
                              : 'numeric'
                          }
                          className={`px-3 py-2 border rounded-lg ${
                            isDark
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          placeholder={field === 'time' ? '0:00' : ''}
                          placeholderTextColor={colors.textSecondary}
                          returnKeyType="done"
                          onSubmitEditing={() => Keyboard.dismiss()}
                          onFocus={() => {
                            setTimeout(() => {
                              scrollToSetInput(`${set.id}-${field}`);
                            }, 100);
                          }}
                        />
                      </View>
                    );
                  })}
                </View>
                <View className="flex-row space-x-3 mt-3">
                  <TouchableOpacity
                    onPress={() => handleDuplicateSet(set)}
                    className="flex-1 bg-blue-500 px-4 py-2 rounded-lg"
                  >
                    <Text className="text-white text-center font-semibold">
                      Duplicate
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteSet(set.id)}
                    className="flex-1 bg-red-500 px-4 py-2 rounded-lg"
                  >
                    <Text className="text-white text-center font-semibold">
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
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
                  ? `${recurringConfig.pattern === 'daily' ? 'Every day' : 'Weekly'} (${recurringConfig.occurrences} ${recurringConfig.pattern === 'daily' ? 'days' : 'weeks'})`
                  : 'Set up recurring schedule'}
              </Text>
              <Ionicons
                name="repeat-outline"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Delete Activity Link */}
          {mode === 'edit' && onDelete && (
            <TouchableOpacity onPress={onDelete} className="mt-6 mb-4">
              <Text className="text-red-500 text-center text-base">
                Delete Activity
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Sticky Save Button */}
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
                  backgroundColor: colors.primary.background,
                }}
              >
                <Text
                  style={{
                    color: colors.primary.main,
                    fontWeight: '600',
                    fontSize: 16,
                  }}
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
                themeVariant={isDark ? 'dark' : 'light'}
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
        initialConfig={recurringConfig}
      />
    </View>
  );
}
