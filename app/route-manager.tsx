import TopDown, { DotDefinition, Locations } from '@/components/TopDown';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const dots: DotDefinition[] = [{ x: 236, y: 168 }, { x: 239, y: 185, strokeWidth: 1, r: 3 }, { x: 245, y: 176, strokeWidth: 1, r: 3 }]

const DOT_RADIUS = 16;

/** ViewBox coordinate space in TopDown (VIEWBOX_CONFIG) — used to translate pixel position to map coords */
const VIEWBOX_FULL = { minX: 0, minY: 0, width: 300, height: 200 };

function pixelToViewBox(
  px: number,
  py: number,
  containerWidth: number,
  containerHeight: number,
  viewBox: { minX: number; minY: number; width: number; height: number }
): { x: number; y: number } {
  if (containerWidth <= 0 || containerHeight <= 0) return { x: 0, y: 0 };
  const x = (px / containerWidth) * viewBox.width + viewBox.minX;
  const y = (py / containerHeight) * viewBox.height + viewBox.minY;
  return { x, y };
}

export default function RouteManagerScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdminOrRouteSetter =
    user?.role === 'ADMIN' || user?.role === 'ROUTE_SETTER';

  const [selectedWall, setSelectedWall] = useState<Locations | null>(null);
  const [containerLayout, setContainerLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [currentViewBox, setCurrentViewBox] = useState(VIEWBOX_FULL);
  const [debugValues, setDebugValues] = useState<{
    dotX: number;
    dotY: number;
    startX: number;
    startY: number;
    containerWidth: number;
    containerHeight: number;
  }>({
    dotX: 0,
    dotY: 0,
    startX: 0,
    startY: 0,
    containerWidth: 0,
    containerHeight: 0,
  });
  const hasInitializedDot = useRef(false);

  const dotX = useSharedValue(0);
  const dotY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const containerWidth = useSharedValue(0);
  const containerHeight = useSharedValue(0);

  const handleWallSelection = useCallback((data: Locations | null) => {
    setSelectedWall(data);
  }, []);

  const handleViewBoxChange = useCallback(
    (viewBox: { minX: number; minY: number; width: number; height: number }) => {
      setCurrentViewBox(viewBox);
    },
    []
  );

  const onMapLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerLayout({ width, height });
    containerWidth.value = width;
    containerHeight.value = height;
  }, [containerWidth, containerHeight]);

  useEffect(() => {
    if (!selectedWall || !containerLayout) return;
    const { width, height } = containerLayout;
    if (width <= 0 || height <= 0) return;
    if (!hasInitializedDot.current) {
      hasInitializedDot.current = true;
      dotX.value = width / 2;
      dotY.value = height / 2;
    }
  }, [selectedWall, containerLayout, dotX, dotY]);

  useEffect(() => {
    if (!selectedWall) {
      hasInitializedDot.current = false;
    }
  }, [selectedWall]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onStart(() => {
        'worklet';
        startX.value = dotX.value;
        startY.value = dotY.value;
      })
      .onUpdate((event) => {
        'worklet';
        const w = containerWidth.value;
        const h = containerHeight.value;
        if (w <= 0 || h <= 0) return;
        let newX = startX.value + event.translationX;
        let newY = startY.value + event.translationY;
        newX = Math.max(0, Math.min(w, newX));
        newY = Math.max(0, Math.min(h, newY));
        dotX.value = newX;
        dotY.value = newY;
      });
  }, [dotX, dotY, startX, startY, containerWidth, containerHeight]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: dotX.value - DOT_RADIUS,
    top: dotY.value - DOT_RADIUS,
  }));

  useAnimatedReaction(
    () => ({
      dotX: dotX.value,
      dotY: dotY.value,
      startX: startX.value,
      startY: startY.value,
      containerWidth: containerWidth.value,
      containerHeight: containerHeight.value,
    }),
    (data) => {
      runOnJS(setDebugValues)(data);
    }
  );

  const viewBoxCoords =
    containerLayout &&
    pixelToViewBox(
      debugValues.dotX,
      debugValues.dotY,
      containerLayout.width,
      containerLayout.height,
      currentViewBox
    );

  return (
    <View className="flex-1 bg-black">
      {/* Back button - top left of screen */}
      <View className="absolute left-0 top-16 z-10 px-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 flex-row items-center gap-2">
          <FontAwesome name="arrow-left" size={24} color={Colors.text} />
          <Text className="text-white text-lg font-barlow-700">Admin Center</Text>
        </TouchableOpacity>
      </View>

      {/* Map centered in the middle */}
      <View className="flex-1 items-center justify-center">
        <View
          className="relative w-full items-center border-2 border-white"
          onLayout={onMapLayout}
        >
          <TopDown
            onData={handleWallSelection}
            initialSelection={selectedWall}
            onViewBoxChange={handleViewBoxChange}
            dots={dots}
          />
          {/* X button - top right of the map */}
          {selectedWall && (
            <TouchableOpacity
              onPress={() => handleWallSelection(null)}
              className="absolute right-0 -top-16 z-10 p-2 px-3 border-white border-2 rounded-full"
            >
              <FontAwesome name="times" size={24} color="white" />
            </TouchableOpacity>
          )}
          {/* Draggable green dot - confined to map */}
          {selectedWall && containerLayout && (
            <GestureDetector gesture={panGesture}>
              <Animated.View
                className="absolute z-10 h-8 w-8 rounded-full border-4 border-white bg-green-500"
                style={dotAnimatedStyle}
              />
            </GestureDetector>
          )}
        </View>
      </View>
      {/* Debug stats - synced from shared values via useAnimatedReaction */}
      <View className="absolute bottom-0 left-0 right-0 flex-col gap-2 p-4">
        <Text className="font-barlow-700 text-lg text-white">
          Selected Wall: {selectedWall}
        </Text>
        <Text className="font-barlow-700 text-lg text-white">
          Container Layout: {containerLayout?.width} x {containerLayout?.height}
        </Text>
        <Text className="font-barlow-700 text-lg text-white">
          Dot X: {debugValues.dotX.toFixed(1)}
        </Text>
        <Text className="font-barlow-700 text-lg text-white">
          Dot Y: {debugValues.dotY.toFixed(1)}
        </Text>
        <Text className="font-barlow-700 text-lg text-white">
          Start X: {debugValues.startX.toFixed(1)}
        </Text>
        <Text className="font-barlow-700 text-lg text-white">
          Start Y: {debugValues.startY.toFixed(1)}
        </Text>
        <Text className="font-barlow-700 text-lg text-white">
          Container Width: {debugValues.containerWidth.toFixed(1)}
        </Text>
        <Text className="font-barlow-700 text-lg text-white">
          Container Height: {debugValues.containerHeight.toFixed(1)}
        </Text>
        {viewBoxCoords && (
          <>
            <Text className="font-barlow-700 text-lg text-white">
              ViewBox X: {viewBoxCoords.x.toFixed(2)}
            </Text>
            <Text className="font-barlow-700 text-lg text-white">
              ViewBox Y: {viewBoxCoords.y.toFixed(2)}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
