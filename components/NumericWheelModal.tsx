import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface NumericWheelModalProps {
  visible: boolean;
  title: string;
  value?: number;
  min?: number;
  max: number;
  step: number;
  unit?: string;
  onConfirm: (value: number | undefined) => void;
  onCancel: () => void;
}

export default function NumericWheelModal({
  visible,
  title,
  value,
  min = 0,
  max,
  step,
  unit,
  onConfirm,
  onCancel,
}: NumericWheelModalProps) {
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';
  const [tempValue, setTempValue] = useState(min);

  const values = useMemo(() => {
    const count = Math.floor((max - min) / step) + 1;
    return Array.from({ length: count }, (_, index) => min + index * step);
  }, [max, min, step]);

  useEffect(() => {
    if (!visible) return;
    const fallback = value ?? min;
    const nearest = Math.round((fallback - min) / step) * step + min;
    const clamped = Math.min(max, Math.max(min, nearest));
    setTempValue(clamped);
  }, [max, min, step, value, visible]);

  const handleDone = () => {
    onConfirm(tempValue > 0 ? tempValue : undefined);
  };

  const displayValue = `${tempValue}${unit ? ` ${unit}` : ''}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={true}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={onCancel}
        />
        <View
          className={`rounded-t-3xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}
          style={{ paddingBottom: 32, paddingTop: 8 }}
        >
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
                {title}
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

          <View
            className={`flex-row items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <Text
              className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              {displayValue}
            </Text>
            <TouchableOpacity
              onPress={() => setTempValue(min)}
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

          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Picker
              selectedValue={tempValue}
              onValueChange={setTempValue}
              style={{ width: 180, height: 200 }}
              itemStyle={{
                color: colors.text,
                fontSize: 24,
              }}
            >
              {values.map(item => (
                <Picker.Item
                  key={item}
                  label={`${item}${unit ? ` ${unit}` : ''}`}
                  value={item}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>
    </Modal>
  );
}
