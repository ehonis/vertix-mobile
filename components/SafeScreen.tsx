import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { cn } from '@/utils/cn';

type SafeAreaEdge = 'top' | 'bottom' | 'left' | 'right';

interface SafeScreenProps {
  children: React.ReactNode;
  /** Which edges to apply safe area insets. Default: ['top'] for tab screens. Use ['top','bottom'] for modals/full-screen stack screens. */
  edges?: SafeAreaEdge[];
  className?: string;
}

/**
 * Wraps screen content with safe area padding. Use as the root container for every
 * tab, modal, and full-screen stack screen so content is not cut off by notches,
 * status bars, or home indicators on any iPhone or Android device.
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

  const paddingStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View style={[paddingStyle]} className={cn('flex-1', className)}>
      {children}
    </View>
  );
}
