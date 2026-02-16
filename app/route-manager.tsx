import RouteEditPopup from '@/components/RouteEditPopup';
import SafeScreen from '@/components/SafeScreen';
import TopDown, { Locations, RouteDefinition } from '@/components/TopDown';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated as RNAnimated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const DEMO_ROUTES: RouteDefinition[] = [
  { routeId: '1', title: 'Warm Up', grade: 'v2', color: '#22C55E', x: 236, y: 168, type: 'BOULDER', location: 'boulderSouth' },
  { routeId: '2', title: 'Pocket Line', grade: 'v4', color: '#3B82F6', x: 239, y: 185, type: 'BOULDER', location: 'boulderSouth' },
  { routeId: '100', title: 'Project', grade: 'v6', color: '#A855F7', x: 245, y: 176, type: 'BOULDER', location: 'boulderSouth' },
  // Routes without position (and one without title) — at the end
  { routeId: '101', title: 'Unplaced', grade: 'v3', color: '#EC4899', type: 'BOULDER', location: 'boulderSouth' },
  { routeId: '102', grade: 'v5', color: '#F97316', type: 'BOULDER', location: 'boulderSouth' },
];

const COLOR_OPTIONS: { name: string; hex: string }[] = [
  { name: 'black', hex: '#000000' },
  { name: 'white', hex: '#FFFFFF' },
  { name: 'brown', hex: '#8B4513' },
  { name: 'red', hex: '#EF4444' },
  { name: 'blue', hex: '#3B82F6' },
  { name: 'yellow', hex: '#EAB308' },
  { name: 'green', hex: '#22C55E' },
  { name: 'orange', hex: '#F97316' },
  { name: 'pink', hex: '#EC4899' },
  { name: 'purple', hex: '#A855F7' },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PEEK_WIDTH = 40;
const CARD_WIDTH = SCREEN_WIDTH - 2 * PEEK_WIDTH;
const CAROUSEL_HEIGHT = SCREEN_HEIGHT * 0.25;

const BOULDER_GRADES = ['competition', 'vfeature', 'vb', 'v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'];
const ROPE_BASE_GRADES = ['competition', '5.feature', '5.B', '5.7', '5.8', '5.9', '5.10', '5.11', '5.12', '5.13'];
const ROPE_MODIFIERS = ['', '+', '-'] as const;
const ROPE_BASES_WITH_MODIFIER = ['5.8', '5.9', '5.10', '5.11', '5.12', '5.13'];

export default function RouteManagerScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdminOrRouteSetter =
    user?.role === 'ADMIN' || user?.role === 'ROUTE_SETTER';

  const [selectedWall, setSelectedWall] = useState<Locations | null>(null);
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('create');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteDefinition[]>(DEMO_ROUTES);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [editPopupVisible, setEditPopupVisible] = useState(false);

  const [createName, setCreateName] = useState('');
  const [createColor, setCreateColor] = useState('black');
  const [createGrade, setCreateGrade] = useState('');
  const [createRopeBase, setCreateRopeBase] = useState('');
  const [createRopeModifier, setCreateRopeModifier] = useState<'' | '+' | '-'>('');

  const routeType = useMemo<'rope' | 'boulder'>(() => {
    if (!selectedWall) return 'boulder';
    return selectedWall.startsWith('rope') || selectedWall === 'ABWall' ? 'rope' : 'boulder';
  }, [selectedWall]);

  // Container layout and viewBox for pixel-to-viewBox conversion
  const [containerLayout, setContainerLayout] = useState<{ width: number; height: number } | null>(null);
  const [currentViewBox, setCurrentViewBox] = useState({ minX: 0, minY: 0, width: 300, height: 200 });
  const hasInitializedRoute = useRef(false);
  const lastInitializedRouteId = useRef<string | null>(null);
  const editOriginalRef = useRef<{ routeId: string; x?: number; y?: number } | null>(null);

  // Carousel scroll tracking
  const scrollX = useRef(new RNAnimated.Value(0)).current;
  const carouselRef = useRef<FlatList<RouteDefinition>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Shared values for draggable route marker position (pixels)
  const routeX = useSharedValue(0);
  const routeY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  // Container dimensions as shared values for worklet access
  const containerW = useSharedValue(0);
  const containerH = useSharedValue(0);

  const resetCreateState = useCallback(() => {
    setCreateName('');
    setCreateColor('black');
    setCreateGrade('');
    setCreateRopeBase('');
    setCreateRopeModifier('');
  }, []);

  const handleWallSelection = useCallback(
    (data: Locations | null) => {
      setSelectedWall(data);
      hasInitializedRoute.current = false;
      resetCreateState();
    },
    [resetCreateState]
  );

  // In edit mode, fetch routes for the selected wall (GET only; no PATCH yet)
  useEffect(() => {
    if (mode !== 'edit' || !selectedWall) {
      if (mode === 'edit' && !selectedWall) {
        setRoutes([]);
      }
      return;
    }
    let cancelled = false;
    setRoutesLoading(true);
    setRoutesError(null);
    api
      .getRoutesByWall(selectedWall, user?.id)
      .then((res: { data?: Array<{ id: string; title?: string; grade: string; color: string; type?: string; location?: string; x?: number | null; y?: number | null }> }) => {
        if (cancelled) return;
        const list = res?.data ?? [];
        const mapped: RouteDefinition[] = list.map((r) => ({
          routeId: r.id,
          title: r.title ?? undefined,
          grade: r.grade,
          color: r.color,
          type: (r.type === 'ROPE' || r.type === 'BOULDER' ? r.type : 'BOULDER') as 'BOULDER' | 'ROPE',
          location: (r.location as Locations) ?? selectedWall,
          x: typeof r.x === 'number' ? r.x : undefined,
          y: typeof r.y === 'number' ? r.y : undefined,
        }));
        setRoutes(mapped);
      })
      .catch((err) => {
        if (!cancelled) {
          setRoutesError(err?.message ?? 'Failed to load routes');
          setRoutes([]);
        }
      })
      .finally(() => {
        if (!cancelled) setRoutesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, selectedWall, user?.id]);

  const handleViewBoxChange = useCallback(
    (viewBox: { minX: number; minY: number; width: number; height: number }) => {
      setCurrentViewBox(viewBox);
    },
    []
  );

  const handleContainerLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = e.nativeEvent.layout;
      setContainerLayout({ width, height });
      containerW.value = width;
      containerH.value = height;
    },
    [containerW, containerH]
  );

  // Reset carousel to first item and auto-select first route when routes or wall change (edit mode only)
  useEffect(() => {
    if (selectedWall && mode === 'edit' && routes.length > 0 && carouselRef.current) {
      const firstRoute = routes[0];
      setActiveIndex(0);
      setSelectedRouteId(firstRoute?.routeId ?? null);
      if (firstRoute) {
        editOriginalRef.current =
          typeof firstRoute.x === 'number' && typeof firstRoute.y === 'number'
            ? { routeId: firstRoute.routeId, x: firstRoute.x, y: firstRoute.y }
            : { routeId: firstRoute.routeId };
        lastInitializedRouteId.current = firstRoute.routeId;
      }
      scrollX.setValue(0);
      setTimeout(() => {
        carouselRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 100);
    }
  }, [selectedWall, mode, routes.length, scrollX]);

  // Select only (no popup): used when tapping a route on the map or when carousel scroll selects.
  const handleRouteSelectFromMap = useCallback(
    (routeId: string) => {
      setSelectedRouteId(routeId);
      if (mode === 'edit') {
        const route = routes.find((r) => r.routeId === routeId);
        if (route) {
          editOriginalRef.current =
            typeof route.x === 'number' && typeof route.y === 'number'
              ? { routeId, x: route.x, y: route.y }
              : { routeId };
        }
        const index = routes.findIndex((r) => r.routeId === routeId);
        if (index >= 0 && carouselRef.current) {
          carouselRef.current.scrollToOffset({
            offset: index * CARD_WIDTH,
            animated: true,
          });
          setActiveIndex(index);
          scrollX.setValue(index * CARD_WIDTH);
        }
      }
    },
    [mode, routes]
  );

  // Select and open edit popup: used when tapping the carousel tile.
  const handleRouteSelectFromTile = useCallback(
    (routeId: string) => {
      handleRouteSelectFromMap(routeId);
      if (mode === 'edit') setEditPopupVisible(true);
    },
    [mode, handleRouteSelectFromMap]
  );

  const openEditPopupFromDot = useCallback(() => {
    if (mode === 'edit' && selectedRouteId) setEditPopupVisible(true);
  }, [mode, selectedRouteId]);

  const handleNewRoutePosition = useCallback((x: number, y: number) => {
    // TODO: create route on server with name, color, grade, x, y; then add to routes
    console.log('New route position:', x, y);
  }, []);

  const handleEditRoutePosition = useCallback((routeId: string, x: number, y: number) => {
    setRoutes((prev) =>
      prev.map((r) => (r.routeId === routeId ? { ...r, x, y } : r))
    );
  }, []);

  const clearEditState = useCallback(() => {
    setSelectedRouteId(null);
    setEditPopupVisible(false);
    hasInitializedRoute.current = false;
    lastInitializedRouteId.current = null;
    editOriginalRef.current = null;
  }, []);

  const handleCancelEdit = useCallback(() => {
    const orig = editOriginalRef.current;
    if (orig) {
      setRoutes((prev) =>
        prev.map((r) =>
          r.routeId === orig.routeId ? { ...r, x: orig.x, y: orig.y } : r
        )
      );
    }
    clearEditState();
  }, [clearEditState]);

  const snapOffsets = useMemo(() => routes.map((_, index) => index * CARD_WIDTH), [routes]);

  // Only drive scrollX for card opacity/scale; do NOT update selection during scroll (causes glitchy highlight)
  const handleCarouselScroll = RNAnimated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / CARD_WIDTH);
      const targetIndex = Math.max(0, Math.min(index, routes.length - 1));
      const targetRoute = routes[targetIndex];
      if (carouselRef.current && routes.length > 0) {
        try {
          carouselRef.current.scrollToOffset({
            offset: targetIndex * CARD_WIDTH,
            animated: true,
          });
        } catch (e) {
          try {
            carouselRef.current.scrollToIndex({ index: targetIndex, animated: true });
          } catch {
            // Ignore
          }
        }
      }
      setActiveIndex(targetIndex);
      if (targetRoute) {
        setSelectedRouteId(targetRoute.routeId);
        editOriginalRef.current =
          typeof targetRoute.x === 'number' && typeof targetRoute.y === 'number'
            ? { routeId: targetRoute.routeId, x: targetRoute.x, y: targetRoute.y }
            : { routeId: targetRoute.routeId };
      }
    },
    [routes]
  );

  const handleDeleteRoute = useCallback(() => {
    if (!selectedRouteId) return;
    Alert.alert(
      'Delete route',
      'Are you sure you want to permanently delete this route? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteRoute([selectedRouteId]);
              setRoutes((prev) => prev.filter((r) => r.routeId !== selectedRouteId));
              clearEditState();
            } catch (err) {
              console.error('Delete route failed:', err);
              Alert.alert('Error', 'Failed to delete route. Please try again.');
            }
          },
        },
      ]
    );
  }, [selectedRouteId, clearEditState]);

  const handleArchiveRoute = useCallback(() => {
    if (!selectedRouteId) return;
    Alert.alert(
      'Archive route',
      'Are you sure you want to archive this route? It will be hidden from the active route list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              await api.archiveRoute([selectedRouteId]);
              setRoutes((prev) => prev.filter((r) => r.routeId !== selectedRouteId));
              clearEditState();
            } catch (err) {
              console.error('Archive route failed:', err);
              Alert.alert('Error', 'Failed to archive route. Please try again.');
            }
          },
        },
      ]
    );
  }, [selectedRouteId, clearEditState]);

  const isRouteIncomplete = useCallback((route: RouteDefinition) => {
    const missingTitle = !route.title?.trim();
    const missingPosition = typeof route.x !== 'number' || typeof route.y !== 'number';
    return missingTitle || missingPosition;
  }, []);

  const renderCarouselItem = useCallback(
    ({ item: route, index }: { item: RouteDefinition; index: number }) => {
      const inputRange = [
        (index - 1) * CARD_WIDTH,
        index * CARD_WIDTH,
        (index + 1) * CARD_WIDTH,
      ];
      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.3, 1, 0.3],
        extrapolate: 'clamp',
      });
      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.9, 1, 0.9],
        extrapolate: 'clamp',
      });
      const isSelected = selectedRouteId === route.routeId;
      const showIncompleteBadge = mode === 'edit' && isRouteIncomplete(route);
      return (
        <RNAnimated.View
          className="justify-center"
          style={{
            width: CARD_WIDTH,
            height: CAROUSEL_HEIGHT,
            opacity,
            transform: [{ scale }],
          }}
        >
          <TouchableOpacity
            onPress={() => handleRouteSelectFromTile(route.routeId)}
            className={cn(
              'h-full rounded-lg border-2 p-4',
              isSelected ? 'border-green-500 bg-slate-800' : 'border-slate-600 bg-slate-900'
            )}
          >
            {showIncompleteBadge && (
              <View className="absolute right-2 top-2 z-10 h-5 w-5 items-center justify-center rounded-full bg-red-500">
                <FontAwesome name="exclamation" size={12} color="white" />
              </View>
            )}
            <View className="flex-row items-center gap-3">
              <View
                className="h-12 w-12 rounded-full"
                style={{ backgroundColor: route.color }}
              />
              <View>
                <Text className="font-barlow-700 text-white">
                  {route.title || `Route ${route.routeId}`}
                </Text>
                <Text className="font-barlow text-sm text-slate-400">
                  {route.grade} · Tap to select for editing
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </RNAnimated.View>
      );
    },
    [scrollX, selectedRouteId, handleRouteSelectFromTile, mode, isRouteIncomplete]
  );

  const cycleModes = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'create' ? 'edit' : 'create';
      if (next === 'create') {
        setSelectedRouteId(null);
        setEditPopupVisible(false);
        resetCreateState();
      }
      if (next !== 'create') {
        clearEditState();
        resetCreateState();
      } else {
        hasInitializedRoute.current = false;
      }
      return next;
    });
  }, [clearEditState, resetCreateState]);



  // Initialize draggable route marker position - delayed to wait for zoom animation
  useEffect(() => {
    if (mode === 'view' || !selectedWall || !containerLayout) {
      hasInitializedRoute.current = false;
      lastInitializedRouteId.current = null;
      return;
    }
    if (mode === 'edit' && !selectedRouteId) {
      hasInitializedRoute.current = false;
      lastInitializedRouteId.current = null;
      return;
    }
    if (mode === 'edit' && selectedRouteId && selectedRouteId !== lastInitializedRouteId.current) {
      hasInitializedRoute.current = false;
      lastInitializedRouteId.current = selectedRouteId;
    }
    if (hasInitializedRoute.current) return;

    const timer = setTimeout(() => {
      hasInitializedRoute.current = true;
      const { width, height } = containerLayout;

      if (mode === 'create') {
        routeX.value = width / 2;
        routeY.value = height / 2;
      } else if (mode === 'edit' && selectedRouteId) {
        const selectedRoute = routes.find((r) => r.routeId === selectedRouteId);
        const x = selectedRoute?.x;
        const y = selectedRoute?.y;
        if (
          typeof x === 'number' &&
          typeof y === 'number' &&
          currentViewBox.width > 0 &&
          currentViewBox.height > 0
        ) {
          routeX.value = ((x - currentViewBox.minX) / currentViewBox.width) * width;
          routeY.value = ((y - currentViewBox.minY) / currentViewBox.height) * height;
        } else {
          routeX.value = width / 2;
          routeY.value = height / 2;
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [mode, selectedWall, selectedRouteId, routes, containerLayout, currentViewBox, routeX, routeY]);

  // Pan gesture for draggable route marker (pixels, clamped to container)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startX.value = routeX.value;
      startY.value = routeY.value;
    })
    .onUpdate((event) => {
      'worklet';
      const w = containerW.value;
      const h = containerH.value;
      if (w <= 0 || h <= 0) return;
      let newX = startX.value + event.translationX;
      let newY = startY.value + event.translationY;
      newX = Math.max(0, Math.min(w, newX));
      newY = Math.max(0, Math.min(h, newY));
      routeX.value = newX;
      routeY.value = newY;
    })
    .onEnd(() => {
      'worklet';
      const w = containerW.value;
      const h = containerH.value;
      if (w <= 0 || h <= 0) return;
      const vbX = (routeX.value / w) * currentViewBox.width + currentViewBox.minX;
      const vbY = (routeY.value / h) * currentViewBox.height + currentViewBox.minY;

      if (mode === 'create') {
        runOnJS(handleNewRoutePosition)(vbX, vbY);
      } else if (mode === 'edit' && selectedRouteId) {
        runOnJS(handleEditRoutePosition)(selectedRouteId, vbX, vbY);
      }
    });

  const tapOnDotGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        'worklet';
        runOnJS(openEditPopupFromDot)();
      }),
    [openEditPopupFromDot]
  );

  const dotGesture = useMemo(
    () => Gesture.Race(panGesture, tapOnDotGesture),
    [panGesture, tapOnDotGesture]
  );

  const ROUTE_RADIUS = 16;

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1, // infinite
      true  // reverse
    );
  }, []);


  const routeAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: routeX.value - ROUTE_RADIUS,
    top: routeY.value - ROUTE_RADIUS,
    opacity: pulseOpacity.value,
  }));

  const handleRopeBase = useCallback(
    (base: string) => {
      setCreateRopeBase(base);
      if (ROPE_BASES_WITH_MODIFIER.includes(base)) {
        setCreateGrade(base + createRopeModifier);
      } else {
        setCreateRopeModifier('');
        setCreateGrade(base);
      }
    },
    [createRopeModifier]
  );

  const handleRopeModifier = useCallback((mod: '' | '+' | '-') => {
    setCreateRopeModifier(mod);
    setCreateGrade(createRopeBase + mod);
  }, [createRopeBase]);

  return (
    <SafeScreen edges={['top', 'bottom']} className="bg-black">
      <View className="flex-1">
      <View className="absolute left-0 top-4 z-10 px-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-2 p-2">
          <FontAwesome name="arrow-left" size={24} color={Colors.text} />
          <Text className="text-lg font-barlow-700 text-white">Admin Center</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        className="flex-1"
      >
        <View className="flex overflow mt-48">
          <View className="items-center justify-center">
            {!selectedWall && (
              <View className="z-10 m-2 flex w-full items-center">
                <Text className="font-barlow-700 text-xl text-white">
                  Tap on a wall to edit / create routes
                </Text>
              </View>
            )}
            <View
              className="relative w-full items-center rounded-lg border-2 border-white"
              onLayout={handleContainerLayout}
            >
              <TopDown
                onData={handleWallSelection}
                initialSelection={selectedWall}
                onRouteSelect={handleRouteSelectFromMap}
                onViewBoxChange={handleViewBoxChange}
                routes={routes}
                mode={mode}
                selectedRouteId={selectedRouteId}
                onBackgroundTap={
                  mode === 'edit' && selectedRouteId ? clearEditState : undefined
                }
              />
              {selectedWall && (
                <TouchableOpacity
                  onPress={() => handleWallSelection(null)}
                  className="absolute right-0 -top-16 z-10 rounded-full border-2 border-white p-2 px-3"
                >
                  <FontAwesome name="times" size={20} color="white" />
                </TouchableOpacity>
              )}
              {selectedWall && (
                <TouchableOpacity
                  onPress={cycleModes}
                  className={cn(
                    'absolute left-0 -top-16 z-10 rounded-full border-2 border-white px-3 py-2',
                    mode === 'edit' ? 'bg-orange-400' : 'bg-green-500'
                  )}
                >
                  <Text className="font-barlow-700 text-sm uppercase text-white">
                    {mode} mode
                  </Text>
                </TouchableOpacity>
              )}
              {selectedWall &&
                containerLayout &&
                (mode === 'create' || (mode === 'edit' && selectedRouteId)) && (
                  <View className="absolute inset-0 z-10" pointerEvents="box-none">
                    <GestureDetector gesture={dotGesture}>
                      <Animated.View
                        className="h-8 w-8 items-center justify-center rounded-full border-4 border-white"
                        style={[
                          routeAnimatedStyle,
                          {
                            backgroundColor:
                              mode === 'create'
                                ? '#22C55E'
                                : routes.find((r) => r.routeId === selectedRouteId)?.color ?? '#F59E0B',
                          },
                        ]}
                      >
                        <View
                          className="h-4 w-4 rounded-full"
                          style={{
                            backgroundColor:
                              mode === 'create'
                                ? '#22C55E'
                                : routes.find((r) => r.routeId === selectedRouteId)?.color ?? '#F59E0B',
                            opacity: 0.5,
                          }}
                        />
                      </Animated.View>
                    </GestureDetector>
                  </View>
                )}
            </View>
          </View>

          {selectedWall && mode === 'edit' && routesLoading && (
            <View className="mt-4 w-full px-4">
              <Text className="font-barlow text-slate-400">Loading routes…</Text>
            </View>
          )}
          {selectedWall && mode === 'edit' && !routesLoading && routesError && (
            <View className="mt-4 w-full px-4">
              <Text className="font-barlow text-red-400">{routesError}</Text>
            </View>
          )}
          {selectedWall && mode === 'edit' && !routesLoading && routes.length > 0 && (
            <View className="mt-4 w-full px-2">
              <Text className="font-barlow-700 mb-2 text-sm text-white">
                Routes on this wall — swipe to browse
              </Text>
              <FlatList
                ref={carouselRef}
                data={routes}
                renderItem={renderCarouselItem}
                keyExtractor={(item) => item.routeId}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled={false}
                snapToOffsets={snapOffsets}
                snapToAlignment="start"
                decelerationRate={0.9}
                scrollEventThrottle={16}
                onScroll={handleCarouselScroll}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                initialScrollIndex={0}
                contentContainerStyle={{
                  paddingHorizontal: PEEK_WIDTH,
                  marginTop: 10,
                }}
                getItemLayout={(_, index) => ({
                  length: CARD_WIDTH,
                  offset: CARD_WIDTH * index,
                  index,
                })}
              />
              <View className="mt-4 flex-row gap-3">
                <TouchableOpacity
                  onPress={handleArchiveRoute}
                  disabled={!selectedRouteId}
                  className={cn(
                    'flex-1 flex-row items-center justify-center gap-2 rounded-lg border-2 border-amber-500 py-3',
                    selectedRouteId ? 'bg-amber-500/20' : 'border-slate-600 bg-slate-800/50 opacity-50'
                  )}
                >
                  <FontAwesome name="archive" size={18} color={selectedRouteId ? '#F59E0B' : '#64748B'} />
                  <Text
                    className={cn(
                      'font-barlow-700',
                      selectedRouteId ? 'text-amber-400' : 'text-slate-500'
                    )}
                  >
                    Archive
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteRoute}
                  disabled={!selectedRouteId}
                  className={cn(
                    'flex-1 flex-row items-center justify-center gap-2 rounded-lg border-2 border-red-500 py-3',
                    selectedRouteId ? 'bg-red-500/20' : 'border-slate-600 bg-slate-800/50 opacity-50'
                  )}
                >
                  <FontAwesome name="trash" size={18} color={selectedRouteId ? '#EF4444' : '#64748B'} />
                  <Text
                    className={cn(
                      'font-barlow-700',
                      selectedRouteId ? 'text-red-400' : 'text-slate-500'
                    )}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {mode === 'create' && selectedWall && (
            <View className="mx-4 mb-6 mt-4 gap-4 rounded-lg bg-slate-900 p-4">
              <Text className="font-barlow-700 text-lg text-white">New route</Text>

              <View>
                <Text className="font-barlow-700 mb-2 text-sm text-white">
                  Name <Text className="font-barlow text-slate-400">(optional)</Text>
                </Text>
                <TextInput
                  className="rounded-lg bg-slate-800 px-4 py-3 font-barlow text-white"
                  placeholder="Route name"
                  placeholderTextColor="#9CA3AF"
                  value={createName}
                  onChangeText={setCreateName}
                  autoCapitalize="sentences"
                />
              </View>

              <View>
                <Text className="font-barlow-700 mb-2 text-sm text-white">Color</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {COLOR_OPTIONS.map((c) => {
                    const selected = createColor === c.name;
                    const light = c.name === 'white' || c.name === 'yellow';
                    return (
                      <TouchableOpacity
                        key={c.name}
                        onPress={() => setCreateColor(c.name)}
                        className={cn(
                          'h-9 w-9 rounded-full',
                          selected ? 'border-2 border-white' : light && 'border border-slate-500'
                        )}
                        style={{ backgroundColor: c.hex }}
                      />
                    );
                  })}
                </ScrollView>
              </View>

              <View>
                <Text className="font-barlow-700 mb-2 text-sm text-white">Grade</Text>
                {routeType === 'boulder' ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {BOULDER_GRADES.map((g) => {
                      const label =
                        g === 'vfeature' ? 'vFEATURE' : g === 'vb' ? 'VB' : g.toUpperCase();
                      const selected = createGrade === g;
                      return (
                        <TouchableOpacity
                          key={g}
                          onPress={() => setCreateGrade(g)}
                          className={cn(
                            'rounded-lg px-3 py-2',
                            selected ? 'bg-green-600' : 'bg-slate-800'
                          )}
                        >
                          <Text className="font-barlow-700 text-sm text-white">{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View className="gap-3">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {ROPE_BASE_GRADES.map((g) => {
                        const label = g === '5.feature' ? '5.FEATURE' : g;
                        const selected = createRopeBase === g;
                        return (
                          <TouchableOpacity
                            key={g}
                            onPress={() => handleRopeBase(g)}
                            className={cn(
                              'rounded-lg px-3 py-2',
                              selected ? 'bg-green-600' : 'bg-slate-800'
                            )}
                          >
                            <Text className="font-barlow-700 text-sm text-white">{label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    {ROPE_BASES_WITH_MODIFIER.includes(createRopeBase) && (
                      <View className="flex-row gap-2">
                        {ROPE_MODIFIERS.map((m) => {
                          const label = m === '' ? 'none' : m;
                          if (createRopeBase === '5.8' && m === '-') return null;
                          if (createRopeBase === '5.9' && m === '-') return null;

                          const selected = createRopeModifier === m;
                          return (
                            <TouchableOpacity
                              key={m || 'none'}
                              onPress={() => handleRopeModifier(m)}
                              className={cn(
                                'rounded-lg px-3 py-2',
                                selected ? 'bg-green-600' : 'bg-slate-800'
                              )}
                            >
                              <Text className="font-barlow-700 text-sm text-white">{label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {mode === 'edit' && selectedRouteId && editPopupVisible && (() => {
        const routeToEdit = routes.find((r) => r.routeId === selectedRouteId);
        if (!routeToEdit) return null;
        return (
          <RouteEditPopup
            route={routeToEdit}
            onCancel={() => setEditPopupVisible(false)}
            onSave={(updated) => {
              setRoutes((prev) =>
                prev.map((r) =>
                  r.routeId === selectedRouteId ? { ...r, ...updated } : r
                )
              );
              setEditPopupVisible(false);
            }}
          />
        );
      })()}
      </View>
    </SafeScreen>
  );
}
