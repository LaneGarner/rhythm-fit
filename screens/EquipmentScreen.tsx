import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import HeaderButton from '../components/HeaderButton';
import PlateIcon from '../components/PlateIcon';
import { useAuth } from '../context/AuthContext';
import {
  Barbell,
  EquipmentConfig,
  Plate,
  addBarbell,
  addPlate,
  getCachedEquipment,
  removeBarbell,
  removePlate,
  setSelectedBarbell,
  updatePlateCount,
} from '../services/equipmentService';
import { useTheme } from '../theme/ThemeContext';

export default function EquipmentScreen({ navigation }: any) {
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';
  const { getAccessToken } = useAuth();

  const [equipment, setEquipment] = useState<EquipmentConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddBarbell, setShowAddBarbell] = useState(false);
  const [showAddPlate, setShowAddPlate] = useState(false);
  const [showEditPlate, setShowEditPlate] = useState<Plate | null>(null);

  // Form states
  const [newBarbellName, setNewBarbellName] = useState('');
  const [newBarbellWeight, setNewBarbellWeight] = useState('');
  const [newPlateWeight, setNewPlateWeight] = useState('');
  const [addAsPair, setAddAsPair] = useState(true);
  const [editPlateCount, setEditPlateCount] = useState('');

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    setLoading(true);
    const config = await getCachedEquipment();
    setEquipment(config);
    setLoading(false);
  };

  const handleDeleteBarbell = async (barbell: Barbell) => {
    if (barbell.isDefault) {
      Alert.alert('Cannot Delete', 'Default barbells cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Barbell',
      `Are you sure you want to delete "${barbell.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const token = await getAccessToken();
            await removeBarbell(token, barbell.id);
            await loadEquipment();
          },
        },
      ]
    );
  };

  const handleDeletePlate = async (plate: Plate) => {
    Alert.alert(
      'Delete Plate',
      `Are you sure you want to remove all ${plate.weight} lb plates? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const token = await getAccessToken();
            await removePlate(token, plate.id);
            await loadEquipment();
          },
        },
      ]
    );
  };

  const handleSelectBarbell = async (barbell: Barbell) => {
    await setSelectedBarbell(barbell.id);
    await loadEquipment();
  };

  const handleSaveBarbell = async () => {
    const weight = parseFloat(newBarbellWeight);
    if (!newBarbellName.trim()) {
      Alert.alert('Error', 'Please enter a barbell name');
      return;
    }
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    const token = await getAccessToken();
    const result = await addBarbell(token, {
      name: newBarbellName.trim(),
      weight,
    });

    if (result.success) {
      setShowAddBarbell(false);
      setNewBarbellName('');
      setNewBarbellWeight('');
      await loadEquipment();
    } else {
      Alert.alert('Error', result.error || 'Failed to add barbell');
    }
  };

  const handleSavePlate = async () => {
    const weight = parseFloat(newPlateWeight);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    const token = await getAccessToken();
    await addPlate(token, weight, addAsPair);

    setShowAddPlate(false);
    setNewPlateWeight('');
    setAddAsPair(true);
    await loadEquipment();
  };

  const handleUpdatePlateCount = async () => {
    if (!showEditPlate) return;

    const count = parseInt(editPlateCount, 10);
    if (isNaN(count) || count < 0) {
      Alert.alert('Error', 'Please enter a valid count');
      return;
    }

    const token = await getAccessToken();
    await updatePlateCount(token, showEditPlate.id, count);

    setShowEditPlate(null);
    setEditPlateCount('');
    await loadEquipment();
  };

  const openEditPlate = (plate: Plate) => {
    setShowEditPlate(plate);
    setEditPlateCount(plate.count.toString());
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 60,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <HeaderButton label="Back" onPress={() => navigation.goBack()} />
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: colors.text,
              textAlign: 'center',
            }}
          >
            Equipment
          </Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      {/* Content */}
      <ScrollView className="flex-1 p-4">
        {loading ? (
          <Text
            className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            Loading...
          </Text>
        ) : (
          <>
            {/* Barbells Section */}
            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className="text-lg font-semibold"
                  style={{ color: colors.text }}
                >
                  Barbells
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAddBarbell(true)}
                  className="flex-row items-center"
                  accessibilityRole="button"
                  accessibilityLabel="Add new barbell"
                >
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={colors.primary.main}
                  />
                  <Text style={{ color: colors.primary.main, marginLeft: 4 }}>
                    Add
                  </Text>
                </TouchableOpacity>
              </View>

              {equipment?.barbells.map(barbell => (
                <TouchableOpacity
                  key={barbell.id}
                  onPress={() => handleSelectBarbell(barbell)}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor:
                      equipment.selectedBarbellId === barbell.id
                        ? colors.primary.main
                        : colors.border,
                    borderWidth:
                      equipment.selectedBarbellId === barbell.id ? 2 : 1,
                  }}
                  className="p-4 rounded-lg mb-2 flex-row justify-between items-center"
                  accessibilityRole="button"
                  accessibilityLabel={`${barbell.name}, ${barbell.weight} pounds${equipment.selectedBarbellId === barbell.id ? ', selected' : ''}`}
                  accessibilityState={{
                    selected: equipment.selectedBarbellId === barbell.id,
                  }}
                >
                  <View className="flex-row items-center">
                    {equipment.selectedBarbellId === barbell.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.primary.main}
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <View>
                      <Text style={{ color: colors.text }}>{barbell.name}</Text>
                      <Text
                        className="text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        {barbell.weight} lbs
                      </Text>
                    </View>
                  </View>
                  {!barbell.isDefault && (
                    <TouchableOpacity
                      onPress={() => handleDeleteBarbell(barbell)}
                      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${barbell.name} barbell`}
                    >
                      <Ionicons
                        name="close-circle"
                        size={22}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Plates Section */}
            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className="text-lg font-semibold"
                  style={{ color: colors.text }}
                >
                  Plates
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAddPlate(true)}
                  className="flex-row items-center"
                  accessibilityRole="button"
                  accessibilityLabel="Add new plate"
                >
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={colors.primary.main}
                  />
                  <Text style={{ color: colors.primary.main, marginLeft: 4 }}>
                    Add
                  </Text>
                </TouchableOpacity>
              </View>

              {equipment?.plates.length === 0 ? (
                <View className="items-center py-8">
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="text-center"
                  >
                    No plates configured. Add some plates to get started.
                  </Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap">
                  {equipment?.plates.map(plate => (
                    <TouchableOpacity
                      key={plate.id}
                      onLongPress={() => openEditPlate(plate)}
                      delayLongPress={300}
                      style={{
                        backgroundColor: colors.surface,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                      }}
                      className="p-3 rounded-lg mr-3 mb-3 items-center"
                      accessibilityRole="button"
                      accessibilityLabel={`${plate.weight} pound plate, ${plate.count} total`}
                      accessibilityHint="Hold to edit count"
                    >
                      <View style={{ position: 'relative' }}>
                        <PlateIcon weight={plate.weight} size={60} />
                        <View
                          style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            backgroundColor: colors.primary.main,
                            borderRadius: 10,
                            minWidth: 20,
                            height: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 4,
                          }}
                        >
                          <Text
                            style={{
                              color: colors.textInverse,
                              fontSize: 12,
                              fontWeight: 'bold',
                            }}
                          >
                            {plate.count}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeletePlate(plate)}
                          style={{
                            position: 'absolute',
                            top: -8,
                            left: -8,
                            backgroundColor: colors.border,
                            borderRadius: 10,
                            width: 20,
                            height: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${plate.weight} pound plates`}
                        >
                          <Ionicons
                            name="close"
                            size={14}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text
                className="text-sm mt-2"
                style={{ color: colors.textSecondary }}
              >
                Hold to edit count
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Add Barbell Modal */}
      <Modal
        visible={showAddBarbell}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: colors.modalBackground }}>
          <View
            className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <View className="flex-row justify-between items-center">
              <TouchableOpacity onPress={() => setShowAddBarbell(false)}>
                <Text
                  className={`text-lg ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text
                className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Add Barbell
              </Text>
              <TouchableOpacity onPress={handleSaveBarbell}>
                <Text
                  className={`text-lg font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="mb-6">
              <Text
                className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Name
              </Text>
              <TextInput
                value={newBarbellName}
                onChangeText={setNewBarbellName}
                placeholder="e.g., EZ Curl Bar"
                placeholderTextColor={colors.textSecondary}
                autoFocus
                returnKeyType="done"
                className={`px-3 border rounded-lg ${
                  isDark
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                style={{ height: 44, fontSize: 16 }}
              />
            </View>

            <View className="mb-6">
              <Text
                className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Weight (lbs)
              </Text>
              <TextInput
                value={newBarbellWeight}
                onChangeText={setNewBarbellWeight}
                placeholder="e.g., 25"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                className={`px-3 border rounded-lg ${
                  isDark
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                style={{ height: 44, fontSize: 16 }}
                returnKeyType="done"
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                  handleSaveBarbell();
                }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Plate Modal */}
      <Modal
        visible={showAddPlate}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: colors.modalBackground }}>
          <View
            className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <View className="flex-row justify-between items-center">
              <TouchableOpacity onPress={() => setShowAddPlate(false)}>
                <Text
                  className={`text-lg ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text
                className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Add Plate
              </Text>
              <TouchableOpacity onPress={handleSavePlate}>
                <Text
                  className={`text-lg font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="mb-6">
              <Text
                className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Weight (lbs)
              </Text>
              <TextInput
                value={newPlateWeight}
                onChangeText={setNewPlateWeight}
                placeholder="e.g., 45"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                autoFocus
                returnKeyType="done"
                className={`px-3 border rounded-lg ${
                  isDark
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                style={{ height: 44, fontSize: 16 }}
              />
            </View>

            <View className="mb-6 flex-row justify-between items-center">
              <View>
                <Text
                  className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  Add as pair
                </Text>
                <Text
                  className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {addAsPair ? 'Adds 2 plates' : 'Adds 1 plate'}
                </Text>
              </View>
              <Switch
                value={addAsPair}
                onValueChange={setAddAsPair}
                trackColor={{ false: '#767577', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            </View>

            {/* Quick add buttons */}
            <View className="mb-6">
              <Text
                className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Quick add:
              </Text>
              <View className="flex-row flex-wrap">
                {[2.5, 5, 10, 25, 35, 45].map(weight => (
                  <TouchableOpacity
                    key={weight}
                    onPress={() => setNewPlateWeight(weight.toString())}
                    style={{
                      backgroundColor:
                        newPlateWeight === weight.toString()
                          ? '#3b82f6'
                          : isDark
                            ? '#27272a'
                            : '#e5e7eb',
                    }}
                    className="px-4 py-2 rounded-full mr-2 mb-2"
                    accessibilityRole="button"
                    accessibilityLabel={`${weight} pounds${newPlateWeight === weight.toString() ? ', selected' : ''}`}
                    accessibilityState={{
                      selected: newPlateWeight === weight.toString(),
                    }}
                  >
                    <Text
                      style={{
                        color:
                          newPlateWeight === weight.toString()
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
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Plate Count Modal */}
      <Modal
        visible={showEditPlate !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: colors.modalBackground }}>
          <View
            className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <View className="flex-row justify-between items-center">
              <TouchableOpacity onPress={() => setShowEditPlate(null)}>
                <Text
                  className={`text-lg ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text
                className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Edit Plate Count
              </Text>
              <TouchableOpacity onPress={handleUpdatePlateCount}>
                <Text
                  className={`text-lg font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            {showEditPlate && (
              <>
                <View className="items-center mb-6">
                  <PlateIcon weight={showEditPlate.weight} size={100} />
                  <Text
                    className="text-lg font-semibold mt-4"
                    style={{ color: colors.text }}
                  >
                    {showEditPlate.weight} lb plate
                  </Text>
                </View>

                <View className="mb-6">
                  <Text
                    className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    Total Count
                  </Text>
                  <TextInput
                    value={editPlateCount}
                    onChangeText={setEditPlateCount}
                    placeholder="Number of plates"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    autoFocus
                    className={`px-3 border rounded-lg ${
                      isDark
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    style={{ height: 44, fontSize: 16 }}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      Keyboard.dismiss();
                      handleUpdatePlateCount();
                    }}
                  />
                  <Text
                    className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Total individual plates (e.g., 4 means 2 per side max)
                  </Text>
                </View>

                {/* Quick count buttons */}
                <View className="flex-row flex-wrap">
                  {[2, 4, 6, 8].map(count => (
                    <TouchableOpacity
                      key={count}
                      onPress={() => setEditPlateCount(count.toString())}
                      style={{
                        backgroundColor:
                          editPlateCount === count.toString()
                            ? '#3b82f6'
                            : isDark
                              ? '#27272a'
                              : '#e5e7eb',
                      }}
                      className="px-4 py-2 rounded-full mr-2 mb-2"
                      accessibilityRole="button"
                      accessibilityLabel={`${count} plates${editPlateCount === count.toString() ? ', selected' : ''}`}
                      accessibilityState={{
                        selected: editPlateCount === count.toString(),
                      }}
                    >
                      <Text
                        style={{
                          color:
                            editPlateCount === count.toString()
                              ? '#fff'
                              : isDark
                                ? '#e5e5e5'
                                : '#374151',
                        }}
                      >
                        {count}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
