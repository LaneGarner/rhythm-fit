import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AppHeader, { AppHeaderTitle } from '../components/AppHeader';
import PlateIcon from '../components/PlateIcon';
import {
  Barbell,
  EquipmentConfig,
  PlateResult,
  calculatePlates,
  formatPlateResult,
  getCachedEquipment,
} from '../services/equipmentService';
import { useTheme } from '../theme/ThemeContext';

export default function CalculatorScreen({ navigation }: any) {
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';

  const [equipment, setEquipment] = useState<EquipmentConfig | null>(null);
  const [selectedBarbell, setSelectedBarbell] = useState<Barbell | null>(null);
  const [targetWeight, setTargetWeight] = useState('');
  const [result, setResult] = useState<PlateResult | null>(null);
  const [showBarbellPicker, setShowBarbellPicker] = useState(false);
  const [showAllWeights, setShowAllWeights] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadEquipment();
    }, [])
  );

  const loadEquipment = async () => {
    const config = await getCachedEquipment();
    setEquipment(config);

    // Set selected barbell
    const barbell =
      config.barbells.find(b => b.id === config.selectedBarbellId) ||
      config.barbells[0];
    setSelectedBarbell(barbell);
  };

  const handleCalculate = () => {
    if (!selectedBarbell || !equipment || !targetWeight) return;

    const target = parseFloat(targetWeight);
    if (isNaN(target) || target <= 0) return;

    const plateResult = calculatePlates(
      target,
      selectedBarbell.weight,
      equipment.plates.filter(p => p.count > 0)
    );
    setResult(plateResult);
  };

  const handleBarbellSelect = (barbell: Barbell) => {
    setSelectedBarbell(barbell);
    setShowBarbellPicker(false);
    // Recalculate if we have a target weight
    if (targetWeight && equipment) {
      const target = parseFloat(targetWeight);
      if (!isNaN(target) && target > 0) {
        const plateResult = calculatePlates(
          target,
          barbell.weight,
          equipment.plates.filter(p => p.count > 0)
        );
        setResult(plateResult);
      }
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <AppHeader>
        <AppHeaderTitle title="Weight Calculator" subtitle="Plate Breakdown" />
      </AppHeader>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Equipment link */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Equipment')}
          className="mb-4"
          accessibilityRole="button"
          accessibilityLabel="Configure Equipment"
        >
          <Text style={{ color: '#3b82f6' }}>Configure Equipment</Text>
        </TouchableOpacity>

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
            accessibilityRole="button"
            accessibilityLabel={
              selectedBarbell
                ? `Barbell: ${selectedBarbell.name}, ${selectedBarbell.weight} pounds. Tap to change`
                : 'Select barbell'
            }
            accessibilityState={{ expanded: showBarbellPicker }}
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
                        ? isDark
                          ? '#3b82f6'
                          : '#dbeafe'
                        : isDark
                          ? '#27272a'
                          : '#f9fafb',
                  }}
                  className="p-3 rounded-lg mb-1"
                  accessibilityRole="button"
                  accessibilityLabel={`${barbell.name}, ${barbell.weight} pounds${selectedBarbell?.id === barbell.id ? ', selected' : ''}`}
                  accessibilityState={{ selected: selectedBarbell?.id === barbell.id }}
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

        {/* Target Weight Input */}
        <View
          style={{ backgroundColor: colors.surface }}
          className="p-4 rounded-xl mb-4 shadow-sm"
        >
          <Text
            className="text-sm font-medium mb-2"
            style={{ color: colors.textSecondary }}
          >
            Target Weight (lbs)
          </Text>
          <View className="flex-row items-center">
            <TextInput
              value={targetWeight}
              onChangeText={setTargetWeight}
              keyboardType="numeric"
              placeholder="Enter weight"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="done"
              style={{
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
                height: 44,
                fontSize: 16,
                width: 120,
              }}
              className="px-3 rounded-lg border"
            />
            <TouchableOpacity
              onPress={handleCalculate}
              style={{ backgroundColor: '#3b82f6', height: 44 }}
              className="ml-3 px-6 rounded-lg justify-center"
              accessibilityRole="button"
              accessibilityLabel="Calculate plate breakdown"
            >
              <Text className="text-white font-semibold">Calculate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Weight Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
        >
          <View>
            {(() => {
              const barbellWeight = selectedBarbell?.weight || 45;
              const startWeight = Math.ceil(barbellWeight / 5) * 5;

              // Calculate max weight based on available equipment
              const availablePlates =
                equipment?.plates.filter(p => p.count > 0) || [];
              const maxPlateWeight = availablePlates.reduce(
                (sum, plate) => sum + plate.weight * plate.count,
                0
              );
              const maxWeight =
                Math.floor((barbellWeight + maxPlateWeight) / 5) * 5;

              // Build rows dynamically based on max weight
              // First row goes to 95, then break at 50s from second line down
              const allRows = [
                { start: startWeight, end: 95 },
                { start: 100, end: 145 },
                { start: 150, end: 195 },
                { start: 200, end: 245 },
                { start: 250, end: 295 },
                { start: 300, end: 345 },
                { start: 350, end: 395 },
                { start: 400, end: 445 },
                { start: 450, end: 495 },
                { start: 500, end: 545 },
                { start: 550, end: 595 },
                { start: 600, end: 645 },
                { start: 650, end: 695 },
              ];

              const filteredRows = allRows
                .filter(row => row.start <= maxWeight)
                .map(row => ({
                  start: row.start,
                  end: Math.min(row.end, maxWeight),
                }));

              const rows = showAllWeights
                ? filteredRows
                : filteredRows.slice(0, 3);
              const hasMoreRows = filteredRows.length > 3;

              return (
                <>
                  {rows.map((row, rowIndex) => (
                    <View key={rowIndex} className="flex-row mb-2">
                      {Array.from(
                        { length: Math.floor((row.end - row.start) / 5) + 1 },
                        (_, i) => row.start + i * 5
                      ).map(weight => (
                        <TouchableOpacity
                          key={weight}
                          onPress={() => {
                            setTargetWeight(weight.toString());
                            if (selectedBarbell && equipment) {
                              const plateResult = calculatePlates(
                                weight,
                                selectedBarbell.weight,
                                equipment.plates.filter(p => p.count > 0)
                              );
                              setResult(plateResult);
                            }
                          }}
                          style={{
                            backgroundColor:
                              targetWeight === weight.toString()
                                ? '#3b82f6'
                                : isDark
                                  ? '#27272a'
                                  : '#e5e7eb',
                          }}
                          className="px-3 py-1.5 rounded-full mr-2"
                          accessibilityRole="button"
                          accessibilityLabel={`${weight} pounds${targetWeight === weight.toString() ? ', selected' : ''}`}
                          accessibilityState={{ selected: targetWeight === weight.toString() }}
                        >
                          <Text
                            className="text-sm"
                            style={{
                              color:
                                targetWeight === weight.toString()
                                  ? '#fff'
                                  : isDark
                                    ? '#e5e5e5'
                                    : '#374151',
                            }}
                          >
                            {weight}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                  {hasMoreRows && (
                    <TouchableOpacity
                      onPress={() => setShowAllWeights(!showAllWeights)}
                      className="py-1"
                      accessibilityRole="button"
                      accessibilityLabel={showAllWeights ? 'Show fewer weight options' : 'Show more weight options'}
                    >
                      <Text style={{ color: '#3b82f6' }}>
                        {showAllWeights ? 'Show less' : 'Show more'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
          </View>
        </ScrollView>

        {/* Result */}
        {result && (
          <View
            style={{ backgroundColor: colors.surface }}
            className="p-4 rounded-xl mb-4 shadow-sm"
          >
            <Text
              className="text-lg font-semibold mb-3"
              style={{ color: colors.text }}
            >
              Result
            </Text>

            {result.perSide.length > 0 ? (
              <>
                {/* Plate breakdown text */}
                <Text
                  className="text-xl font-bold mb-2"
                  style={{ color: colors.primary.main }}
                >
                  {formatPlateResult(result)}
                </Text>

                {/* Total weight */}
                <Text
                  className="text-2xl font-bold mb-4"
                  style={{ color: colors.success.main }}
                >
                  = {result.achievedWeight} lbs
                </Text>

                {/* Warning if not exact */}
                {result.remainder > 0 && (
                  <View
                    style={{ backgroundColor: colors.warning.background }}
                    className="p-3 rounded-lg mb-4"
                  >
                    <Text style={{ color: colors.warning.main }}>
                      Target: {targetWeight} lbs ({result.remainder} lbs short)
                    </Text>
                  </View>
                )}

                {/* Visual plate display */}
                <View className="flex-row flex-wrap mt-2">
                  {result.perSide.map((item, idx) =>
                    Array.from({ length: item.count }).map((_, i) => (
                      <View key={`${idx}-${i}`} className="mr-2 mb-2">
                        <PlateIcon weight={item.weight} size={50} />
                      </View>
                    ))
                  )}
                </View>
                <Text
                  className="text-sm mt-2"
                  style={{ color: colors.textSecondary }}
                >
                  Plates shown for one side
                </Text>
              </>
            ) : (
              <Text style={{ color: colors.textSecondary }}>
                {parseFloat(targetWeight) < (selectedBarbell?.weight || 0)
                  ? `Target weight must be at least ${selectedBarbell?.weight} lbs (barbell weight)`
                  : 'No plates needed - just the bar!'}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
