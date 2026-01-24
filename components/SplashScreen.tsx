import React from 'react';
import { Animated, Text, View } from 'react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  // Simple loading animation for dots
  const dotAnimations = React.useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]).current;

  // Simple static splash screen - no animations
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  // Start dot animation
  React.useEffect(() => {
    const animateDots = () => {
      const animations = dotAnimations.map((anim, index) => {
        return Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.loop(Animated.parallel(animations)).start();
    };

    animateDots();
  }, [dotAnimations]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000', // Always dark
      }}
    >
      {/* Simple circular logo */}
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: '#60A5FA',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          shadowColor: '#60A5FA',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 16,
        }}
      >
        <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#fff' }}>
          R
        </Text>
      </View>

      {/* App name */}
      <Text
        style={{
          color: '#fff',
          fontSize: 32,
          fontWeight: 'bold',
          marginBottom: 8,
        }}
      >
        Rhythm
      </Text>

      {/* Tagline */}
      <Text
        style={{
          color: '#e5e5e5',
          fontSize: 18,
        }}
      >
        AI Workout Tracker & Coach
      </Text>

      {/* Animated loading dots */}
      <View style={{ marginTop: 32, flexDirection: 'row', gap: 8 }}>
        {[0, 1, 2].map(index => (
          <Animated.View
            key={index}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#fff',
              marginHorizontal: 4,
              opacity: dotAnimations[index],
            }}
          />
        ))}
      </View>
    </View>
  );
}
