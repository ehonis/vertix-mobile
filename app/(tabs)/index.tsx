import LongPressRouteCard from '@/components/LongPressRouteCard';
import RoutePopup from '@/components/RoutePopup';
import SafeScreen from '@/components/SafeScreen';
import TopDown, { Legend, Locations } from '@/components/TopDown';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import {
  calculateCompletionXpForRoute,
  findCommunityGradeForRoute,
  isGradeHigher
} from '@/utils/routes';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Svg, { Line as SvgLine } from 'react-native-svg';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
// Amount of adjacent cards visible for peek animations

interface RouteCompletion {
  id: number;
  userId: string;
  routeId: string;
  completionDate: string;
  xpEarned: number;
  flash: boolean;
}

interface RouteAttempt {
  id: number;
  userId: string;
  routeId: string;
  attemptDate: string;
  attempts: number;
}

interface CommunityGrade {
  id: number;
  userId: string;
  routeId: string;
  grade: string;
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
  attempts?: RouteAttempt[];
  communityGrades?: CommunityGrade[];
  bonusXp?: number | null;
  isArchive?: boolean;
}

export default function TabOneScreen() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [selectedWall, setSelectedWall] = useState<Locations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const [showRoutes, setShowRoutes] = useState(false);

  // Carousel scroll tracking
  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Track if we're currently in a momentum scroll to prevent race conditions
  const isScrollingRef = useRef(false);

  // Map height animation - smooth transition when wall is selected
  const mapHeightAnim = useRef(new Animated.Value(1)).current; // 1 = full height, 0.5 = half height

  // Text position animation - slides from center to start when wall is selected
  const textPositionAnim = useRef(new Animated.Value(0)).current; // 0 = center, 1 = start

  // Route carousel animation - fade in and slide up when routes appear
  const carouselOpacityAnim = useRef(new Animated.Value(0)).current;
  const carouselTranslateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchRoutes();
  }, [user]);

  useEffect(() => {
    // Filter routes based on selected wall
    if (selectedWall) {
      const filtered = allRoutes.filter(
        (route) => route.location === selectedWall
      );
      setRoutes(filtered);
      setShowRoutes(true);

      // Animate map height to 65% (carousel takes 35%)
      Animated.spring(mapHeightAnim, {
        toValue: 0.65,
        useNativeDriver: false,
        tension: 50,
        friction: 10,
      }).start();

      // Animate text position from center to start
      Animated.timing(textPositionAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Animate carousel fade in and slide up (with small delay to ensure routes are rendered)
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(carouselOpacityAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(carouselTranslateYAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, 100);
    } else {
      setShowRoutes(false);
      setRoutes([]);

      // Animate map height back to full
      Animated.spring(mapHeightAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 50,
        friction: 10,
      }).start();

      // Animate text position back to center
      Animated.timing(textPositionAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Reset carousel animation
      carouselOpacityAnim.setValue(0);
      carouselTranslateYAnim.setValue(20);
    }
  }, [selectedWall, allRoutes, mapHeightAnim, textPositionAnim]);

  // Calculate card width for carousel - full width with peek padding for animations
  const PEEK_WIDTH = 40;
  const CARD_WIDTH = SCREEN_WIDTH - (2 * PEEK_WIDTH);
  const CAROUSEL_HEIGHT = SCREEN_HEIGHT * 0.35;

  // Calculate snap offsets accounting for padding
  const snapOffsets = routes.map((_, index) => index * CARD_WIDTH);

  // Reset to first item when routes change
  useEffect(() => {
    if (showRoutes && routes.length > 0 && carouselRef.current) {
      setActiveIndex(0);
      // Reset scroll position to 0 immediately
      scrollX.setValue(0);

      // Wait for carousel animation and FlatList to be ready
      // Use a longer delay to ensure the animation completes and FlatList is fully rendered
      const timeoutId = setTimeout(() => {
        try {
          // Use scrollToOffset to ensure first item is at position 0 (accounting for padding)
          carouselRef.current?.scrollToOffset({
            offset: 0,
            animated: false,
          });
          // Ensure scrollX is still 0 after scroll
          scrollX.setValue(0);
        } catch (error) {
          // Fallback to scrollToIndex if scrollToOffset fails
          try {
            carouselRef.current?.scrollToIndex({
              index: 0,
              animated: false,
            });
            scrollX.setValue(0);
          } catch (e) {
            // Ignore if scroll fails
          }
        }
      }, 450); // Delay to match carousel animation duration (400ms) + small buffer

      return () => clearTimeout(timeoutId);
    }
  }, [showRoutes, routes.length, scrollX]);

  const fetchRoutes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getAllRoutesNonArchive(user?.id);
      const fetchedRoutes = response.data || [];
      setAllRoutes(fetchedRoutes);
      // Don't set routes here - they'll be set when a wall is selected
    } catch (err) {
      console.error('Error fetching routes:', err);
      setError('Failed to load routes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWallSelection = (wall: Locations | null) => {
    setSelectedWall(wall);
  };

  const handleRoutePress = (route: Route) => {
    setSelectedRoute(route);
  };

  //handle route completed
  const handleRouteCompleted = async () => {
    const routeId = selectedRoute?.id;
    if (!routeId) return;

    const tempCompletion: RouteCompletion = {
      id: Date.now(), // Temporary ID
      userId: user?.id || '',
      routeId: routeId,
      completionDate: new Date().toISOString(),
      xpEarned: 0,
      flash: false,
    };

    // Update selectedRoute optimistically
    if (selectedRoute) {
      const updatedRoute = {
        ...selectedRoute,
        completions: [...(selectedRoute.completions || []), tempCompletion],
        completed: true,
      };
      setSelectedRoute(updatedRoute);
    }

    // Update route in allRoutes array immediately (for the checkmark in the list)
    setAllRoutes((prev) =>
      prev.map((route) =>
        route.id === routeId
          ? {
            ...route,
            completions: [...(route.completions || []), tempCompletion],
            completed: true,
          }
          : route
      )
    );

    // Refresh routes silently in background (don't show loading)
    try {
      const response = await api.getAllRoutesNonArchive(user?.id);
      const fetchedRoutes = response.data || [];
      setAllRoutes(fetchedRoutes);

      // Update selectedRoute with fresh data
      const freshRoute = fetchedRoutes.find((r) => r.id === routeId);
      if (freshRoute) {
        setSelectedRoute(freshRoute);
      }
    } catch (err) {
      console.error('Error refreshing routes:', err);
    }
  };

  // Handler for quick complete via long press (flash today)
  const handleQuickComplete = useCallback(
    async (routeId: string) => {
      const tempCompletion: RouteCompletion = {
        id: Date.now(),
        userId: user?.id || '',
        routeId: routeId,
        completionDate: new Date().toISOString(),
        xpEarned: 0,
        flash: true,
      };

      // Update route in allRoutes array immediately
      setAllRoutes((prev) =>
        prev.map((route) =>
          route.id === routeId
            ? {
              ...route,
              completions: [...(route.completions || []), tempCompletion],
              completed: true,
            }
            : route
        )
      );

      // Refresh routes silently in background
      try {
        const response = await api.getAllRoutesNonArchive(user?.id);
        const fetchedRoutes = response.data || [];
        setAllRoutes(fetchedRoutes);
      } catch (err) {
        console.error('Error refreshing routes:', err);
      }
    },
    [user?.id]
  );

  //loading state
  if (isLoading) {
    return (
      <SafeScreen className="bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-white mt-4">Loading routes...</Text>
      </SafeScreen>
    );
  }

  //error state
  if (error) {
    return (
      <SafeScreen className="bg-black justify-center items-center p-6">
        <Text className="text-red-500 text-lg mb-4">{error}</Text>
        <Text className="text-white text-center">Please try again later</Text>
      </SafeScreen>
    );
  }


  // Handle scroll events for carousel
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        // Calculate index accounting for padding
        const index = Math.round(offsetX / CARD_WIDTH);
        // Clamp index to valid range
        const clampedIndex = Math.max(0, Math.min(index, routes.length - 1));
        if (clampedIndex !== activeIndex && clampedIndex >= 0 && clampedIndex < routes.length) {
          setActiveIndex(clampedIndex);
        }
      },
    }
  );

  // Snap to nearest item when scroll ends
  const handleMomentumScrollEnd = (event: any) => {
    // If already scrolling, don't trigger another scroll
    if (isScrollingRef.current) {
      return;
    }

    const offsetX = event.nativeEvent.contentOffset.x;
    // Calculate which card we're closest to
    const index = Math.round(offsetX / CARD_WIDTH);
    const targetIndex = Math.max(0, Math.min(index, routes.length - 1));

    // Only snap if we're not already at the target index
    if (targetIndex === activeIndex) {
      return;
    }

    if (carouselRef.current && routes.length > 0) {
      isScrollingRef.current = true;
      try {
        // Use scrollToOffset to account for padding correctly
        carouselRef.current.scrollToOffset({
          offset: targetIndex * CARD_WIDTH,
          animated: true,
        });
        setActiveIndex(targetIndex);
      } catch (error) {
        // Fallback to scrollToIndex if scrollToOffset fails
        try {
          carouselRef.current.scrollToIndex({
            index: targetIndex,
            animated: true,
          });
          setActiveIndex(targetIndex);
        } catch (e) {
          console.error('Failed to scroll to index:', e);
        }
      }
      // Reset scrolling flag after animation completes
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 300);
    } else {
      setActiveIndex(targetIndex);
    }
  };

  const formatWallName = (wall: Locations) => {
    if (wall === 'ABWall') {
      return 'Auto Belay Wall';
    }
    return wall
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };
  // Render carousel item with peek view styling
  const renderCarouselItem = ({ item: route, index }: { item: Route; index: number }) => {
    // Calculate distance from center
    const inputRange = [
      (index - 1) * CARD_WIDTH,
      index * CARD_WIDTH,
      (index + 1) * CARD_WIDTH,
    ];

    // Calculate opacity based on scroll position
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    // Calculate scale based on scroll position
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });



    // Calculate XP display for the route
    const xpDisplay = user
      ? (() => {
        const previousCompletions = route.completions?.length || 0;
        const routeType = route.type.toLowerCase() === 'rope' ? 'rope' : 'boulder';
        const userHighestGrade =
          routeType === 'rope' ? user.highestRopeGrade : user.highestBoulderGrade;
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
          return (
            <View className="bg-black border border-green-400 rounded-full px-3 py-2">
              <Text className="text-green-400 font-barlow-700 italic text-2xl">
                {xpData.xp}xp
              </Text>
            </View>
          );
        }
        return null;
      })()
      : null;

    return (
      <Animated.View
        className="justify-center"
        style={{
          width: CARD_WIDTH,
          height: CAROUSEL_HEIGHT,
          opacity,
          transform: [{ scale }],
        }}
      >
        <LongPressRouteCard
          route={route}
          onPress={() => handleRoutePress(route)}
          onQuickComplete={() => handleQuickComplete(route.id)}
          xpDisplay={xpDisplay}
        />
      </Animated.View>
    );
  };

  // Calculate animated map height


  // Unified layout with consistent width and animated height
  return (
    <SafeScreen className="flex  py-5 bg-black">

      <Animated.View
        className="justify-start items-center overflow-hidden  px-2"

      >
        {/* Map title - shows wall name when selected, "Gym Map" when not */}


        <View className={cn("bg-slate-900/80 border-2 border-blue-500/50 rounded-lg p-3 items-center overflow-hidden w-full max-w-full")}>
          <View className="flex-row items-center w-full relative">
            <Animated.View
              className="flex-1"
              style={{
                transform: [
                  {
                    translateX: textPositionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -110], // Slide left to make room for button
                    }),
                  },
                ],
                alignItems: 'center',
              }}
            >
              <Text className="text-white text-2xl mb-4 font-barlow-700 text-center">
                {selectedWall ? formatWallName(selectedWall) : 'Gym Map'}
              </Text>
            </Animated.View>

            {/* Zoom out button - appears when wall is selected */}
            {selectedWall && (
              <Animated.View
                className="absolute right-0 -top-1"
                style={{
                  opacity: textPositionAnim,
                  transform: [
                    {
                      scale: textPositionAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  onPress={() => setSelectedWall(null)}
                  className="bg-black/70 border border-gray-500 rounded-full p-2 shadow-lg"
                  style={{ elevation: 5 }}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <SvgLine
                      x1="6"
                      y1="6"
                      x2="18"
                      y2="18"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <SvgLine
                      x1="18"
                      y1="6"
                      x2="6"
                      y2="18"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </Svg>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
          <View className={"w-full items-center overflow-hidden transition-all duration-300 "}>
            <TopDown
              onData={handleWallSelection}
              initialSelection={selectedWall}
            />
          </View>

        </View>

        {/* Helper text when no wall selected - outside blue box */}
        {!selectedWall && (
          <View className="items-center">
            <Text className="text-gray-400 text-sm font-barlow text-center">
              Tap a wall section to view routes
            </Text>
          </View>
        )}

        {/* Legend - outside blue box */}
        {!selectedWall && <Legend showWhenSelected={true} />}
      </Animated.View>

      <View className="px-2 mt-2">
        {/* {selectedWall && (
          <View className="items-center">
            <Text className="text-white text-xl font-barlow-600 mt-3 text-start">
              Routes Sorted Left to Right
            </Text>
          </View>
        )} */}

        {/* Carousel Section - Takes remaining space when wall is selected */}
        {selectedWall && (
          <Animated.View
            className=""
            style={{
              opacity: carouselOpacityAnim,
              transform: [
                {
                  translateY: carouselTranslateYAnim,
                },
              ],
            }}
          >
            {routes.length === 0 && showRoutes ? (
              <View className="items-center justify-center h-full">
                <Text className="text-gray-400 text-lg">
                  No routes found for this wall
                </Text>
                <TouchableOpacity onPress={() => setSelectedWall(null)}>
                  <Text className="text-blue-500 mt-2 underline">
                    Clear filter
                  </Text>
                </TouchableOpacity>
              </View>
            ) : showRoutes && routes.length > 0 ? (
              <FlatList
                ref={carouselRef}
                data={routes}
                renderItem={renderCarouselItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled={false}
                snapToOffsets={snapOffsets}
                snapToAlignment="start"
                decelerationRate={0.9}
                scrollEventThrottle={16}
                onScroll={handleScroll}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                initialScrollIndex={0}
                bounces={false}
                contentContainerStyle={{
                  paddingHorizontal: PEEK_WIDTH,
                  marginTop: 10
                }}
                getItemLayout={(data, index) => ({
                  length: CARD_WIDTH,
                  offset: CARD_WIDTH * index,
                  index,
                })}
              />
            ) : null}
          </Animated.View>
        )}
      </View>

      {/* Route Popup */}
      {selectedRoute &&
        (() => {
          const previousCompletions = selectedRoute.completions?.length || 0;
          const routeType =
            selectedRoute.type.toLowerCase() === 'rope' ? 'rope' : 'boulder';
          const userHighestGrade =
            routeType === 'rope'
              ? user?.highestRopeGrade
              : user?.highestBoulderGrade;
          const newHighestGrade = user
            ? isGradeHigher(userHighestGrade, selectedRoute.grade, routeType)
            : false;

          const xpData =
            user && !selectedRoute.isArchive
              ? calculateCompletionXpForRoute({
                grade: selectedRoute.grade,
                previousCompletions,
                newHighestGrade,
                bonusXp: selectedRoute.bonusXp || 0,
              })
              : null;

          const communityGrade = selectedRoute.communityGrades
            ? findCommunityGradeForRoute(selectedRoute.communityGrades)
            : 'none';

          const userGrade =
            user && selectedRoute.communityGrades
              ? selectedRoute.communityGrades.find((g) => g.userId === user.id)
                ?.grade || null
              : null;

          const attemptsCount = selectedRoute.attempts?.[0]?.attempts || 0;

          return (
            <RoutePopup
              id={selectedRoute.id}
              grade={selectedRoute.grade}
              name={selectedRoute.title}
              color={selectedRoute.color}
              completions={previousCompletions}
              attempts={attemptsCount}
              userGrade={userGrade}
              communityGrade={communityGrade}
              xp={xpData}
              isArchived={selectedRoute.isArchive || false}
              bonusXp={selectedRoute.bonusXp || 0}
              onCancel={() => setSelectedRoute(null)}
              onRouteCompleted={handleRouteCompleted}
            />
          );
        })()}
    </SafeScreen>
  );
}
