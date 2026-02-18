import { useAuth } from '@/contexts/AuthContext';
import { useXp } from '@/contexts/XpContext';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import {
    calculateCompletionXpForRoute,
    getGradeMapping,
    isGradeHigher
} from '@/utils/routes';
import React, { useCallback, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    GestureResponderEvent,
    LayoutChangeEvent,
    Platform,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';

// Optional expo-haptics import with fallback
let Haptics: typeof import('expo-haptics') | null = null;
try {
    Haptics = require('expo-haptics');
} catch {
    // expo-haptics not installed, will use Vibration fallback
}

// Haptic intensity levels: light -> medium -> heavy -> success
type HapticIntensity = 'light' | 'medium' | 'heavy' | 'success';

// Helper function for haptic feedback with fallback and intensity support
const triggerHaptic = async (intensity: HapticIntensity): Promise<void> => {
    try {
        if (Haptics) {
            switch (intensity) {
                case 'light':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    break;
                case 'medium':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    break;
                case 'heavy':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    break;
                case 'success':
                    await Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success
                    );
                    break;
            }
        } else if (Platform.OS !== 'web') {
            // Fallback to Vibration API with increasing duration
            const vibrationDurations: Record<HapticIntensity, number | number[]> = {
                light: 5,
                medium: 15,
                heavy: 25,
                success: [0, 50, 30, 50],
            };
            Vibration.vibrate(vibrationDurations[intensity]);
        }
    } catch {
        // Haptic feedback failed silently
    }
};

interface RouteCompletion {
    id: number;
    userId: string;
    routeId: string;
    completionDate: string;
    xpEarned: number;
    flash: boolean;
}

interface Route {
    id: string;
    title: string;
    color: string;
    grade: string;
    type: string;
    location: string;
    completed: boolean;
    setDate: string;
    completions: RouteCompletion[];
    bonusXp?: number | null;
    isArchive?: boolean;
}

interface LongPressRouteCardProps {
    route: Route;
    onPress: () => void;
    onQuickComplete?: () => void;
    xpDisplay: React.ReactNode;
}

// Threshold before animation starts (ms) - taps shorter than this won't show animation
const LONG_PRESS_THRESHOLD = 200;
// Duration for the fill animation after threshold is reached (ms)
const FILL_ANIMATION_DURATION = 800;
// Interval for haptic feedback during fill (ms)
const HAPTIC_INTERVAL = 100;
// Distance threshold to detect scrolling (pixels) - if finger moves more than this, it's a scroll
const SCROLL_THRESHOLD = 10;

export default function LongPressRouteCard({
    route,
    onPress,
    onQuickComplete,
    xpDisplay,
}: LongPressRouteCardProps) {
    const { user } = useAuth();
    const { gainXp } = useXp();
    const [isLongPressing, setIsLongPressing] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [showSuccessCheck, setShowSuccessCheck] = useState(false);
    const [cardWidth, setCardWidth] = useState(0);

    const fillProgress = useRef(new Animated.Value(0)).current;
    const thresholdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const animationRef = useRef<Animated.CompositeAnimation | null>(null);
    const startTimeRef = useRef<number>(0);
    const hasCompletedRef = useRef(false);
    const isAnimatingRef = useRef(false);
    // Scroll detection refs
    const startPositionRef = useRef<{ x: number; y: number } | null>(null);
    const isScrollingRef = useRef(false);

    // Success checkmark animation values
    const checkScale = useRef(new Animated.Value(0)).current;
    const checkRotation = useRef(new Animated.Value(0)).current;
    const checkOpacity = useRef(new Animated.Value(0)).current;

    const getColorStyles = (color: string) => {
        const colorMap: Record<
            string,
            { bg: string; border: string; fill: string; gradientStart: string; gradientEnd: string }
        > = {
            green: {
                bg: 'bg-green-400/25',
                border: 'border-green-400',
                fill: 'rgba(74, 222, 128, 0.6)',
                gradientStart: '#16a34a', // green-600
                gradientEnd: '#065f46', // green-800
            },
            red: {
                bg: 'bg-red-400/25',
                border: 'border-red-400',
                fill: 'rgba(248, 113, 113, 0.6)',
                gradientStart: '#dc2626', // red-600
                gradientEnd: '#991b1b', // red-800
            },
            blue: {
                bg: 'bg-blue-400/25',
                border: 'border-blue-400',
                fill: 'rgba(96, 165, 250, 0.6)',
                gradientStart: '#2563eb', // blue-600
                gradientEnd: '#1e40af', // blue-800
            },
            yellow: {
                bg: 'bg-yellow-400/25',
                border: 'border-yellow-400',
                fill: 'rgba(250, 204, 21, 0.6)',
                gradientStart: '#ca8a04', // yellow-600
                gradientEnd: '#854d0e', // yellow-800
            },
            purple: {
                bg: 'bg-purple-400/25',
                border: 'border-purple-400',
                fill: 'rgba(192, 132, 252, 0.6)',
                gradientStart: '#9333ea', // purple-600
                gradientEnd: '#6b21a8', // purple-800
            },
            orange: {
                bg: 'bg-orange-400/25',
                border: 'border-orange-400',
                fill: 'rgba(251, 146, 60, 0.6)',
                gradientStart: '#ea580c', // orange-600
                gradientEnd: '#9a3412', // orange-800
            },
            white: {
                bg: 'bg-white/35',
                border: 'border-white',
                fill: 'rgba(255, 255, 255, 0.6)',
                gradientStart: '#e5e7eb', // gray-200
                gradientEnd: '#4b5563', // gray-600
            },
            black: {
                bg: 'bg-slate-900/25',
                border: 'border-white',
                fill: 'rgba(100, 116, 139, 0.6)',
                gradientStart: '#1e293b', // slate-800
                gradientEnd: '#0f172a', // slate-900
            },
            pink: {
                bg: 'bg-pink-400/25',
                border: 'border-pink-400',
                fill: 'rgba(244, 114, 182, 0.6)',
                gradientStart: '#db2777', // pink-600
                gradientEnd: '#9f1239', // pink-800 (deep plum)
            },
        };

        return (
            colorMap[color.toLowerCase()] || {
                bg: 'bg-slate-800',
                border: 'border-slate-700',
                fill: 'rgba(100, 116, 139, 0.6)',
                gradientStart: '#334155', // slate-700
                gradientEnd: '#1e293b', // slate-800
            }
        );
    };

    const styles = getColorStyles(route.color);

    const handleLayout = (event: LayoutChangeEvent) => {
        setCardWidth(event.nativeEvent.layout.width);
    };

    // Play success checkmark animation
    const playSuccessAnimation = useCallback(() => {
        // Reset animation values
        checkScale.setValue(0);
        checkRotation.setValue(0);
        checkOpacity.setValue(1);
        setShowSuccessCheck(true);

        // Reset fill progress back to 0 (return to original background)
        Animated.timing(fillProgress, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start();

        // Animate checkmark: scale up with rotation
        Animated.parallel([
            Animated.spring(checkScale, {
                toValue: 1,
                tension: 200,
                friction: 12,
                useNativeDriver: true,
            }),
            Animated.timing(checkRotation, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: true,
            }),
        ]).start();

        // Fade out after 2 seconds
        setTimeout(() => {
            Animated.timing(checkOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start(() => {
                setShowSuccessCheck(false);
            });
        }, 2000);
    }, [checkScale, checkRotation, checkOpacity, fillProgress]);

    const completeRouteAsFlash = useCallback(async () => {
        if (!user || isCompleting || hasCompletedRef.current) return;

        hasCompletedRef.current = true;
        setIsCompleting(true);
        setIsLongPressing(false);

        try {
            // Trigger success haptic
            await triggerHaptic('success');

            // Play success animation immediately
            playSuccessAnimation();

            // Complete the route as a flash for today
            await api.completeRoute({
                userId: user.id,
                routeId: route.id,
                flash: true,
                date: new Date().toISOString(),
            });

            // Calculate and show XP notification if not archived
            if (!route.isArchive) {
                const previousCompletions = route.completions?.length || 0;
                const routeType =
                    route.type.toLowerCase() === 'rope' ? 'rope' : 'boulder';
                const userHighestGrade =
                    routeType === 'rope'
                        ? user.highestRopeGrade
                        : user.highestBoulderGrade;
                const newHighestGrade = isGradeHigher(
                    userHighestGrade,
                    route.grade,
                    routeType
                );

                const xpData = calculateCompletionXpForRoute({
                    grade: route.grade,
                    previousCompletions,
                    newHighestGrade,
                    bonusXp: route.bonusXp || 0,
                });

                if (xpData.xp > 0) {
                    gainXp({
                        totalXp: xpData.xp,
                        baseXp: xpData.baseXp,
                        xpExtrapolated: xpData.xpExtrapolated,
                    });
                }
            }

            // Callback to update parent state
            onQuickComplete?.();
        } catch (error) {
            console.error('Error completing route:', error);
            // Reset on error so user can try again
            hasCompletedRef.current = false;
        } finally {
            setIsCompleting(false);
        }
    }, [user, route, gainXp, onQuickComplete, isCompleting, playSuccessAnimation]);

    // Start gradual haptic feedback that builds up over time
    const startGradualHaptics = useCallback(() => {
        let hapticCount = 0;
        const totalHaptics = Math.floor(FILL_ANIMATION_DURATION / HAPTIC_INTERVAL);

        // Initial light haptic when animation starts
        triggerHaptic('light');

        hapticIntervalRef.current = setInterval(() => {
            hapticCount++;
            const progress = hapticCount / totalHaptics;

            // Gradually increase intensity based on progress
            if (progress < 0.33) {
                triggerHaptic('light');
            } else if (progress < 0.66) {
                triggerHaptic('medium');
            } else {
                triggerHaptic('heavy');
            }

            // Stop interval if we've reached the end
            if (hapticCount >= totalHaptics) {
                if (hapticIntervalRef.current) {
                    clearInterval(hapticIntervalRef.current);
                    hapticIntervalRef.current = null;
                }
            }
        }, HAPTIC_INTERVAL);
    }, []);

    const stopGradualHaptics = useCallback(() => {
        if (hapticIntervalRef.current) {
            clearInterval(hapticIntervalRef.current);
            hapticIntervalRef.current = null;
        }
    }, []);

    // Start the fill animation (called after threshold is reached)
    const startFillAnimation = useCallback(() => {
        if (!user || isCompleting || hasCompletedRef.current) return;

        isAnimatingRef.current = true;
        setIsLongPressing(true);

        // Start gradual haptic feedback
        startGradualHaptics();

        // Animate the fill progress - starts slow, ends fast (ease-in curve)
        animationRef.current = Animated.timing(fillProgress, {
            toValue: 1,
            duration: FILL_ANIMATION_DURATION,
            easing: Easing.in(Easing.quad), // Accelerating curve: slow start, fast finish
            useNativeDriver: false,
        });

        animationRef.current.start(({ finished }) => {
            if (finished && !hasCompletedRef.current) {
                stopGradualHaptics();
                completeRouteAsFlash();
            }
        });

        // Backup timer in case animation doesn't complete properly
        completionTimer.current = setTimeout(() => {
            if (!hasCompletedRef.current) {
                stopGradualHaptics();
                completeRouteAsFlash();
            }
        }, FILL_ANIMATION_DURATION + 50);
    }, [
        user,
        fillProgress,
        completeRouteAsFlash,
        isCompleting,
        startGradualHaptics,
        stopGradualHaptics,
    ]);

    const startLongPress = useCallback(() => {
        if (!user || isCompleting || hasCompletedRef.current) return;

        startTimeRef.current = Date.now();
        fillProgress.setValue(0);
        isAnimatingRef.current = false;

        // Wait for threshold before starting animation
        thresholdTimer.current = setTimeout(() => {
            startFillAnimation();
        }, LONG_PRESS_THRESHOLD);
    }, [user, fillProgress, startFillAnimation, isCompleting]);

    const cancelLongPress = useCallback(() => {
        // Clear threshold timer
        if (thresholdTimer.current) {
            clearTimeout(thresholdTimer.current);
            thresholdTimer.current = null;
        }

        // Clear completion timer
        if (completionTimer.current) {
            clearTimeout(completionTimer.current);
            completionTimer.current = null;
        }

        // Stop haptic feedback
        stopGradualHaptics();

        // Stop animation
        if (animationRef.current) {
            animationRef.current.stop();
            animationRef.current = null;
        }

        // Only animate back to 0 if we were actually animating
        if (isAnimatingRef.current && !hasCompletedRef.current) {
            Animated.timing(fillProgress, {
                toValue: 0,
                duration: 150,
                useNativeDriver: false,
            }).start();
        }

        isAnimatingRef.current = false;
        setIsLongPressing(false);
    }, [fillProgress, stopGradualHaptics]);

    const handlePressIn = useCallback(
        (event: GestureResponderEvent) => {
            // Record initial touch position for scroll detection
            const { pageX, pageY } = event.nativeEvent;
            startPositionRef.current = { x: pageX, y: pageY };
            isScrollingRef.current = false;
            hasCompletedRef.current = false;
            startLongPress();
        },
        [startLongPress]
    );

    const handleTouchMove = useCallback(
        (event: GestureResponderEvent) => {
            // If already marked as scrolling, no need to check again
            if (isScrollingRef.current) return;

            // If no start position recorded, ignore
            if (!startPositionRef.current) return;

            const { pageX, pageY } = event.nativeEvent;
            const deltaX = Math.abs(pageX - startPositionRef.current.x);
            const deltaY = Math.abs(pageY - startPositionRef.current.y);

            // If finger moved more than threshold, treat as scroll
            if (deltaX > SCROLL_THRESHOLD || deltaY > SCROLL_THRESHOLD) {
                isScrollingRef.current = true;
                cancelLongPress();
            }
        },
        [cancelLongPress]
    );

    const handlePressOut = useCallback(() => {
        // If user was scrolling, don't trigger any action
        if (isScrollingRef.current) {
            cancelLongPress();
            startPositionRef.current = null;
            return;
        }

        // If animation started but didn't complete, cancel it
        // Button only handles flash completion, not menu opening
        if (!hasCompletedRef.current) {
            cancelLongPress();
        }

        startPositionRef.current = null;
    }, [cancelLongPress]);

    // Calculate animated width for the fill (for button)
    const animatedWidth = fillProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, cardWidth],
    });



    return (
        <View className="flex flex-1  justify-between gap-3">
            {/* Route Card - Opens menu on press */}
            <View className="relative flex flex-1">
                {/* XP and completion badge - outside the clipped card */}
                {user && (
                    <View className="flex-row gap-1 items-center absolute -top-3 -right-3 z-20">
                        {xpDisplay}
                        {route.completed && (
                            <View className="bg-black border border-green-400 rounded-full p-4 py-2 flex items-center justify-center">
                                <Text className="text-green-400 text-3xl font-plus-jakarta-700">✓</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Card - simple press opens menu */}
                <TouchableOpacity
                    onPress={onPress}
                    activeOpacity={0.7}
                    className="flex-1"
                >
                    <View
                        className={cn(
                            'rounded-lg border-2 h-full w-full relative',
                            styles.border,
                            styles.bg,
                        )}
                    >
                        {/* Gradient Background */}
                        {/* <View className="absolute inset-0">
                            <Svg width="100%" height="100%">
                                <Defs>
                                    <LinearGradient id={`routeGradient-${route.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                        <Stop offset="0%" stopColor={styles.gradientStart} stopOpacity="1" />
                                        <Stop offset="100%" stopColor={styles.gradientEnd} stopOpacity="1" />
                                    </LinearGradient>
                                </Defs>
                                <Rect width="100%" height="100%" fill={`url(#routeGradient-${route.id})`} />
                            </Svg>
                        </View> */}

                        {/* Large Grade Background (semi-transparent) */}
                        <View className="absolute inset-0 justify-center items-center">
                            <Text
                                className="text-white font-plus-jakarta-700"
                                style={{
                                    fontSize: 120,
                                    opacity: 0.15,
                                    fontWeight: '700',
                                }}
                            >
                                {getGradeMapping(route.grade)}
                            </Text>
                        </View>

                        {/* Centered Route Content */}
                        <View className="flex-1 justify-center items-center z-10 px-4">
                            <Text
                                className="text-white text-3xl font-plus-jakarta-700 text-center"
                                numberOfLines={2}
                                style={{
                                    textShadowColor: 'rgba(0, 0, 0, 0.75)',
                                    textShadowOffset: { width: 0, height: 2 },
                                    textShadowRadius: 4,
                                }}
                            >
                                {route.title}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Success checkmark animation - overlays entire card */}
                {showSuccessCheck && (
                    <Animated.View
                        className="absolute inset-0 justify-center items-center z-30"
                        style={{
                            opacity: checkOpacity,
                            transform: [
                                { scale: checkScale },
                                {
                                    rotate: checkRotation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['-180deg', '0deg'],
                                    }),
                                },
                            ],
                        }}
                        pointerEvents="none"
                    >
                        <View className="bg-black/90 border-2 border-green-500 rounded-full w-20 h-20 items-center justify-center shadow-lg">
                            <Text className="text-green-500 text-4xl">✓</Text>
                        </View>
                    </Animated.View>
                )}
            </View>

            {/* Hold to Flash Button - Full width at bottom */}
            {user && !route.isArchive && (
                <View
                    className="relative overflow-hidden rounded-lg "
                    onLayout={handleLayout}
                    onTouchStart={handlePressIn}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handlePressOut}
                    onTouchCancel={cancelLongPress}
                >
                    <View
                        className={cn(
                            'border-2 py-4 px-6 items-center justify-center relative overflow-hidden',
                            styles.border,
                            styles.bg
                        )}
                    >
                        {/* Animated fill indicator */}
                        <Animated.View
                            className="absolute left-0 top-0 bottom-0"
                            style={{
                                width: animatedWidth,
                                backgroundColor: styles.fill,
                            }}
                            pointerEvents="none"
                        />

                        {/* Button text */}
                        <Text className="text-white text-lg font-plus-jakarta-700 z-10">
                            {isLongPressing && !isCompleting && !showSuccessCheck
                                ? 'Hold to flash...'
                                : 'Hold to Flash'}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

