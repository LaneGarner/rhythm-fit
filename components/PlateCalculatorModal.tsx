import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import PlateIcon from './PlateIcon';
import {
  Barbell,
  EquipmentConfig,
  PlateResult,
  calculatePlates,
  formatPlateResult,
  getCachedEquipment,
} from '../services/equipmentService';
import { ThemeContext } from '../theme/ThemeContext';

interface PlateCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectWeight: (weight: number) => void;
  initialWeight?: number;
}

export default function PlateCalculatorModal({
  visible,
  onClose,
  onSelectWeight,
  initialWeight,
}: PlateCalculatorModalProps) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const [equipment, setEquipment] = useState<EquipmentConfig | null>(null);
  const [selectedBarbell, setSelectedBarbell] = useState<Barbell | null>(null);
  const [result, setResult] = useState<PlateResult | null>(null);
  const [showBarbellPicker, setShowBarbellPicker] = useState(false);

  const targetWeight = initialWeight || 0;

  const loadEquipment = useCallback(async () => {
    const config = await getCachedEquipment();
    setEquipment(config);

    const barbell =
      config.barbells.find(b => b.id === config.selectedBarbellId) ||
      config.barbells.find(b => b.isDefault) ||
      config.barbells[0];
    setSelectedBarbell(barbell);

    // Calculate immediately if we have a weight
    if (targetWeight > 0 && barbell) {
      const plateResult = calculatePlates(
        targetWeight,
        barbell.weight,
        config.plates.filter(p => p.count > 0)
      );
      setResult(plateResult);
    }
  }, [targetWeight]);

  useEffect(() => {
    if (visible) {
      loadEquipment();
    } else {
      setShowBarbellPicker(false);
      setResult(null);
    }
  }, [visible, loadEquipment]);

  // Recalculate when barbell changes
  useEffect(() => {
    if (visible && selectedBarbell && equipment && targetWeight > 0) {
      const plateResult = calculatePlates(
        targetWeight,
        selectedBarbell.weight,
        equipment.plates.filter(p => p.count > 0)
      );
      setResult(plateResult);
    }
  }, [selectedBarbell, visible, equipment, targetWeight]);

  const handleBarbellSelect = (barbell: Barbell) => {
    setSelectedBarbell(barbell);
    setShowBarbellPicker(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
        {/* Header */}
        <View
          className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <Text
            className={`text-xl font-bold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            Plate Calculator
          </Text>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Target Weight Display */}
          <View
            style={{ backgroundColor: isDark ? '#18181b' : '#f3f4f6' }}
            className="p-4 rounded-xl mb-4"
          >
            <Text
              className="text-4xl font-bold text-center"
              style={{ color: isDark ? '#fff' : '#111' }}
            >
              {targetWeight > 0 ? `${targetWeight} lbs` : 'No weight set'}
            </Text>
          </View>

          {/* Barbell Selector */}
          <View
            style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
            className="p-4 rounded-xl mb-4 shadow-sm"
          >
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
            >
              Barbell
            </Text>
            <TouchableOpacity
              onPress={() => setShowBarbellPicker(!showBarbellPicker)}
              style={{
                backgroundColor: isDark ? '#27272a' : '#f3f4f6',
                borderColor: isDark ? '#3f3f46' : '#d1d5db',
              }}
              className="p-3 rounded-lg border flex-row justify-between items-center"
            >
              <Text style={{ color: isDark ? '#fff' : '#111' }}>
                {selectedBarbell
                  ? `${selectedBarbell.name} (${selectedBarbell.weight} lbs)`
                  : 'Select barbell'}
              </Text>
              <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}>
                {showBarbellPicker ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {showBarbellPicker && equipment && (
              <View className="mt-2">
                {equipment.barbells.map(barbell => (
                  <TouchableOpacity
                    key={barbell.id}
                    onPress={() => handleBarbellSelect(barbell)}
                    style={{
                      backgroundColor:
                        selectedBarbell?.id === barbell.id
                          ? isDark
                            ? '#3b82f6'
                            : '#dbeafe'
                          : isDark
                            ? '#27272a'
                            : '#f9fafb',
                    }}
                    className="p-3 rounded-lg mb-1"
                  >
                    <Text
                      style={{
                        color:
                          selectedBarbell?.id === barbell.id
                            ? isDark
                              ? '#fff'
                              : '#1d4ed8'
                            : isDark
                              ? '#e5e5e5'
                              : '#374151',
                      }}
                    >
                      {barbell.name} ({barbell.weight} lbs)
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Result */}
          {targetWeight > 0 && result && (
            <View
              style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
              className="p-4 rounded-xl mb-4 shadow-sm"
            >
              {result.perSide.length > 0 ? (
                <>
                  {/* Bar weight */}
                  <Text
                    className="text-base mb-2"
                    style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
                  >
                    Bar: {selectedBarbell?.weight} lbs
                  </Text>

                  {/* Plate breakdown text */}
                  <Text
                    className="text-xl font-bold mb-3"
                    style={{ color: isDark ? '#60a5fa' : '#2563eb' }}
                  >
                    + {formatPlateResult(result)}
                  </Text>

                  {/* Visual plate display */}
                  <View className="flex-row flex-wrap mb-3">
                    {result.perSide.map((item, idx) =>
                      Array.from({ length: item.count }).map((_, i) => (
                        <View key={`${idx}-${i}`} className="mr-2 mb-2">
                          <PlateIcon weight={item.weight} size={50} />
                        </View>
                      ))
                    )}
                  </View>
                  <Text
                    className="text-sm"
                    style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
                  >
                    Plates shown for one side
                  </Text>

                  {/* Warning if not exact */}
                  {result.remainder > 0 && (
                    <View
                      style={{
                        backgroundColor: isDark ? '#422006' : '#fef3c7',
                      }}
                      className="p-3 rounded-lg mt-4"
                    >
                      <Text style={{ color: isDark ? '#fbbf24' : '#92400e' }}>
                        Closest achievable: {result.achievedWeight} lbs (
                        {result.remainder} lbs short of {targetWeight})
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}>
                  {targetWeight < (selectedBarbell?.weight || 0)
                    ? `Target weight must be at least ${selectedBarbell?.weight} lbs (barbell weight)`
                    : 'No plates needed - just the bar!'}
                </Text>
              )}
            </View>
          )}

          {targetWeight === 0 && (
            <View
              style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
              className="p-4 rounded-xl mb-4 shadow-sm"
            >
              <Text
                className="text-center"
                style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
              >
                Enter a weight in the set first, then tap the plate icon to see
                the breakdown.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Button */}
        <View
          className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          style={{ paddingBottom: 34 }}
        >
          <TouchableOpacity
            onPress={onClose}
            className="py-4 rounded-xl"
            style={{ backgroundColor: '#3b82f6' }}
          >
            <Text className="text-white text-center text-lg font-semibold">
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
