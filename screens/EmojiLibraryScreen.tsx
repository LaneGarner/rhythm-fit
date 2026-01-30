import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import HeaderButton from '../components/HeaderButton';
import { useAuth } from '../context/AuthContext';
import {
  addToEmojiLibrary,
  getCachedCustomEmojis,
  EmojiItem,
  removeFromEmojiLibrary,
} from '../services/emojiLibraryService';
import { useTheme } from '../theme/ThemeContext';

export default function EmojiLibraryScreen({ navigation }: any) {
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';
  const { getAccessToken } = useAuth();

  const [customEmojis, setCustomEmojis] = useState<EmojiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newEmojiText, setNewEmojiText] = useState('');

  useEffect(() => {
    loadEmojiLibrary();
  }, []);

  const loadEmojiLibrary = async () => {
    setLoading(true);
    const items = await getCachedCustomEmojis();
    setCustomEmojis(items);
    setLoading(false);
  };

  const handleDelete = async (item: EmojiItem) => {
    Alert.alert(
      'Delete Emoji',
      `Are you sure you want to delete "${item.emoji}" from your library? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const token = await getAccessToken();
            await removeFromEmojiLibrary(token, item.id);
            await loadEmojiLibrary();
          },
        },
      ]
    );
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setNewEmojiText('');
  };

  const filterToEmoji = (text: string): string => {
    const matches = text.match(/\p{Extended_Pictographic}/gu);
    return matches ? matches.join('') : '';
  };

  const handleSaveCreate = async () => {
    const filteredEmoji = filterToEmoji(newEmojiText);
    if (!filteredEmoji) {
      Alert.alert('Error', 'Please enter a valid emoji');
      return;
    }

    const token = await getAccessToken();
    const result = await addToEmojiLibrary(token, filteredEmoji);

    if (result.success) {
      setIsCreating(false);
      setNewEmojiText('');
      await loadEmojiLibrary();
    } else {
      Alert.alert('Error', result.error || 'Failed to add emoji');
    }
  };

  const closeModal = () => {
    setIsCreating(false);
    setNewEmojiText('');
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
            Emoji Library
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
        ) : customEmojis.length === 0 ? (
          <View className="items-center py-12">
            <Text style={{ fontSize: 48 }}>+</Text>
            <Text
              className={`text-lg font-semibold mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              No custom emojis yet
            </Text>
            <Text
              className={`text-center mt-2 px-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              Tap the + button to add a custom emoji, or add emojis from the
              activity form.
            </Text>
          </View>
        ) : (
          <>
            <Text
              className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {customEmojis.length} custom{' '}
              {customEmojis.length === 1 ? 'emoji' : 'emojis'}
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {customEmojis.map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleDelete(item)}
                  className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                >
                  <View style={{ position: 'relative' }}>
                    <Text style={{ fontSize: 36 }}>{item.emoji}</Text>
                    <View
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        backgroundColor: colors.border,
                        borderRadius: 10,
                        width: 20,
                        height: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name="close"
                        size={14}
                        color={colors.textSecondary}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={handleCreateNew}
        style={{
          position: 'absolute',
          bottom: 50,
          right: 34,
          backgroundColor: colors.primary.main,
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
        <Ionicons name="add" size={32} color={colors.textInverse} />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal
        visible={isCreating}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: colors.modalBackground }}>
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
                Add Emoji
              </Text>
              <TouchableOpacity onPress={handleSaveCreate}>
                <Text
                  className={`text-lg font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Emoji Input */}
            <View className="mb-6">
              <Text
                className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                Enter Emoji
              </Text>
              <TextInput
                value={newEmojiText}
                onChangeText={text => setNewEmojiText(filterToEmoji(text))}
                placeholder="Enter emoji"
                placeholderTextColor={colors.textSecondary}
                autoFocus
                className={`px-3 border rounded-lg ${
                  isDark
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                style={{
                  height: 40,
                  fontSize: 16,
                  width: 140,
                }}
                returnKeyType="done"
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                  handleSaveCreate();
                }}
              />
              <Text
                className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Only emoji characters will be saved. Other text will be filtered
                out.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
