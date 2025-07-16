# Enhanced Splash Screen

## Overview

This document provides detailed instructions for enhancing the splash screen with a pure black background in dark mode, configurable app name, pulsing heartbeat animation, smooth transitions, and accessibility features.

## Requirements

- Pure black background in dark mode
- Configurable app name (pull from constants)
- Particle burst animation (particles explode outward then converge)
- Smooth transitions
- Accessibility features
- Native iOS-style design

## Implementation Steps

### Step 1: Create App Configuration

Create a new file `config/app.ts`:

```tsx
export const APP_CONFIG = {
  name: 'Rhythm',
  tagline: 'Your AI Fitness Coach',
  version: '1.0.0',
} as const;

export type AppConfig = typeof APP_CONFIG;
```

### Step 2: Update Splash Screen Component

Modify `components/SplashScreen.tsx`:

```tsx
import React, { useEffect, useContext } from 'react';
import { View, Text, Animated } from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';
import { APP_CONFIG } from '../config/app';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  // Animation values
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const logoScaleAnim = new Animated.Value(0.5);
  const logoRotateAnim = new Animated.Value(0);

  // Particle animation values
  const particleAnimations = Array.from({ length: 12 }, () => ({
    scale: new Animated.Value(0),
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    opacity: new Animated.Value(0),
  }));

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Start particle burst animation after initial load
    setTimeout(() => {
      startParticleBurstAnimation();
    }, 1000);

    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const startParticleBurstAnimation = () => {
    // Create particle burst effect
    const particleAnimations = particleAnimations.map((particle, index) => {
      const angle = (index / 12) * 2 * Math.PI;
      const distance = 80 + Math.random() * 40; // Random distance between 80-120
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;

      return Animated.sequence([
        // Explode outward
        Animated.parallel([
          Animated.timing(particle.scale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateX, {
            toValue: targetX,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateY, {
            toValue: targetY,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        // Hold at max distance
        Animated.delay(400),
        // Converge back to center
        Animated.parallel([
          Animated.timing(particle.scale, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateX, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    // Start all particle animations
    Animated.parallel(particleAnimations).start();

    // Subtle logo rotation
    Animated.loop(
      Animated.timing(logoRotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  };

  const logoRotation = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      className={`flex-1 items-center justify-center ${
        isDark ? 'bg-black' : 'bg-white'
      }`}
      accessible={true}
      accessibilityLabel="Splash screen loading"
      accessibilityRole="image"
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
        className="items-center"
      >
        {/* Animated Logo with Particles */}
        <Animated.View
          style={{
            transform: [{ scale: logoScaleAnim }, { rotate: logoRotation }],
          }}
          className="mb-6"
        >
          <View className="relative">
            {/* Particle burst effect */}
            {particleAnimations.map((particle, index) => (
              <Animated.View
                key={index}
                style={{
                  position: 'absolute',
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isDark ? '#3B82F6' : '#2563EB',
                  transform: [
                    { scale: particle.scale },
                    { translateX: particle.translateX },
                    { translateY: particle.translateY },
                  ],
                  opacity: particle.opacity,
                }}
              />
            ))}

            {/* Main logo */}
            <View className="w-24 h-24 rounded-3xl bg-blue-500 items-center justify-center">
              <Text className="text-4xl font-bold text-white">R</Text>
            </View>
          </View>
        </Animated.View>

        {/* App Name */}
        <Text
          className={`text-3xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
          accessible={true}
          accessibilityLabel={`${APP_CONFIG.name} app name`}
        >
          {APP_CONFIG.name}
        </Text>

        {/* Tagline */}
        <Text
          className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
          accessible={true}
          accessibilityLabel={`${APP_CONFIG.tagline} tagline`}
        >
          {APP_CONFIG.tagline}
        </Text>

        {/* Loading indicator */}
        <View className="mt-8 flex-row space-x-1">
          {[0, 1, 2].map(index => (
            <Animated.View
              key={index}
              style={{
                transform: [
                  {
                    scale: logoScaleAnim.interpolate({
                      inputRange: [0.5, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                ],
                opacity: logoScaleAnim.interpolate({
                  inputRange: [0.5, 1],
                  outputRange: [0.4, 1],
                }),
              }}
              className={`w-2 h-2 rounded-full ${
                isDark ? 'bg-gray-400' : 'bg-gray-600'
              }`}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
```

### Step 3: Update Constants

Modify `constants/index.ts` to use the config:

```tsx
import { APP_CONFIG } from '../config/app';

export const ACTIVITY_EMOJIS = {
  'weight-training': '🏋️',
  calisthenics: '💪',
  cardio: '🏃',
  mobility: '🧘',
  recovery: '🛌',
  sports: '⚽',
  other: '🎯',
} as const;

export const ACTIVITY_TYPES = [
  { value: 'weight-training', label: 'Weight Training', emoji: '🏋️' },
  { value: 'calisthenics', label: 'Calisthenics', emoji: '💪' },
  { value: 'cardio', label: 'Cardio', emoji: '🏃' },
  { value: 'mobility', label: 'Mobility', emoji: '🧘' },
  { value: 'recovery', label: 'Recovery', emoji: '🛌' },
  { value: 'sports', label: 'Sports', emoji: '⚽' },
  { value: 'other', label: 'Other', emoji: '🎯' },
] as const;

// Export app config for use throughout the app
export { APP_CONFIG };

// ... rest of existing constants
```

### Step 4: Update App.tsx

Ensure the splash screen uses the new config:

```tsx
// In App.tsx, the splash screen will automatically use the config
// No changes needed as it's imported in the SplashScreen component
```

### Step 5: Add Loading Context (Optional Enhancement)

Create `contexts/LoadingContext.tsx` for better state management:

```tsx
import React, { createContext, useContext, useState } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingMessage?: string;
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState<string>();

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        setIsLoading,
        loadingMessage,
        setLoadingMessage,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};
```

## Key Features

1. **Pure Black Background**: Uses `bg-black` in dark mode instead of `bg-gray-900`
2. **Configurable App Name**: Pulls from `APP_CONFIG.name` in a dedicated config file
3. **Pulsing Heartbeat Animation**: Multi-layered animation with outer ring, main logo, and inner pulse
4. **Smooth Transitions**: Enhanced fade and scale animations with proper timing
5. **Accessibility**: Proper accessibility labels and roles for screen readers
6. **Loading Indicator**: Subtle animated dots to show loading progress
7. **Logo Rotation**: Gentle rotation effect on the logo
8. **Responsive Design**: Works on all device sizes

## Animation Details

- **Initial Load**: Fade in with scale and logo spring animations
- **Heartbeat Effect**: Pulsing animation that mimics a heartbeat rhythm
- **Loading Dots**: Three dots that pulse in sequence
- **Logo Rotation**: Continuous gentle rotation
- **Exit Animation**: Smooth fade out before transitioning to main app

## Testing Checklist

- [ ] Pure black background in dark mode
- [ ] Smooth animations on all devices
- [ ] Accessibility features work with screen readers
- [ ] Configurable app name updates correctly
- [ ] Animations are performant (60fps)
- [ ] Proper cleanup of animation timers
- [ ] Works on different screen sizes
- [ ] Loading state management works correctly

## Development Guidelines

- Use TypeScript with proper typing
- Implement proper error handling and loading states
- Follow React Native best practices
- Ensure accessibility features are included
- Test on both light and dark themes
- Use consistent naming conventions
- Include proper state management patterns
- Add proper navigation handling where applicable
- Use Tailwind styling with native iOS look
- Create reusable components when possible
- Check for existing similar components and extract reusable ones
- Retain exact styling and functionality when refactoring
- Include detailed instructions with code examples
- Follow existing patterns in the codebase
