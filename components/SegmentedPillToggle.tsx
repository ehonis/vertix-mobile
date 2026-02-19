import { cn } from '@/utils/cn';
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export interface SegmentedPillOption {
  value: string;
  label: string;
}

export interface OptionStyle {
  activeBg: string;
  activeBorder: string;
}

interface SegmentedPillToggleProps {
  options: SegmentedPillOption[];
  value: string;
  onChange: (value: string) => void;
  optionStyles: OptionStyle[];
  showInfoIcon?: boolean;
  onSelectedPress?: (value: string) => void;
  className?: string;
  optionClassName?: string;
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        'ml-1.5 w-4 h-4 rounded-full bg-white/30 items-center justify-center',
        className
      )}
    >
      <Text className="text-white font-plus-jakarta-700 text-[10px]">i</Text>
    </View>
  );
}

export default function SegmentedPillToggle({
  options,
  value,
  onChange,
  optionStyles,
  showInfoIcon = false,
  onSelectedPress,
  className,
  optionClassName = 'px-3 py-2',
}: SegmentedPillToggleProps) {
  const [layouts, setLayouts] = useState<{ x: number; width: number; height: number }[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const pillTranslateX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillOpacity = useSharedValue(0);

  useEffect(() => {
    if (layouts.length !== options.length || selectedIndex < 0) return;
    const layout = layouts[selectedIndex];
    pillTranslateX.value = withSpring(layout.x, {
      damping: 40,
      stiffness: 350,
    });
    pillWidth.value = withSpring(layout.width, {
      damping: 40,
      stiffness: 350,
    });
    pillOpacity.value = withSpring(1);
  }, [layouts, selectedIndex, options.length]);

  const handleLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width, height } = e.nativeEvent.layout;
    setLayouts((prev) => {
      const next = [...prev];
      next[index] = { x: x - 2, width, height };
      return next;
    });
  };

  const handlePress = (optionValue: string) => {
    if (optionValue === value) {
      if (showInfoIcon) {
        onSelectedPress?.(optionValue);
      } else {
        const other = options.find((o) => o.value !== value);
        if (other) onChange(other.value);
      }
    } else {
      onChange(optionValue);
    }
  };

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillTranslateX.value }],
    width: pillWidth.value,
    opacity: pillOpacity.value,
  }));

  const rowHeight = layouts[0]?.height ?? 40;
  const currentStyle = selectedIndex >= 0 && optionStyles[selectedIndex] != null
    ? optionStyles[selectedIndex]
    : null;
  const padding = 2; // match p-0.5 (2px) so pill aligns with option content area

  const pillReady = layouts.length === options.length && currentStyle != null;

  return (
    <View className={cn('flex-row self-start rounded-full bg-white/10 p-0.5', className)}>
      {pillReady && (
        <Animated.View
          pointerEvents="none"
          style={[
            pillAnimatedStyle,
            {
              position: 'absolute',
              top: padding,
              left: padding,
              height: rowHeight,
            },
          ]}
          className={cn(
            'rounded-full border',
            currentStyle!.activeBg,
            currentStyle!.activeBorder
          )}
        />
      )}
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            onLayout={handleLayout(index)}
            onPress={() => handlePress(option.value)}
            activeOpacity={0.7}
            className={cn(
              'flex-row items-center justify-center rounded-full border border-transparent',
              optionClassName
            )}
          >
            <Text
              className={cn(
                'font-plus-jakarta-600 text-sm',
                isSelected ? 'text-white' : 'text-gray-400'
              )}
            >
              {option.label}
            </Text>
            {showInfoIcon && isSelected && <InfoIcon className="bg-white/30" />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
