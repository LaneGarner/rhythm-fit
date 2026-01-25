import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL =
  (Constants.expoConfig?.extra?.API_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  '';

const EMOJI_LIBRARY_KEY = 'rhythm_emoji_library';

export interface EmojiItem {
  id: string;
  emoji: string;
  createdAt: string;
}

// Get cached emoji library from local storage
export async function getCachedCustomEmojis(): Promise<EmojiItem[]> {
  try {
    const cached = await AsyncStorage.getItem(EMOJI_LIBRARY_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

// Save emoji library to local cache
async function cacheEmojiLibrary(items: EmojiItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(EMOJI_LIBRARY_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to cache emoji library:', err);
  }
}

// Add emoji to library (saves to server and updates cache)
export async function addToEmojiLibrary(
  accessToken: string | null,
  emoji: string
): Promise<{ success: boolean; error?: string }> {
  // Always add to local cache first
  const cached = await getCachedCustomEmojis();
  const exists = cached.some(item => item.emoji === emoji);

  if (exists) {
    return { success: false, error: 'Emoji already in library' };
  }

  // Add to cache with temporary ID
  const newItem: EmojiItem = {
    id: `temp_${Date.now()}`,
    emoji,
    createdAt: new Date().toISOString(),
  };
  await cacheEmojiLibrary([...cached, newItem]);

  // If we have an access token and API URL, sync to server
  if (accessToken && API_URL) {
    try {
      const response = await fetch(`${API_URL}/api/emoji-library`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ emoji }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update cache with server-generated ID
        const updatedCache = cached.filter(item => item.emoji !== emoji);
        updatedCache.push(data.item);
        await cacheEmojiLibrary(updatedCache);
        return { success: true };
      } else if (response.status === 409) {
        return { success: false, error: 'Emoji already in library' };
      }
    } catch (err) {
      console.error('Failed to add to emoji library:', err);
      // Keep in local cache even if server sync fails
    }
  }

  return { success: true };
}

// Remove emoji from library
export async function removeFromEmojiLibrary(
  accessToken: string | null,
  itemId: string
): Promise<boolean> {
  // Remove from cache
  const cached = await getCachedCustomEmojis();
  const updated = cached.filter(item => item.id !== itemId);
  await cacheEmojiLibrary(updated);

  // Sync to server if possible
  if (accessToken && API_URL && !itemId.startsWith('temp_')) {
    try {
      await fetch(`${API_URL}/api/emoji-library?id=${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (err) {
      console.error('Failed to remove from emoji library:', err);
    }
  }

  return true;
}

// Fetch emoji library from server and update cache
export async function fetchEmojiLibrary(
  accessToken: string
): Promise<EmojiItem[]> {
  if (!API_URL) {
    return getCachedEmojiLibrary();
  }

  try {
    const response = await fetch(`${API_URL}/api/emoji-library`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const items = data.items || [];
      await cacheEmojiLibrary(items);
      return items;
    }
  } catch (err) {
    console.error('Failed to fetch emoji library:', err);
  }

  // Fallback to cache if fetch fails
  return getCachedCustomEmojis();
}

// Clear local emoji library cache
export async function clearEmojiLibraryCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(EMOJI_LIBRARY_KEY);
  } catch (err) {
    console.error('Failed to clear emoji library cache:', err);
  }
}
