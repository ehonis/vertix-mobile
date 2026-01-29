import { useXp, XpGain } from '@/contexts/XpContext';
import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const DISMISS_THRESHOLD = -60;

// Get accent colors based on level
const getLevelAccentColors = (level: number) => {
  if (level >= 50)
    return {
      border: 'border-red-400/30',
      text: '#f87171',
      progressEnd: '#f87171',
      xpGained: '#4ade80',
    };
  if (level >= 30)
    return {
      border: 'border-yellow-400/30',
      text: '#fde047',
      progressEnd: '#facc15',
      xpGained: '#4ade80',
    };
  if (level >= 20)
    return {
      border: 'border-orange-400/30',
      text: '#fdba74',
      progressEnd: '#fb923c',
      xpGained: '#4ade80',
    };
  if (level >= 10)
    return {
      border: 'border-green-400/30',
      text: '#86efac',
      progressEnd: '#4ade80',
      xpGained: '#4ade80',
    };
  return {
    border: 'border-blue-400/30',
    text: '#93c5fd',
    progressEnd: '#60a5fa',
    xpGained: '#4ade80',
  };
};

interface XpLevelBarProps {
  xpData: XpGain;
  onComplete?: () => void;
}

export default function XpLevelBar({ xpData, onComplete }: XpLevelBarProps) {
  const { getXpForLevel, isExpanded, setIsExpanded, restartAutoHide } = useXp();

  const [currentLevel, setCurrentLevel] = useState(xpData.currentLevel);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animated values
  const translateY = useSharedValue(-120);
  const gestureY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const levelScale = useSharedValue(1);
  const expandHeight = useSharedValue(0);
  const chevronRotation = useSharedValue(0);

  const accentColors = getLevelAccentColors(currentLevel);

  // Handlers - defined before gestures
  const dismissNotification = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  const toggleExpand = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (!newExpanded) {
      restartAutoHide();
    }
  }, [isExpanded, setIsExpanded, restartAutoHide]);

  const handleClose = useCallback(() => {
    gestureY.value = withTiming(-150, {
      duration: 250,
      easing: Easing.in(Easing.cubic),
    });
    opacity.value = withTiming(0, { duration: 250 });
    setTimeout(() => {
      onComplete?.();
    }, 250);
  }, [onComplete, gestureY, opacity]);

  // Pan gesture for swipe to dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow upward swipes (negative Y)
      if (event.translationY < 0) {
        gestureY.value = event.translationY;
      } else {
        // Allow slight downward movement with resistance
        gestureY.value = event.translationY * 0.3;
      }
    })
    .onEnd((event) => {
      if (event.translationY < DISMISS_THRESHOLD) {
        // Swipe up past threshold - dismiss
        gestureY.value = withTiming(-150, {
          duration: 250,
          easing: Easing.in(Easing.cubic),
        });
        opacity.value = withTiming(0, { duration: 250 });
        runOnJS(dismissNotification)();
      } else {
        // Snap back
        gestureY.value = withTiming(0, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  // Tap gesture for expand/collapse
  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(toggleExpand)();
  });

  // Combine gestures - pan takes priority
  const composedGestures = Gesture.Race(panGesture, tapGesture);

  // Entry animation - smooth and relaxed
  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  // Expand/collapse animation
  useEffect(() => {
    expandHeight.value = withTiming(isExpanded ? 1 : 0, {
      duration: 300,
      easing: Easing.inOut(Easing.cubic),
    });
    chevronRotation.value = withTiming(isExpanded ? 180 : 0, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [isExpanded]);

  // Level up animation
  const animateLevelUp = useCallback(
    (fromLevel: number, toLevel: number) => {
      const steps = toLevel - fromLevel;
      const stepDuration = 500;

      let currentStep = 0;

      const animateStep = () => {
        if (currentStep < steps) {
          const newLevel = fromLevel + currentStep + 1;
          setCurrentLevel(newLevel);

          levelScale.value = withSequence(
            withTiming(1.12, { duration: 120, easing: Easing.out(Easing.cubic) }),
            withTiming(1, { duration: 180, easing: Easing.inOut(Easing.cubic) })
          );

          progressWidth.value = 0;
          progressWidth.value = withTiming(100, {
            duration: stepDuration * 0.7,
            easing: Easing.out(Easing.cubic),
          });

          currentStep++;
          setTimeout(animateStep, stepDuration);
        } else {
          setIsAnimating(false);
          const currentLevelXp = getXpForLevel(toLevel);
          const nextLevelXp = getXpForLevel(toLevel + 1);
          const finalProgress =
            ((xpData.currentXp - currentLevelXp) /
              (nextLevelXp - currentLevelXp)) *
            100;
          const clampedProgress = Math.min(100, Math.max(0, finalProgress));
          progressWidth.value = withTiming(clampedProgress, {
            duration: 400,
            easing: Easing.out(Easing.cubic),
          });
        }
      };

      animateStep();
    },
    [getXpForLevel, xpData.currentXp]
  );

  // Initialize
  useEffect(() => {
    const isLevelUp = xpData.newLevel && xpData.newLevel > xpData.currentLevel;

    if (isLevelUp) {
      setIsAnimating(true);
      animateLevelUp(xpData.currentLevel, xpData.newLevel!);
    } else {
      const currentLevelXp = getXpForLevel(xpData.currentLevel);
      const nextLevelXp = getXpForLevel(xpData.currentLevel + 1);
      const progress =
        ((xpData.currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) *
        100;
      const clampedProgress = Math.min(100, Math.max(0, progress));
      progressWidth.value = withTiming(clampedProgress, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
      setCurrentLevel(xpData.currentLevel);
    }
  }, [xpData.currentLevel, xpData.newLevel, xpData.currentXp, getXpForLevel]);

  // Calculate XP to next level
  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const xpToNext = isAnimating
    ? nextLevelXp - currentLevelXp
    : Math.max(0, nextLevelXp - xpData.currentXp);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + gestureY.value }],
    opacity: opacity.value,
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const levelScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: levelScale.value }],
  }));

  const expandedContentStyle = useAnimatedStyle(() => ({
    height: interpolate(expandHeight.value, [0, 1], [0, 140]),
    opacity: expandHeight.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  return (
    <Animated.View
      className="absolute top-16 left-0 right-0 items-center z-50 px-4"
      style={containerStyle}
    >
      <GestureDetector gesture={composedGestures}>
        <Animated.View
          className={`w-full max-w-[340px] bg-slate-900/95 rounded-xl border ${accentColors.border}`}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={handleClose}
            className="absolute top-2 right-2 z-10 p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path
                d="M6 18L18 6M6 6l12 12"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>

          {/* Compact View */}
          <View className="p-3">
            <View className="flex-row items-center gap-3 mb-2">
              {/* Level circle */}
              <View className="w-11 h-11 rounded-full bg-gray-900/80 border-2 border-gray-500 items-center justify-center">
                <Animated.View style={levelScaleStyle}>
                  <Text
                    className="text-xl font-barlow-700"
                    style={{ color: accentColors.text }}
                  >
                    {currentLevel}
                  </Text>
                </Animated.View>
              </View>

              {/* Progress bar */}
              <View className="flex-1">
                <Text className="text-xs text-gray-300 font-barlow text-right mb-1">
                  {xpToNext} XP to next
                </Text>
                <View className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <Animated.View
                    className="h-full rounded-full"
                    style={[
                      progressBarStyle,
                      { backgroundColor: accentColors.progressEnd },
                    ]}
                  />
                </View>
              </View>

              {/* XP gained */}
              <Text
                className="text-sm font-barlow-700"
                style={{ color: accentColors.xpGained }}
              >
                +{xpData.totalXp} XP
              </Text>
            </View>

            {/* Expand indicator */}
            <View className="items-center">
              <Animated.View style={chevronStyle}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 9l-7 7-7-7"
                    stroke="#6b7280"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Animated.View>
            </View>
          </View>

          {/* Expanded View */}
          <Animated.View
            className="border-t border-gray-700 overflow-hidden"
            style={expandedContentStyle}
          >
            <View className="p-3 pt-2">
              {/* XP breakdown */}
              {xpData.xpExtrapolated.length > 0 && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-400 font-barlow mb-2">
                    XP Breakdown:
                  </Text>
                  {xpData.xpExtrapolated.map((item, index) => (
                    <View key={index} className="flex-row justify-between mb-1">
                      <Text className="text-xs text-gray-300 font-barlow">
                        {item.type}:
                      </Text>
                      <Text
                        className="text-xs font-barlow-500"
                        style={{
                          color: item.xp > 0 ? accentColors.xpGained : '#f87171',
                        }}
                      >
                        {item.xp > 0 ? '+' : ''}
                        {item.xp} XP
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Base XP */}
              <View className="mb-3">
                <Text className="text-xs text-gray-400 font-barlow">Base XP:</Text>
                <Text className="text-sm text-gray-300 font-barlow">
                  {xpData.baseXp} XP
                </Text>
              </View>

              {/* Current stats */}
              <Text className="text-xs text-gray-400 font-barlow text-center">
                Total: {xpData.currentXp} XP • Level: {xpData.currentLevel}
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
