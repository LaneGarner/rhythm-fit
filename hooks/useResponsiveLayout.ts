import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLandscape = width > height;
  const isTablet = Math.min(width, height) >= 600;

  return {
    width,
    height,
    isLandscape,
    isTablet,
    insets,
  };
}
