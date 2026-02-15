import type { Locations, RouteDefinition } from '@/components/TopDown';
import { cn } from '@/utils/cn';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

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

const BOULDER_GRADES = ['competition', 'vfeature', 'vb', 'v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'];
const ROPE_BASE_GRADES = ['competition', '5.feature', '5.B', '5.7', '5.8', '5.9', '5.10', '5.11', '5.12', '5.13'];
const ROPE_MODIFIERS = ['', '+', '-'] as const;
const ROPE_BASES_WITH_MODIFIER = ['5.8', '5.9', '5.10', '5.11', '5.12', '5.13'];

const ALL_LOCATIONS: Locations[] = [
  'ropeNorthWest',
  'ropeNorthEast',
  'ABWall',
  'ropeSouth',
  'boulderSouth',
  'boulderMiddle',
  'boulderNorth',
];

function getColorNameFromRoute(routeColor: string): string {
  if (!routeColor?.trim()) return 'black';
  const byName = COLOR_OPTIONS.find((c) => c.name.toLowerCase() === routeColor.toLowerCase());
  if (byName) return byName.name;
  const byHex = COLOR_OPTIONS.find((c) => c.hex.toLowerCase() === routeColor.toLowerCase());
  return byHex?.name ?? 'black';
}

function parseRopeGrade(grade: string): { base: string; modifier: '' | '+' | '-' } {
  const last = grade?.slice(-1);
  if (last === '+' || last === '-') {
    return { base: grade.slice(0, -1), modifier: last };
  }
  return { base: grade ?? '', modifier: '' };
}

export interface RouteEditPopupProps {
  route: RouteDefinition;
  onCancel: () => void;
  onSave: (updated: Partial<RouteDefinition>) => void;
}

export default function RouteEditPopup({ route, onCancel, onSave }: RouteEditPopupProps) {
  const [editTitle, setEditTitle] = useState(route.title ?? '');
  const [editLocation, setEditLocation] = useState<Locations>(route.location ?? 'boulderSouth');
  const [editColor, setEditColor] = useState(getColorNameFromRoute(route.color));
  const [editBoulderGrade, setEditBoulderGrade] = useState(
    route.grade && !route.grade.startsWith('5') ? route.grade : ''
  );
  const [editRopeBase, setEditRopeBase] = useState(
    route.grade?.startsWith('5') ? parseRopeGrade(route.grade).base : ''
  );
  const [editRopeModifier, setEditRopeModifier] = useState<'' | '+' | '-'>(
    route.grade?.startsWith('5') ? parseRopeGrade(route.grade).modifier : ''
  );
  const [showWallPicker, setShowWallPicker] = useState(false);

  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.95)).current;

  const isRope = editLocation.startsWith('rope') || editLocation === 'ABWall';
  const effectiveGrade = isRope
    ? editRopeBase + (ROPE_BASES_WITH_MODIFIER.includes(editRopeBase) ? editRopeModifier : '')
    : editBoulderGrade;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(modalScale, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();
  }, [modalOpacity, modalScale]);

  const handleSave = () => {
    const hex = COLOR_OPTIONS.find((c) => c.name === editColor)?.hex ?? route.color;
    onSave({
      title: editTitle.trim() || undefined,
      location: editLocation,
      grade: effectiveGrade || route.grade,
      color: hex,
      type: isRope ? 'ROPE' : 'BOULDER',
    });
  };

  const getRouteTileStyles = (routeColor: string) => {
    const colorMap: Record<string, string> = {
      green: 'border-green-400',
      red: 'border-red-400',
      blue: 'border-blue-400',
      yellow: 'border-yellow-400',
      purple: 'border-purple-400',
      orange: 'border-orange-400',
      white: 'border-white',
      black: 'border-white',
      pink: 'border-pink-400',
      brown: 'border-amber-700',
    };
    return colorMap[routeColor.toLowerCase()] ?? 'border-slate-700';
  };

  const formatWallName = (loc: Locations) => {
    if (loc === 'ABWall') return 'Auto Belay Wall';
    return loc
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: modalOpacity, transform: [{ scale: modalScale }] }]}
      >
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
          <Pressable className="flex-1 items-center justify-center p-4" onPress={onCancel}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className={cn(
                'w-full max-w-sm rounded-lg border-2 bg-slate-900/90 p-6',
                getRouteTileStyles(editColor)
              )}
            >
              <TouchableOpacity onPress={onCancel} className="absolute right-4 top-4 z-10">
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M6 18L18 6M6 6l12 12"
                    stroke="#fff"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>

              <Text className="font-barlow-700 mb-4 text-lg text-white">Edit route</Text>
              <Text className="font-barlow mb-4 text-sm text-slate-400">
                Position (x, y) is edited on the map.
              </Text>

              <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
                <View className="gap-4">
                  <View>
                    <Text className="font-barlow-700 mb-2 text-sm text-white">Title</Text>
                    <TextInput
                      className="rounded-lg bg-slate-800 px-4 py-3 font-barlow text-white"
                      placeholder="Route name"
                      placeholderTextColor="#9CA3AF"
                      value={editTitle}
                      onChangeText={setEditTitle}
                      autoCapitalize="sentences"
                    />
                  </View>

                  <View>
                    <Text className="font-barlow-700 mb-2 text-sm text-white">Wall</Text>
                    <TouchableOpacity
                      onPress={() => setShowWallPicker(!showWallPicker)}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3"
                    >
                      <Text className="font-barlow text-white">
                        {formatWallName(editLocation)}
                      </Text>
                    </TouchableOpacity>
                    {showWallPicker && (
                      <View className="mt-2 rounded-lg border border-slate-600 bg-slate-800">
                        {ALL_LOCATIONS.map((loc) => (
                          <TouchableOpacity
                            key={loc}
                            onPress={() => {
                              setEditLocation(loc);
                              setShowWallPicker(false);
                              if (loc.startsWith('rope') || loc === 'ABWall') {
                                if (!editRopeBase) setEditRopeBase('5.10');
                              } else {
                                if (!editBoulderGrade) setEditBoulderGrade('v2');
                              }
                            }}
                            className={cn(
                              'border-b border-slate-700 px-4 py-3 last:border-b-0',
                              editLocation === loc && 'bg-slate-700'
                            )}
                          >
                            <Text
                              className={cn(
                                'font-barlow',
                                editLocation === loc ? 'font-barlow-700 text-white' : 'text-slate-300'
                              )}
                            >
                              {formatWallName(loc)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <View>
                    <Text className="font-barlow-700 mb-2 text-sm text-white">Color</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {COLOR_OPTIONS.map((c) => {
                        const selected = editColor === c.name;
                        const light = c.name === 'white' || c.name === 'yellow';
                        return (
                          <TouchableOpacity
                            key={c.name}
                            onPress={() => setEditColor(c.name)}
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
                    {isRope ? (
                      <View className="gap-3">
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 8 }}
                        >
                          {ROPE_BASE_GRADES.map((g) => {
                            const selected = editRopeBase === g;
                            return (
                              <TouchableOpacity
                                key={g}
                                onPress={() => setEditRopeBase(g)}
                                className={cn(
                                  'rounded-lg px-3 py-2',
                                  selected ? 'bg-green-600' : 'bg-slate-800'
                                )}
                              >
                                <Text className="font-barlow-700 text-sm text-white">
                                  {g === '5.feature' ? '5.FEATURE' : g}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                        {ROPE_BASES_WITH_MODIFIER.includes(editRopeBase) && (
                          <View className="flex-row gap-2">
                            {ROPE_MODIFIERS.map((m) => {
                              if (editRopeBase === '5.8' && m === '-') return null;
                              if (editRopeBase === '5.9' && m === '-') return null;
                              const selected = editRopeModifier === m;
                              return (
                                <TouchableOpacity
                                  key={m || 'none'}
                                  onPress={() => setEditRopeModifier(m)}
                                  className={cn(
                                    'rounded-lg px-3 py-2',
                                    selected ? 'bg-green-600' : 'bg-slate-800'
                                  )}
                                >
                                  <Text className="font-barlow-700 text-sm text-white">
                                    {m === '' ? 'none' : m}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {BOULDER_GRADES.map((g) => {
                          const label =
                            g === 'vfeature' ? 'vFEATURE' : g === 'vb' ? 'VB' : g.toUpperCase();
                          const selected = editBoulderGrade === g;
                          return (
                            <TouchableOpacity
                              key={g}
                              onPress={() => setEditBoulderGrade(g)}
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
                    )}
                  </View>

                  <View className="mt-2 flex-row gap-3">
                    <TouchableOpacity
                      onPress={onCancel}
                      className="flex-1 items-center rounded-lg border border-slate-500 bg-slate-800 py-3"
                    >
                      <Text className="font-barlow-700 text-white">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSave}
                      className="flex-1 items-center rounded-lg bg-green-600 py-3"
                    >
                      <Text className="font-barlow-700 text-white">Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </BlurView>
      </Animated.View>
    </Modal>
  );
}
