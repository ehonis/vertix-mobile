import { Children, cloneElement, isValidElement } from 'react';
import { FlatList, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/utils/cn';

type SafeAreaEdge = 'top' | 'bottom' | 'left' | 'right';

interface SafeScreenProps {
  children: React.ReactNode;
  /** Which edges to apply safe area insets. Default: ['top'] for tab screens. Use ['top','bottom'] for modals/full-screen stack screens. */
  edges?: SafeAreaEdge[];
  className?: string;
}

const isScrollComponent = (child: React.ReactElement): boolean =>
  isValidElement(child) && (child.type === ScrollView || child.type === FlatList);

/**
 * Wraps screen content with safe area. When the direct child is a ScrollView or FlatList,
 * applies safe area via contentInset (iOS) and contentContainerStyle padding (Android)
 * so scroll content does not go behind the Dynamic Island or notches. Otherwise uses
 * padding on the wrapper. Use as the root container for every tab, modal, and full-screen
 * stack screen.
 *
 * @example
 * // Tab screen (top only - tab bar handles bottom)
 * <SafeScreen>
 *   <ScrollView>...</ScrollView>
 * </SafeScreen>
 *
 * @example
 * // Modal or route-manager (top + bottom)
 * <SafeScreen edges={['top', 'bottom']}>
 *   ...
 * </SafeScreen>
 */
export default function SafeScreen({
  children,
  edges = ['top'],
  className,
}: SafeScreenProps) {
  const insets = useSafeAreaInsets();

  const top = edges.includes('top') ? insets.top : 0;
  const bottom = edges.includes('bottom') ? insets.bottom : 0;
  const left = edges.includes('left') ? insets.left : 0;
  const right = edges.includes('right') ? insets.right : 0;

  const childArray = Children.toArray(children);
  const singleChild = childArray.length === 1 && isValidElement(childArray[0]) ? childArray[0] : null;

  if (singleChild && isScrollComponent(singleChild)) {
    const existingContentStyle = (singleChild.props as { contentContainerStyle?: object }).contentContainerStyle;
    const safeAreaPadding = { paddingTop: top, paddingBottom: bottom, paddingLeft: left, paddingRight: right };
    const contentContainerStyle =
      Platform.OS === 'android'
        ? [existingContentStyle, safeAreaPadding].filter(Boolean)
        : existingContentStyle;

    return (
      <View className={cn('flex-1', className)}>
        {cloneElement(singleChild, {
          ...singleChild.props,
          ...(Platform.OS === 'ios' && {
            contentInset: { top, left, bottom, right },
            contentInsetAdjustmentBehavior: 'never' as const,
          }),
          ...(contentContainerStyle && { contentContainerStyle }),
        })}
      </View>
    );
  }

  const paddingStyle = {
    paddingTop: top,
    paddingBottom: bottom,
    paddingLeft: left,
    paddingRight: right,
  };

  return (
    <View style={[paddingStyle]} className={cn('flex-1', className)}>
      {children}
    </View>
  );
}
