import React, { useContext, useEffect, useState } from 'react';
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
import { ThemeContext } from '../theme/ThemeContext';

export default function CalculatorScreen({ navigation }: any) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const [equipment, setEquipment] = useState<EquipmentConfig | null>(null);
  const [selectedBarbell, setSelectedBarbell] = useState<Barbell | null>(null);
  const [targetWeight, setTargetWeight] = useState('');
  const [result, setResult] = useState<PlateResult | null>(null);
  const [showBarbellPicker, setShowBarbellPicker] = useState(false);

  useEffect(() => {
    loadEquipment();
  }, []);

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
      equipment.plates
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
          equipment.plates
        );
        setResult(plateResult);
      }
    }
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: isDark ? '#000' : '#F9FAFB' }}
    >
      <AppHeader>
        <AppHeaderTitle title="Weight Calculator" subtitle="Plate Breakdown" />
      </AppHeader>

      <ScrollView className="flex-1 px-4 pt-4">
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

        {/* Target Weight Input */}
        <View
          style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
          className="p-4 rounded-xl mb-4 shadow-sm"
        >
          <Text
            className="text-sm font-medium mb-2"
            style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
          >
            Target Weight (lbs)
          </Text>
          <View className="flex-row items-center">
            <TextInput
              value={targetWeight}
              onChangeText={setTargetWeight}
              keyboardType="numeric"
              placeholder="Enter weight"
              placeholderTextColor={isDark ? '#71717a' : '#9ca3af'}
              style={{
                backgroundColor: isDark ? '#27272a' : '#f3f4f6',
                borderColor: isDark ? '#3f3f46' : '#d1d5db',
                color: isDark ? '#fff' : '#111',
              }}
              className="flex-1 p-3 rounded-lg border text-lg"
            />
            <TouchableOpacity
              onPress={handleCalculate}
              style={{ backgroundColor: '#3b82f6' }}
              className="ml-3 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">Calculate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Weight Buttons */}
        <View className="flex-row flex-wrap mb-4">
          {[135, 185, 225, 275, 315, 405].map(weight => (
            <TouchableOpacity
              key={weight}
              onPress={() => {
                setTargetWeight(weight.toString());
                if (selectedBarbell && equipment) {
                  const plateResult = calculatePlates(
                    weight,
                    selectedBarbell.weight,
                    equipment.plates
                  );
                  setResult(plateResult);
                }
              }}
              style={{
                backgroundColor: isDark ? '#27272a' : '#e5e7eb',
              }}
              className="px-4 py-2 rounded-full mr-2 mb-2"
            >
              <Text style={{ color: isDark ? '#e5e5e5' : '#374151' }}>
                {weight}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Result */}
        {result && (
          <View
            style={{ backgroundColor: isDark ? '#18181b' : '#fff' }}
            className="p-4 rounded-xl mb-4 shadow-sm"
          >
            <Text
              className="text-lg font-semibold mb-3"
              style={{ color: isDark ? '#fff' : '#111' }}
            >
              Result
            </Text>

            {result.perSide.length > 0 ? (
              <>
                {/* Plate breakdown text */}
                <Text
                  className="text-xl font-bold mb-2"
                  style={{ color: isDark ? '#60a5fa' : '#2563eb' }}
                >
                  {formatPlateResult(result)}
                </Text>

                {/* Total weight */}
                <Text
                  className="text-2xl font-bold mb-4"
                  style={{ color: isDark ? '#34d399' : '#22c55e' }}
                >
                  = {result.achievedWeight} lbs
                </Text>

                {/* Warning if not exact */}
                {result.remainder > 0 && (
                  <View
                    style={{ backgroundColor: isDark ? '#422006' : '#fef3c7' }}
                    className="p-3 rounded-lg mb-4"
                  >
                    <Text style={{ color: isDark ? '#fbbf24' : '#92400e' }}>
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
                  style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
                >
                  Plates shown for one side
                </Text>
              </>
            ) : (
              <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}>
                {parseFloat(targetWeight) < (selectedBarbell?.weight || 0)
                  ? `Target weight must be at least ${selectedBarbell?.weight} lbs (barbell weight)`
                  : 'No plates needed - just the bar!'}
              </Text>
            )}
          </View>
        )}

        {/* Equipment info */}
        {equipment && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Equipment')}
            style={{
              backgroundColor: isDark ? '#18181b' : '#fff',
              borderColor: isDark ? '#27272a' : '#e5e7eb',
            }}
            className="p-4 rounded-xl mb-6 border flex-row justify-between items-center"
          >
            <View>
              <Text
                className="font-medium"
                style={{ color: isDark ? '#fff' : '#111' }}
              >
                Configure Equipment
              </Text>
              <Text
                className="text-sm"
                style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
              >
                {equipment.barbells.length} barbells, {equipment.plates.length}{' '}
                plate sizes
              </Text>
            </View>
            <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}>›</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
