import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DurationPickerModal from './DurationPickerModal';
import PlateIcon from './PlateIcon';
import { useTheme } from '../theme/ThemeContext';
import { ActivityType, SetData, TrackingField } from '../types/activity';
import { secondsToTimeString } from '../utils/timeFormat';

export interface SetCardProps {
  set: SetData;
  index: number;
  trackingFields: TrackingField[];
  activityType: ActivityType;
  onUpdateSet: (setId: string, updates: Partial<SetData>) => void;
  onShowOptions: (set: SetData) => void;
  onOpenPlateCalculator?: (setId: string) => void;
  inputRefs?: React.MutableRefObject<{ [key: string]: TextInput | null }>;
  onInputFocus?: (refKey: string) => void;
}

const FIELD_CONFIG: Record<TrackingField, { label: string; unit?: string }> = {
  weight: { label: 'Weight', unit: 'lbs' },
  reps: { label: 'Reps' },
  time: { label: 'Time', unit: 'm:ss' },
  distance: { label: 'Distance', unit: 'mi' },
};

export default function SetCard({
  set,
  index,
  trackingFields,
  activityType,
  onUpdateSet,
  onShowOptions,
  onOpenPlateCalculator,
  inputRefs,
  onInputFocus,
}: SetCardProps) {
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [distanceText, setDistanceText] = useState<Record<string, string>>({});

  return (
    <View
      className={`p-4 rounded-lg mb-3 ${
        isDark ? 'bg-gray-800' : 'bg-white'
      } shadow-sm`}
    >
      <View className="flex-row justify-between items-center mb-3">
        <Text
          className={`text-lg font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Set {index + 1}
        </Text>
        <TouchableOpacity
          onPress={() => onShowOptions(set)}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          className="p-1"
          accessibilityRole="button"
          accessibilityLabel={`Set ${index + 1} options`}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      <View className="flex-row flex-wrap" style={{ gap: 12 }}>
        {trackingFields.map(field => {
          const config = FIELD_CONFIG[field];
          const value = set[field];
          const showPlateIcon =
            field === 'weight' && activityType === 'weight-training';

          return (
            <View
              key={field}
              style={{
                flex: 1,
                minWidth: trackingFields.length > 2 ? '45%' : undefined,
              }}
            >
              <View className="flex-row items-center mb-1">
                <Text
                  className={`text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  {config.label}
                  {config.unit ? ` (${config.unit})` : ''}
                </Text>
                {showPlateIcon && onOpenPlateCalculator && (
                  <TouchableOpacity
                    onPress={() => onOpenPlateCalculator(set.id)}
                    hitSlop={{
                      top: 16,
                      bottom: 16,
                      left: 16,
                      right: 16,
                    }}
                    style={{ marginLeft: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Open plate calculator"
                  >
                    <PlateIcon variant="tooltip" />
                  </TouchableOpacity>
                )}
              </View>
              {field === 'time' ? (
                <TouchableOpacity
                  onPress={() => setShowDurationPicker(true)}
                  className={`px-3 py-2 border rounded-lg ${
                    isDark
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-white border-gray-300'
                  }`}
                  style={{ minHeight: 42 }}
                >
                  <Text
                    style={{
                      color: value ? colors.text : colors.textSecondary,
                      fontSize: 16,
                    }}
                  >
                    {value ? secondsToTimeString(value) : '0:00'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TextInput
                  ref={
                    inputRefs
                      ? ref => {
                          inputRefs.current[`${set.id}-${field}`] = ref;
                        }
                      : undefined
                  }
                  value={
                    field === 'distance' && distanceText[set.id] != null
                      ? distanceText[set.id]
                      : value != null
                        ? value.toString()
                        : ''
                  }
                  onChangeText={text => {
                    if (field === 'distance') {
                      if (text && !/^\d*\.?\d{0,2}$/.test(text)) return;
                      setDistanceText(prev => ({
                        ...prev,
                        [set.id]: text,
                      }));
                      return;
                    }
                    onUpdateSet(set.id, {
                      [field]: text ? parseFloat(text) : undefined,
                    });
                  }}
                  onBlur={() => {
                    if (field === 'distance') {
                      const text = distanceText[set.id];
                      if (text != null) {
                        onUpdateSet(set.id, {
                          distance: text ? parseFloat(text) : undefined,
                        });
                        setDistanceText(prev => {
                          const next = { ...prev };
                          delete next[set.id];
                          return next;
                        });
                      }
                    }
                  }}
                  keyboardType={
                    field === 'distance' ? 'decimal-pad' : 'numeric'
                  }
                  className={`px-3 py-2 border rounded-lg ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  onFocus={() => {
                    if (field === 'distance') {
                      setDistanceText(prev => ({
                        ...prev,
                        [set.id]: value != null ? value.toString() : '',
                      }));
                    }
                    if (onInputFocus) {
                      setTimeout(() => {
                        onInputFocus(`${set.id}-${field}`);
                      }, 100);
                    }
                  }}
                />
              )}
            </View>
          );
        })}
      </View>
      <TouchableOpacity
        onPress={() => onUpdateSet(set.id, { completed: !set.completed })}
        className="mt-5 px-4 py-4 rounded-lg"
        style={{
          backgroundColor: colors.surface,
          borderWidth: 2,
          borderColor: set.completed ? colors.success.main : colors.border,
        }}
        accessibilityRole="button"
        accessibilityLabel={`Set ${index + 1} ${set.completed ? 'completed' : 'incomplete'}. Tap to ${set.completed ? 'mark incomplete' : 'mark complete'}`}
        accessibilityState={{ checked: set.completed }}
      >
        <Text
          className={`text-center font-semibold text-lg`}
          style={{
            color: set.completed ? colors.success.main : colors.textSecondary,
          }}
        >
          {set.completed ? 'Completed  ✅' : 'Mark Complete'}
        </Text>
      </TouchableOpacity>

      <DurationPickerModal
        visible={showDurationPicker}
        value={set.time}
        onConfirm={seconds => {
          onUpdateSet(set.id, { time: seconds });
          setShowDurationPicker(false);
        }}
        onCancel={() => setShowDurationPicker(false)}
      />
    </View>
  );
}
