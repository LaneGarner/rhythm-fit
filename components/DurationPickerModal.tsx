import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface DurationPickerModalProps {
  visible: boolean;
  value?: number; // seconds
  onConfirm: (seconds: number | undefined) => void;
  onCancel: () => void;
  maxMinutes?: number;
}

export default function DurationPickerModal({
  visible,
  value,
  onConfirm,
  onCancel,
  maxMinutes = 60,
}: DurationPickerModalProps) {
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';

  const [tempMinutes, setTempMinutes] = useState(0);
  const [tempSeconds, setTempSeconds] = useState(0);

  useEffect(() => {
    if (visible) {
      const totalSeconds = value ?? 0;
      setTempMinutes(Math.floor(totalSeconds / 60));
      setTempSeconds(totalSeconds % 60);
    }
  }, [visible, value]);

  const handleDone = () => {
    const totalSeconds = tempMinutes * 60 + tempSeconds;
    onConfirm(totalSeconds > 0 ? totalSeconds : undefined);
  };

  const handleClear = () => {
    setTempMinutes(0);
    setTempSeconds(0);
  };

  const formatDisplay = () => {
    if (tempMinutes === 0 && tempSeconds === 0) {
      return '0:00';
    }
    return `${tempMinutes}:${tempSeconds.toString().padStart(2, '0')}`;
  };

  const minuteItems = Array.from({ length: maxMinutes + 1 }, (_, i) => i);
  const secondItems = Array.from({ length: 60 }, (_, i) => i);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={true}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={onCancel}
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
              <TouchableOpacity onPress={onCancel}>
                <Text
                  className={`text-lg ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text
                className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Duration
              </Text>
              <TouchableOpacity onPress={handleDone}>
                <Text
                  className={`text-lg font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Selected Time Display + Clear Button */}
          <View
            className={`flex-row items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <Text
              className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              {formatDisplay()}
            </Text>
            <TouchableOpacity
              onPress={handleClear}
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
                Clear
              </Text>
            </TouchableOpacity>
          </View>
          {/* Duration Pickers */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
            }}
          >
            {/* Minutes Picker */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text
                className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Minutes
              </Text>
              <Picker
                selectedValue={tempMinutes}
                onValueChange={setTempMinutes}
                style={{ width: 120, height: 180 }}
                itemStyle={{
                  color: colors.text,
                  fontSize: 22,
                }}
              >
                {minuteItems.map(m => (
                  <Picker.Item key={m} label={m.toString()} value={m} />
                ))}
              </Picker>
            </View>
            {/* Separator */}
            <Text
              className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
              style={{ marginTop: 24 }}
            >
              :
            </Text>
            {/* Seconds Picker */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text
                className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Seconds
              </Text>
              <Picker
                selectedValue={tempSeconds}
                onValueChange={setTempSeconds}
                style={{ width: 120, height: 180 }}
                itemStyle={{
                  color: colors.text,
                  fontSize: 22,
                }}
              >
                {secondItems.map(s => (
                  <Picker.Item
                    key={s}
                    label={s.toString().padStart(2, '0')}
                    value={s}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
