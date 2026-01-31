import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { TutorialStep } from './tutorialSteps';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface TargetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
}

interface SpotlightOverlayProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  targetLayout: TargetLayout | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

// Special targetId that means "show full screen dimmed, no spotlight"
const FULL_SCREEN_TARGET_ID = 'full-screen';

const DEFAULT_OVERLAY_OPACITY = 0.75;
const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_BORDER_RADIUS = 12;
const TUTORIAL_ACCENT_COLOR = '#F59E0B'; // Amber/orange - stands out from app's blue

export default function SpotlightOverlay({
  step,
  stepIndex,
  totalSteps,
  targetLayout,
  onNext,
  onBack,
  onSkip,
}: SpotlightOverlayProps) {
  const { colors } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const hasAnimatedIn = useRef(false);

  // Animated values for spotlight position and size
  const spotlightXAnim = useRef(
    new Animated.Value(screenWidth / 2 - 50)
  ).current;
  const spotlightYAnim = useRef(
    new Animated.Value(screenHeight / 2 - 50)
  ).current;
  const spotlightWidthAnim = useRef(new Animated.Value(100)).current;
  const spotlightHeightAnim = useRef(new Animated.Value(100)).current;

  // Animated value for tooltip Y position
  const tooltipYAnim = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);

  // Only animate in on first mount, not between steps
  useEffect(() => {
    if (!hasAnimatedIn.current) {
      hasAnimatedIn.current = true;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);


  // Animate spotlight when targetLayout changes
  useEffect(() => {
    // Skip animations for full-screen mode (no spotlight needed)
    if (step.targetId === FULL_SCREEN_TARGET_ID) return;

    // When no target, shrink to nothing
    const targetX = targetLayout
      ? targetLayout.pageX - SPOTLIGHT_PADDING
      : screenWidth / 2;
    const targetY = targetLayout
      ? targetLayout.pageY - SPOTLIGHT_PADDING
      : screenHeight / 2;
    const targetWidth = targetLayout
      ? targetLayout.width + SPOTLIGHT_PADDING * 2
      : 0;
    const targetHeight = targetLayout
      ? targetLayout.height + SPOTLIGHT_PADDING * 2
      : 0;

    Animated.parallel([
      Animated.spring(spotlightXAnim, {
        toValue: targetX,
        friction: 10,
        tension: 80,
        useNativeDriver: false,
      }),
      Animated.spring(spotlightYAnim, {
        toValue: targetY,
        friction: 10,
        tension: 80,
        useNativeDriver: false,
      }),
      Animated.spring(spotlightWidthAnim, {
        toValue: targetWidth,
        friction: 10,
        tension: 80,
        useNativeDriver: false,
      }),
      Animated.spring(spotlightHeightAnim, {
        toValue: targetHeight,
        friction: 10,
        tension: 80,
        useNativeDriver: false,
      }),
    ]).start();
  }, [
    step.targetId,
    targetLayout,
    screenWidth,
    screenHeight,
    spotlightXAnim,
    spotlightYAnim,
    spotlightWidthAnim,
    spotlightHeightAnim,
  ]);

  // Determine tooltip position
  const getTooltipPosition = (): 'top' | 'bottom' => {
    if (step.tooltipPosition && step.tooltipPosition !== 'auto') {
      return step.tooltipPosition;
    }
    // Auto: place tooltip where there's more space
    if (!targetLayout) return 'bottom';
    const spaceAbove = targetLayout.pageY;
    const spaceBelow =
      screenHeight - (targetLayout.pageY + targetLayout.height);
    return spaceBelow > spaceAbove ? 'bottom' : 'top';
  };

  const tooltipPosition = getTooltipPosition();

  // Calculate target tooltip Y position
  const getTargetTooltipY = (): number => {
    const isFullScreen = step.targetId === FULL_SCREEN_TARGET_ID;

    if (isFullScreen) {
      // Fixed positions for full-screen mode
      return tooltipPosition === 'top' ? 100 : screenHeight - 300;
    }

    // Calculate based on spotlight position
    const spotlightY = targetLayout
      ? targetLayout.pageY - SPOTLIGHT_PADDING
      : screenHeight / 2 - 50;
    const spotlightHeight = targetLayout
      ? targetLayout.height + SPOTLIGHT_PADDING * 2
      : 100;

    if (tooltipPosition === 'bottom') {
      return spotlightY + spotlightHeight + 16;
    } else {
      // For 'top' position, position tooltip above spotlight
      // Estimate tooltip height (~240px based on content: padding, dots, title, description, buttons)
      const estimatedTooltipHeight = 240;
      return Math.max(20, spotlightY - estimatedTooltipHeight - 20);
    }
  };

  // Animate tooltip position when step/target changes
  useEffect(() => {
    const targetTooltipY = getTargetTooltipY();

    if (isFirstRender.current) {
      // Set initial position without animation
      tooltipYAnim.setValue(targetTooltipY);
      isFirstRender.current = false;
      return;
    }

    Animated.spring(tooltipYAnim, {
      toValue: targetTooltipY,
      friction: 10,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [
    step.targetId,
    step.tooltipPosition,
    targetLayout,
    screenHeight,
    tooltipPosition,
  ]);

  const isLastStep = stepIndex === totalSteps - 1;
  const isFullScreen = step.targetId === FULL_SCREEN_TARGET_ID;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback>
        <View style={styles.container}>
          {isFullScreen ? (
            /* Full screen dim overlay (no spotlight cutout) */
            <View style={[StyleSheet.absoluteFill, styles.fullScreenOverlay(step.overlayOpacity ?? DEFAULT_OVERLAY_OPACITY)]} />
          ) : (
            /* SVG Mask for spotlight cutout */
            <Svg
              width={screenWidth}
              height={screenHeight}
              style={StyleSheet.absoluteFill}
            >
              <Defs>
                <Mask id="spotlight-mask">
                  {/* White background = visible overlay */}
                  <Rect
                    x="0"
                    y="0"
                    width={screenWidth}
                    height={screenHeight}
                    fill="white"
                  />
                  {/* Black rectangle = transparent cutout (animated) */}
                  <AnimatedRect
                    x={spotlightXAnim}
                    y={spotlightYAnim}
                    width={spotlightWidthAnim}
                    height={spotlightHeightAnim}
                    rx={SPOTLIGHT_BORDER_RADIUS}
                    fill="black"
                  />
                </Mask>
              </Defs>
              {/* Dark overlay with mask applied */}
              <Rect
                x="0"
                y="0"
                width={screenWidth}
                height={screenHeight}
                fill={`rgba(0,0,0,${step.overlayOpacity ?? DEFAULT_OVERLAY_OPACITY})`}
                mask="url(#spotlight-mask)"
              />
            </Svg>
          )}

          {/* Spotlight border ring (animated) - only show when not full screen */}
          {!isFullScreen && (
            <Animated.View
              style={[
                styles.spotlightRing,
                {
                  left: Animated.subtract(spotlightXAnim, 2),
                  top: Animated.subtract(spotlightYAnim, 2),
                  width: Animated.add(spotlightWidthAnim, 4),
                  height: Animated.add(spotlightHeightAnim, 4),
                  borderRadius: SPOTLIGHT_BORDER_RADIUS + 2,
                  borderColor: TUTORIAL_ACCENT_COLOR,
                },
              ]}
              pointerEvents="none"
            />
          )}

          {/* Tooltip */}
          <Animated.View
            style={[
              styles.tooltip,
              {
                backgroundColor: colors.surface,
                left: 24,
                right: 24,
                top: 0,
                opacity: fadeAnim,
                transform: [{ translateY: tooltipYAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            {/* Step counter - top center */}
            <View style={styles.stepCounter}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor:
                        i === stepIndex ? TUTORIAL_ACCENT_COLOR : colors.border,
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              {step.title}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {step.description}
            </Text>

            {/* Footer: Skip (left) + Back/Next (right) */}
            <View style={styles.footerRow}>
              <TouchableOpacity
                onPress={onSkip}
                hitSlop={14}
                style={styles.skipButton}
                accessibilityRole="button"
                accessibilityLabel="Skip tutorial"
              >
                <Text style={[styles.skipText, { color: colors.textTertiary }]}>
                  Skip tutorial
                </Text>
              </TouchableOpacity>

              <View style={styles.navButtons}>
                {stepIndex > 0 && (
                  <TouchableOpacity
                    onPress={onBack}
                    hitSlop={14}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Previous step"
                  >
                    <Text
                      style={[styles.backText, { color: colors.textSecondary }]}
                    >
                      Back
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onNext}
                  hitSlop={14}
                  style={[
                    styles.nextButton,
                    { backgroundColor: TUTORIAL_ACCENT_COLOR },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isLastStep ? 'Finish tutorial' : 'Next step'
                  }
                >
                  <Text style={styles.nextText}>
                    {isLastStep ? 'Done' : 'Next'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreenOverlay: (opacity: number) => ({
    backgroundColor: `rgba(0,0,0,${opacity})`,
  }),
  spotlightRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  tooltip: {
    position: 'absolute',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  stepCounter: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skipButton: {
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  nextText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
