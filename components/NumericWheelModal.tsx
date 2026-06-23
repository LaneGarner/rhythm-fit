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
  stepOptions?: number[];
  onConfirm: (value: number | undefined) => void;
  onCancel: () => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function NumericWheelModal({
  visible,
  title,
  value,
  min = 0,
  max,
  step,
  unit,
  stepOptions,
  onConfirm,
  onCancel,
}: NumericWheelModalProps) {
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';
  const [tempValue, setTempValue] = useState(min);
  const [selectedStep, setSelectedStep] = useState(step);

  const values = useMemo(() => {
    const count = Math.floor((max - min) / selectedStep) + 1;
    return Array.from({ length: count }, (_, index) =>
      round2(min + index * selectedStep)
    );
  }, [max, min, selectedStep]);

  useEffect(() => {
    if (!visible) return;
    setSelectedStep(step);
    const fallback = value ?? min;
    const nearest = Math.round((fallback - min) / step) * step + min;
    const clamped = Math.min(max, Math.max(min, nearest));
    setTempValue(round2(clamped));
  }, [max, min, step, value, visible]);

  const handleStepChange = (nextStep: number) => {
    setSelectedStep(nextStep);
    setTempValue(prev => {
      const nearest = Math.round((prev - min) / nextStep) * nextStep + min;
      return round2(Math.min(max, Math.max(min, nearest)));
    });
  };

  const handleDone = () => {
    onConfirm(tempValue > 0 ? tempValue : undefined);
  };

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
                  className="text-lg"
                  style={{ color: colors.primary.main }}
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
                  className="text-lg font-semibold"
                  style={{ color: colors.primary.main }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {stepOptions && stepOptions.length > 1 && (
            <View
              className={`flex-row items-center justify-center p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
              style={{ gap: 8 }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  marginRight: 4,
                }}
              >
                Increment
              </Text>
              {stepOptions.map(opt => {
                const active = selectedStep === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => handleStepChange(opt)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: active
                        ? colors.primary.main
                        : colors.backgroundTertiary,
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Increment of ${opt}`}
                  >
                    <Text
                      style={{
                        color: active
                          ? colors.textInverse
                          : colors.textSecondary,
                        fontWeight: '600',
                        fontSize: 15,
                      }}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

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
