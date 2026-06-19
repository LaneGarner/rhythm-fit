import React from 'react';
import { Animated, View } from 'react-native';
import Logo from './Logo';

export default function SplashScreen() {
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
    </View>
  );
}
