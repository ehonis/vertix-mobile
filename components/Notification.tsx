import { useNotification } from '@/contexts/NotificationContext';
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function Notification() {
  const { notification } = useNotification();

  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (notification) {
      // Tight entry animation
      translateY.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      // Exit animation
      translateY.value = withTiming(60, {
        duration: 180,
        easing: Easing.in(Easing.ease),
      });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [notification]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!notification) return null;

  const bgClass =
    notification.color === 'green'
      ? 'bg-green-500/90 border-green-400'
      : 'bg-red-500/90 border-red-400';

  return (
    <Animated.View
      className={`absolute bottom-4 left-4 w-72 max-h-16 rounded-md border px-3 py-2 z-50 ${bgClass}`}
      style={animatedStyle}
    >
      <Text className="text-white font-plus-jakarta-700 text-sm flex-1">
        {notification.message}
      </Text>
    </Animated.View>
  );
}
