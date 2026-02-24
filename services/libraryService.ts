import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL =
  (Constants.expoConfig?.extra?.API_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  '';

const LIBRARY_CACHE_KEY = 'rhythm_activity_library';

export interface LibraryItem {
  id?: string;
  name: string;
  type: string;
  category?: string;
  muscle_groups?: string[];
  difficulty?: string;
}

// Get cached library items from local storage
export async function getCachedLibrary(): Promise<LibraryItem[]> {
  try {
    const cached = await AsyncStorage.getItem(LIBRARY_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

// Save library items to local cache
async function cacheLibrary(items: LibraryItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to cache library:', err);
  }
}

// Fetch library from server and update cache
export async function fetchLibrary(
  accessToken: string
): Promise<LibraryItem[]> {
  if (!API_URL) {
    return getCachedLibrary();
  }

  try {
    const response = await fetch(`${API_URL}/api/library`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const items = data.items || [];
      await cacheLibrary(items);
      return items;
    }
  } catch (err) {
    console.error('Failed to fetch library:', err);
  }

  // Fallback to cache if fetch fails
  return getCachedLibrary();
}

// Add item to library (saves to server and updates cache)
export async function addToLibrary(
  accessToken: string | null,
  item: LibraryItem
): Promise<{ success: boolean; error?: string }> {
  // Always add to local cache first
  const cached = await getCachedLibrary();
  const exists = cached.some(
    i => i.name.toLowerCase() === item.name.toLowerCase()
  );

  if (exists) {
    return { success: false, error: 'Item already exists in library' };
  }

  // Add to cache with temporary ID
  const tempItem = { ...item, id: `temp_${Date.now()}` };
  await cacheLibrary([...cached, tempItem]);

  // If we have an access token and API URL, sync to server
  if (accessToken && API_URL) {
    try {
      const response = await fetch(`${API_URL}/api/library`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(item),
      });

      if (response.ok) {
        const data = await response.json();
        // Update cache with server-generated ID
        const updatedCache = cached.filter(
          i => i.name.toLowerCase() !== item.name.toLowerCase()
        );
        updatedCache.push(data.item);
        await cacheLibrary(updatedCache);
        return { success: true };
      } else if (response.status === 409) {
        return { success: false, error: 'Item already exists in library' };
      }
    } catch (err) {
      console.error('Failed to add to library:', err);
      // Keep in local cache even if server sync fails
    }
  }

  return { success: true };
}

// Remove item from library
export async function removeFromLibrary(
  accessToken: string | null,
  itemId: string
): Promise<boolean> {
  // Remove from cache
  const cached = await getCachedLibrary();
  const updated = cached.filter(i => i.id !== itemId);
  await cacheLibrary(updated);

  // Sync to server if possible
  if (accessToken && API_URL && !itemId.startsWith('temp_')) {
    try {
      await fetch(`${API_URL}/api/library?id=${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (err) {
      console.error('Failed to remove from library:', err);
    }
  }

  return true;
}

// Update item in library
export async function updateLibraryItem(
  accessToken: string | null,
  itemId: string,
  updates: Partial<LibraryItem>
): Promise<{ success: boolean; error?: string }> {
  // Update in cache
  const cached = await getCachedLibrary();
  const itemIndex = cached.findIndex(i => i.id === itemId);

  if (itemIndex === -1) {
    return { success: false, error: 'Item not found in library' };
  }

  // Check for duplicate name if name is being changed
  if (updates.name) {
    const duplicate = cached.some(
      i =>
        i.id !== itemId && i.name.toLowerCase() === updates.name!.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: 'An item with this name already exists' };
    }
  }

  // Store original item for potential rollback
  const originalItem = { ...cached[itemIndex] };
  const updatedItem = { ...cached[itemIndex], ...updates };
  cached[itemIndex] = updatedItem;
  await cacheLibrary(cached);

  // Sync to server if possible
  if (accessToken && API_URL && !itemId.startsWith('temp_')) {
    try {
      const response = await fetch(`${API_URL}/api/library?id=${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        // Revert cache on failure
        cached[itemIndex] = originalItem;
        await cacheLibrary(cached);

        const data = await response.json().catch(() => ({}));
        return { success: false, error: data.error || 'Failed to update item' };
      }
    } catch (err) {
      console.error('Failed to update library item:', err);
      // Revert cache on network error
      cached[itemIndex] = originalItem;
      await cacheLibrary(cached);
      return { success: false, error: 'Network error - please try again' };
    }
  }

  return { success: true };
}

// Clear local library cache
export async function clearLibraryCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LIBRARY_CACHE_KEY);
  } catch (err) {
    console.error('Failed to clear library cache:', err);
  }
}
