import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  addToLibrary,
  getCachedLibrary,
  LibraryItem,
  removeFromLibrary,
  updateLibraryItem,
} from '../services/libraryService';
import { getActivityTypes } from '../services/activityTypeService';
import { ThemeContext } from '../theme/ThemeContext';
import { toTitleCase } from '../utils/storage';

export default function ActivityLibraryScreen({ navigation }: any) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';
  const { getAccessToken } = useAuth();

  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const activityTypes = getActivityTypes();

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    setLoading(true);
    const items = await getCachedLibrary();
    setLibraryItems(items);
    setLoading(false);
  };

  const handleDelete = async (item: LibraryItem) => {
    Alert.alert(
      'Delete Activity',
      `Are you sure you want to delete "${item.name}" from your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const token = await getAccessToken();
            await removeFromLibrary(token, item.id!);
            await loadLibrary();
          },
        },
      ]
    );
  };

  const handleEdit = (item: LibraryItem) => {
    setOpenMenuId(null);
    setIsCreating(false);
    setEditingItem(item);
    setEditName(item.name);
    setEditType(item.type);
  };

  const handleDeleteWithMenu = (item: LibraryItem) => {
    setOpenMenuId(null);
    handleDelete(item);
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingItem(null);
    setEditName('');
    setEditType('weight-training');
  };

  const handleSaveCreate = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Activity name cannot be empty');
      return;
    }

    const token = await getAccessToken();
    const result = await addToLibrary(token, {
      name: toTitleCase(editName.trim()),
      type: editType,
    });

    if (result.success) {
      setIsCreating(false);
      await loadLibrary();
    } else {
      Alert.alert('Error', result.error || 'Failed to create activity');
    }
  };

  const closeModal = () => {
    setEditingItem(null);
    setIsCreating(false);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    if (!editName.trim()) {
      Alert.alert('Error', 'Activity name cannot be empty');
      return;
    }

    const token = await getAccessToken();
    const result = await updateLibraryItem(token, editingItem.id!, {
      name: toTitleCase(editName.trim()),
      type: editType,
    });

    if (result.success) {
      setEditingItem(null);
      await loadLibrary();
    } else {
      Alert.alert('Error', result.error || 'Failed to update activity');
    }
  };

  const getTypeEmoji = (type: string) => {
    const activityType = activityTypes.find(at => at.value === type);
    return activityType?.emoji || '';
  };

  const getTypeLabel = (type: string) => {
    const activityType = activityTypes.find(at => at.value === type);
    return activityType?.label || type;
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: isDark ? '#000' : '#fff' }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 60,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: isDark ? '#111' : '#fff',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#222' : '#e5e7eb',
        }}
      >
        <TouchableOpacity
          hitSlop={14}
          onPress={() => navigation.goBack()}
          style={{ paddingVertical: 4, paddingHorizontal: 8, marginRight: 8 }}
        >
          <Text style={{ color: '#2563eb', fontSize: 18, fontWeight: '500' }}>
            Back
          </Text>
        </TouchableOpacity>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 54,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: isDark ? '#fff' : '#111',
              textAlign: 'center',
            }}
          >
            Activity Library
          </Text>
        </View>
      </View>

      {/* Content */}
      <Pressable
        style={{ flex: 1 }}
        onPress={() => openMenuId && setOpenMenuId(null)}
      >
        <ScrollView className="flex-1 p-4">
          {loading ? (
          <Text
            className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            Loading...
          </Text>
        ) : libraryItems.length === 0 ? (
          <View className="items-center py-12">
            <Ionicons
              name="library-outline"
              size={48}
              color={isDark ? '#6B7280' : '#9CA3AF'}
            />
            <Text
              className={`text-lg font-semibold mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              No custom activities yet
            </Text>
            <Text
              className={`text-center mt-2 px-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              Tap the + button to create a custom activity, or add activities
              from the activity form.
            </Text>
          </View>
        ) : (
          <>
            <Text
              className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {libraryItems.length} custom{' '}
              {libraryItems.length === 1 ? 'activity' : 'activities'}
            </Text>
            {libraryItems.map(item => (
              <View
                key={item.id}
                className={`p-4 rounded-lg mb-3 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Text className="text-2xl mr-3">
                      {getTypeEmoji(item.type)}
                    </Text>
                    <View className="flex-1">
                      <Text
                        className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        {item.name}
                      </Text>
                      <Text
                        className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        {getTypeLabel(item.type)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ position: 'relative' }}>
                    <TouchableOpacity
                      onPress={() =>
                        setOpenMenuId(openMenuId === item.id ? null : item.id!)
                      }
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name="ellipsis-vertical"
                        size={20}
                        color={isDark ? '#9CA3AF' : '#6B7280'}
                      />
                    </TouchableOpacity>
                    {openMenuId === item.id && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 30,
                          right: 0,
                          backgroundColor: isDark ? '#374151' : '#fff',
                          borderRadius: 8,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                          elevation: 5,
                          zIndex: 1000,
                          minWidth: 120,
                          borderWidth: isDark ? 0 : 1,
                          borderColor: '#e5e7eb',
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => handleEdit(item)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? '#4B5563' : '#e5e7eb',
                          }}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={18}
                            color={isDark ? '#fff' : '#374151'}
                            style={{ marginRight: 10 }}
                          />
                          <Text
                            style={{
                              color: isDark ? '#fff' : '#374151',
                              fontSize: 16,
                            }}
                          >
                            Edit
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteWithMenu(item)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                          }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#EF4444"
                            style={{ marginRight: 10 }}
                          />
                          <Text style={{ color: '#EF4444', fontSize: 16 }}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
        </ScrollView>
      </Pressable>

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={handleCreateNew}
        style={{
          position: 'absolute',
          bottom: 50,
          right: 34,
          backgroundColor: '#2563eb',
          borderRadius: 32,
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5,
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Edit/Create Modal */}
      <Modal
        visible={editingItem !== null || isCreating}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
          {/* Modal Header */}
          <View
            className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <View className="flex-row justify-between items-center">
              <TouchableOpacity onPress={closeModal}>
                <Text
                  className={`text-lg ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text
                className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {isCreating ? 'New Activity' : 'Edit Activity'}
              </Text>
              <TouchableOpacity
                onPress={isCreating ? handleSaveCreate : handleSaveEdit}
              >
                <Text
                  className={`text-lg font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Name Input */}
            <View className="mb-6">
              <Text
                className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Activity Name
              </Text>
              <TextInput
                value={editName}
                onChangeText={text =>
                  setEditName(isCreating ? toTitleCase(text) : text)
                }
                placeholder="Enter activity name"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                className={`px-4 border rounded-lg ${
                  isDark
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                style={{
                  height: 48,
                  fontSize: 16,
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
                autoCapitalize={isCreating ? 'words' : 'sentences'}
              />
            </View>

            {/* Type Selection */}
            <View className="mb-6">
              <Text
                className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Activity Type
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {activityTypes.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => setEditType(type.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor:
                        editType === type.value
                          ? isDark
                            ? '#6366f1'
                            : '#a5b4fc'
                          : isDark
                            ? '#444'
                            : '#d1d5db',
                      backgroundColor:
                        editType === type.value
                          ? isDark
                            ? '#23263a'
                            : '#e0e7ff'
                          : isDark
                            ? '#1a1a1a'
                            : '#fff',
                    }}
                  >
                    <Text
                      className={`text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      {type.emoji} {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
