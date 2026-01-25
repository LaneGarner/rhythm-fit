import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL =
  (Constants.expoConfig?.extra?.API_URL as string | undefined) ||
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  '';

const EQUIPMENT_KEY = 'rhythm_equipment_config';

export interface Barbell {
  id: string;
  name: string;
  weight: number; // in lbs
  isDefault?: boolean;
}

export interface Plate {
  id: string;
  weight: number; // in lbs
  count: number; // total individual plates owned (e.g., 4 = can put 2 per side)
}

export interface EquipmentConfig {
  barbells: Barbell[];
  plates: Plate[];
  selectedBarbellId: string | null;
}

export interface PlateResult {
  perSide: { weight: number; count: number }[];
  achievedWeight: number;
  remainder: number;
}

const DEFAULT_BARBELLS: Barbell[] = [
  {
    id: 'olympic-mens',
    name: "Men's Olympic Bar",
    weight: 45,
    isDefault: true,
  },
  { id: 'olympic-womens', name: "Women's Olympic Bar", weight: 35 },
];

const DEFAULT_PLATES: Plate[] = [
  { id: 'plate-1.5', weight: 1.5, count: 2 },
  { id: 'plate-2.5', weight: 2.5, count: 2 },
  { id: 'plate-5', weight: 5, count: 2 },
  { id: 'plate-10', weight: 10, count: 2 },
  { id: 'plate-15', weight: 15, count: 2 },
  { id: 'plate-25', weight: 25, count: 2 },
  { id: 'plate-35', weight: 35, count: 2 },
  { id: 'plate-45', weight: 45, count: 4 },
  { id: 'plate-55', weight: 55, count: 2 },
];

function getDefaultConfig(): EquipmentConfig {
  return {
    barbells: DEFAULT_BARBELLS,
    plates: DEFAULT_PLATES,
    selectedBarbellId: 'olympic-mens',
  };
}

// Get cached equipment config from local storage
export async function getCachedEquipment(): Promise<EquipmentConfig> {
  try {
    const cached = await AsyncStorage.getItem(EQUIPMENT_KEY);
    return cached ? JSON.parse(cached) : getDefaultConfig();
  } catch {
    return getDefaultConfig();
  }
}

// Save equipment config to local cache
export async function cacheEquipment(config: EquipmentConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(EQUIPMENT_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to cache equipment config:', err);
  }
}

// Clear local equipment cache
export async function clearEquipmentCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(EQUIPMENT_KEY);
  } catch (err) {
    console.error('Failed to clear equipment cache:', err);
  }
}

// Add barbell (saves to cache and optionally syncs to server)
export async function addBarbell(
  accessToken: string | null,
  barbell: Omit<Barbell, 'id'>
): Promise<{ success: boolean; error?: string }> {
  const config = await getCachedEquipment();

  // Check for duplicate name
  const exists = config.barbells.some(
    b => b.name.toLowerCase() === barbell.name.toLowerCase()
  );
  if (exists) {
    return { success: false, error: 'Barbell with this name already exists' };
  }

  // Add with temporary ID
  const newBarbell: Barbell = {
    ...barbell,
    id: `temp_${Date.now()}`,
  };
  config.barbells.push(newBarbell);
  await cacheEquipment(config);

  // Sync to server if authenticated
  if (accessToken && API_URL) {
    try {
      const response = await fetch(`${API_URL}/api/equipment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          type: 'barbell',
          name: barbell.name,
          weight: barbell.weight,
          isDefault: barbell.isDefault,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update cache with server-generated ID
        const updatedConfig = await getCachedEquipment();
        const idx = updatedConfig.barbells.findIndex(
          b => b.id === newBarbell.id
        );
        if (idx !== -1) {
          updatedConfig.barbells[idx] = data.item;
          await cacheEquipment(updatedConfig);
        }
      }
    } catch (err) {
      console.error('Failed to sync barbell to server:', err);
    }
  }

  return { success: true };
}

// Remove barbell
export async function removeBarbell(
  accessToken: string | null,
  barbellId: string
): Promise<boolean> {
  const config = await getCachedEquipment();
  config.barbells = config.barbells.filter(b => b.id !== barbellId);

  // If removed barbell was selected, select first available
  if (config.selectedBarbellId === barbellId) {
    config.selectedBarbellId = config.barbells[0]?.id || null;
  }

  await cacheEquipment(config);

  // Sync to server if authenticated and not a temp ID
  if (accessToken && API_URL && !barbellId.startsWith('temp_')) {
    try {
      await fetch(`${API_URL}/api/equipment?id=${barbellId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (err) {
      console.error('Failed to remove barbell from server:', err);
    }
  }

  return true;
}

// Add plate (saves to cache and optionally syncs to server)
export async function addPlate(
  accessToken: string | null,
  weight: number,
  asPair: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const config = await getCachedEquipment();

  // Check if plate with this weight already exists
  const existingPlate = config.plates.find(p => p.weight === weight);
  if (existingPlate) {
    // Just increase count
    existingPlate.count += asPair ? 2 : 1;
    await cacheEquipment(config);
    return { success: true };
  }

  // Add new plate with temporary ID
  const newPlate: Plate = {
    id: `temp_${Date.now()}`,
    weight,
    count: asPair ? 2 : 1,
  };
  config.plates.push(newPlate);
  // Sort plates by weight
  config.plates.sort((a, b) => a.weight - b.weight);
  await cacheEquipment(config);

  // Sync to server if authenticated
  if (accessToken && API_URL) {
    try {
      const response = await fetch(`${API_URL}/api/equipment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ type: 'plate', weight, count: asPair ? 2 : 1 }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update cache with server-generated ID
        const updatedConfig = await getCachedEquipment();
        const idx = updatedConfig.plates.findIndex(p => p.id === newPlate.id);
        if (idx !== -1) {
          updatedConfig.plates[idx] = data.item;
          await cacheEquipment(updatedConfig);
        }
      }
    } catch (err) {
      console.error('Failed to sync plate to server:', err);
    }
  }

  return { success: true };
}

// Remove plate
export async function removePlate(
  accessToken: string | null,
  plateId: string
): Promise<boolean> {
  const config = await getCachedEquipment();
  config.plates = config.plates.filter(p => p.id !== plateId);
  await cacheEquipment(config);

  // Sync to server if authenticated and not a temp ID
  if (accessToken && API_URL && !plateId.startsWith('temp_')) {
    try {
      await fetch(`${API_URL}/api/equipment?id=${plateId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (err) {
      console.error('Failed to remove plate from server:', err);
    }
  }

  return true;
}

// Update plate count
export async function updatePlateCount(
  accessToken: string | null,
  plateId: string,
  count: number
): Promise<boolean> {
  const config = await getCachedEquipment();
  const plate = config.plates.find(p => p.id === plateId);

  if (!plate) return false;

  plate.count = Math.max(0, count);
  await cacheEquipment(config);

  // Sync to server if authenticated and not a temp ID
  if (accessToken && API_URL && !plateId.startsWith('temp_')) {
    try {
      await fetch(`${API_URL}/api/equipment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id: plateId, count }),
      });
    } catch (err) {
      console.error('Failed to update plate count on server:', err);
    }
  }

  return true;
}

// Set selected barbell (local only)
export async function setSelectedBarbell(barbellId: string): Promise<void> {
  const config = await getCachedEquipment();
  config.selectedBarbellId = barbellId;
  await cacheEquipment(config);
}

// Fetch equipment from server and update cache
export async function fetchEquipment(
  accessToken: string
): Promise<EquipmentConfig> {
  if (!API_URL) {
    return getCachedEquipment();
  }

  try {
    const response = await fetch(`${API_URL}/api/equipment`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const config: EquipmentConfig = {
        barbells: data.barbells || DEFAULT_BARBELLS,
        plates: data.plates || DEFAULT_PLATES,
        selectedBarbellId: data.selectedBarbellId || 'olympic-mens',
      };
      await cacheEquipment(config);
      return config;
    }
  } catch (err) {
    console.error('Failed to fetch equipment:', err);
  }

  // Fallback to cache if fetch fails
  return getCachedEquipment();
}

// Calculate plates for target weight (pure function)
export function calculatePlates(
  targetWeight: number,
  barbellWeight: number,
  availablePlates: Plate[]
): PlateResult {
  const weightPerSide = (targetWeight - barbellWeight) / 2;

  if (weightPerSide < 0) {
    return { perSide: [], achievedWeight: barbellWeight, remainder: 0 };
  }

  // Sort plates by weight descending (greedy algorithm)
  const sortedPlates = [...availablePlates].sort((a, b) => b.weight - a.weight);

  const perSide: { weight: number; count: number }[] = [];
  let remaining = weightPerSide;

  for (const plate of sortedPlates) {
    const maxPerSide = Math.floor(plate.count / 2); // count is total plates, divide for per-side
    const neededCount = Math.min(
      Math.floor(remaining / plate.weight),
      maxPerSide
    );
    if (neededCount > 0) {
      perSide.push({ weight: plate.weight, count: neededCount });
      remaining -= plate.weight * neededCount;
    }
  }

  const achievedWeight = barbellWeight + (weightPerSide - remaining) * 2;
  return { perSide, achievedWeight, remainder: remaining * 2 };
}

// Format plate result as string (e.g., "45, 45, 25 on each side")
export function formatPlateResult(result: PlateResult): string {
  if (result.perSide.length === 0) {
    return 'No plates needed';
  }

  const parts: string[] = [];
  for (const item of result.perSide) {
    if (item.count === 1) {
      parts.push(`${item.weight}`);
    } else {
      // Repeat the weight for each plate
      for (let i = 0; i < item.count; i++) {
        parts.push(`${item.weight}`);
      }
    }
  }

  return `${parts.join(', ')} on each side`;
}
