import React, { useCallback, useEffect, useState } from 'react';
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
import { useTheme } from '../theme/ThemeContext';

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
  const { colors } = useTheme();

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
      <View style={{ flex: 1, backgroundColor: colors.modalBackground }}>
        {/* Header */}
        <View
          className="p-4 border-b"
          style={{ borderBottomColor: colors.border }}
        >
          <Text
            className="text-xl font-bold text-center"
            style={{ color: colors.text }}
          >
            Plate Calculator
          </Text>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Target Weight Display */}
          <View
            style={{ backgroundColor: colors.surfaceSecondary }}
            className="p-4 rounded-xl mb-4"
          >
            <Text
              className="text-4xl font-bold text-center"
              style={{ color: colors.text }}
            >
              {targetWeight > 0 ? `${targetWeight} lbs` : 'No weight set'}
            </Text>
          </View>

          {/* Barbell Selector */}
          <View
            style={{ backgroundColor: colors.surface }}
            className="p-4 rounded-xl mb-4 shadow-sm"
          >
            <Text
              className="text-sm font-medium mb-2"
              style={{ color: colors.textSecondary }}
            >
              Barbell
            </Text>
            <TouchableOpacity
              onPress={() => setShowBarbellPicker(!showBarbellPicker)}
              style={{
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
              }}
              className="p-3 rounded-lg border flex-row justify-between items-center"
            >
              <Text style={{ color: colors.text }}>
                {selectedBarbell
                  ? `${selectedBarbell.name} (${selectedBarbell.weight} lbs)`
                  : 'Select barbell'}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
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
                          ? colors.primary.background
                          : colors.backgroundSecondary,
                    }}
                    className="p-3 rounded-lg mb-1"
                  >
                    <Text
                      style={{
                        color:
                          selectedBarbell?.id === barbell.id
                            ? colors.primary.main
                            : colors.text,
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
              style={{ backgroundColor: colors.surface }}
              className="p-4 rounded-xl mb-4 shadow-sm"
            >
              {result.perSide.length > 0 ? (
                <>
                  {/* Bar weight */}
                  <Text
                    className="text-base mb-2"
                    style={{ color: colors.textSecondary }}
                  >
                    Bar: {selectedBarbell?.weight} lbs
                  </Text>

                  {/* Plate breakdown text */}
                  <Text
                    className="text-xl font-bold mb-3"
                    style={{ color: colors.primary.main }}
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
                    style={{ color: colors.textSecondary }}
                  >
                    Plates shown for one side
                  </Text>

                  {/* Warning if not exact */}
                  {result.remainder > 0 && (
                    <View
                      style={{
                        backgroundColor: colors.warning.background,
                      }}
                      className="p-3 rounded-lg mt-4"
                    >
                      <Text style={{ color: colors.warning.main }}>
                        Closest achievable: {result.achievedWeight} lbs (
                        {result.remainder} lbs short of {targetWeight})
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={{ color: colors.textSecondary }}>
                  {targetWeight < (selectedBarbell?.weight || 0)
                    ? `Target weight must be at least ${selectedBarbell?.weight} lbs (barbell weight)`
                    : 'No plates needed - just the bar!'}
                </Text>
              )}
            </View>
          )}

          {targetWeight === 0 && (
            <View
              style={{ backgroundColor: colors.surface }}
              className="p-4 rounded-xl mb-4 shadow-sm"
            >
              <Text
                className="text-center"
                style={{ color: colors.textSecondary }}
              >
                Enter a weight in the set first, then tap the plate icon to see
                the breakdown.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Button */}
        <View
          className="p-4 border-t"
          style={{ borderTopColor: colors.border, paddingBottom: 34 }}
        >
          <TouchableOpacity
            onPress={onClose}
            className="py-4 rounded-xl"
            style={{ backgroundColor: colors.primary.main }}
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
