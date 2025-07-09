import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ExerciseDefinition } from '../constants/exercises';
import { ActivityType } from '../types/activity';
import {
  addCustomExercise,
  getAllExercises,
  toTitleCase,
} from '../utils/storage';

interface ExerciseComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  activityType?: ActivityType;
}

export default function ExerciseComboBox({
  value,
  onValueChange,
  placeholder = 'Search exercises...',
  activityType,
}: ExerciseComboBoxProps) {
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<
    ExerciseDefinition[]
  >([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchText, setSearchText] = useState(value);
  const [showAddOption, setShowAddOption] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    if (searchText) {
      const filtered = exercises.filter(exercise =>
        exercise.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredExercises(filtered);
      setShowAddOption(filtered.length === 0 && searchText.trim().length > 0);
    } else {
      setFilteredExercises([]);
      setShowAddOption(false);
    }
  }, [searchText, exercises]);

  const loadExercises = async () => {
    const allExercises = await getAllExercises();
    if (activityType) {
      const typeFiltered = allExercises.filter(
        exercise => exercise.type === activityType
      );
      setExercises(typeFiltered);
    } else {
      setExercises(allExercises);
    }
  };

  const handleSelectExercise = (exercise: ExerciseDefinition) => {
    onValueChange(exercise.name);
    setSearchText(exercise.name);
    setIsModalVisible(false);
  };

  const handleAddNewExercise = async () => {
    const exerciseName = toTitleCase(searchText.trim());

    if (!exerciseName) {
      Alert.alert('Error', 'Please enter a valid exercise name');
      return;
    }

    // Check if exercise already exists
    const exists = exercises.some(
      ex => ex.name.toLowerCase() === exerciseName.toLowerCase()
    );
    if (exists) {
      Alert.alert(
        'Exercise Exists',
        'This exercise already exists in the database'
      );
      return;
    }

    // Create new exercise with default values
    const newExercise: ExerciseDefinition = {
      name: exerciseName,
      type: activityType || 'weight-training',
      category: 'Compound',
      muscleGroups: ['Full Body'],
      equipment: ['None'],
      difficulty: 'Beginner',
      description: `Custom exercise: ${exerciseName}`,
    };

    try {
      await addCustomExercise(newExercise);
      await loadExercises(); // Reload exercises
      handleSelectExercise(newExercise);
      Alert.alert(
        'Success',
        `Added "${exerciseName}" to your exercise library`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add exercise');
    }
  };

  const renderExerciseItem = ({ item }: { item: ExerciseDefinition }) => (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={() => handleSelectExercise(item)}
    >
      <Text style={styles.exerciseName}>{item.name}</Text>
      <Text style={styles.exerciseCategory}>{item.category}</Text>
    </TouchableOpacity>
  );

  const renderAddOption = () => (
    <TouchableOpacity
      style={[styles.exerciseItem, styles.addOption]}
      onPress={handleAddNewExercise}
    >
      <Text style={styles.addOptionText}>+ Add "{searchText}"</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => setIsModalVisible(true)}
      >
        <TextInput
          style={styles.input}
          value={searchText}
          onChangeText={setSearchText}
          placeholder={placeholder}
          editable={false}
        />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Exercise</Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search exercises..."
              autoFocus
            />

            <FlatList
              data={filteredExercises}
              renderItem={renderExerciseItem}
              keyExtractor={item => item.name}
              style={styles.exerciseList}
              ListFooterComponent={showAddOption ? renderAddOption : null}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  input: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  exerciseCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  addOption: {
    backgroundColor: '#f0f8ff',
    borderBottomColor: '#007AFF',
  },
  addOptionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
