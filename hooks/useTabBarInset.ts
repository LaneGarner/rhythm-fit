import { useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from 'react-native-bottom-tabs';

// Base height of the native iOS tab bar, excluding the safe-area inset.
const TAB_BAR_BASE_HEIGHT = 49;

// Bottom padding so scroll content clears the floating native (Liquid Glass)
// tab bar. Prefers the measured native height from the tab navigator and falls
// back to an estimate so it stays safe if used outside that tree.
export function useTabBarInset(extra = 16) {
  const insets = useSafeAreaInsets();
  const measured = useContext(BottomTabBarHeightContext);
  // The native floating bar's measured height excludes the safe-area gap it
  // floats above, so add insets.bottom in both the measured and fallback cases.
  const base = measured ?? TAB_BAR_BASE_HEIGHT;
  return base + insets.bottom + extra;
}
