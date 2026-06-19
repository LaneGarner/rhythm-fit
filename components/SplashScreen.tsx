import React from 'react';
import { Animated, View } from 'react-native';
import { Text } from 'react-native';
import Logo from './Logo';

interface SplashScreenProps {
  statusMessage?: string;
  errorMessage?: string | null;
}

export default function SplashScreen({
  statusMessage,
  errorMessage,
}: SplashScreenProps) {
  // Simple loading animation for dots
  const dotAnimations = React.useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]).current;

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
        backgroundColor: '#000',
      }}
    >
      {/* Full logo with text */}
      <Logo width={280} showText={true} color="#FFFFFF" />

      {/* Animated loading dots */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
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

      {(statusMessage || errorMessage) && (
        <View
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 28,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        >
          {statusMessage ? (
            <Text
              style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: errorMessage ? 6 : 0,
              }}
            >
              {statusMessage}
            </Text>
          ) : null}
          {errorMessage ? (
            <Text
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: 12,
                lineHeight: 16,
                textAlign: 'center',
              }}
            >
              {errorMessage}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
