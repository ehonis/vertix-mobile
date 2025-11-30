import TopDown, { Locations } from '@/components/TopDown';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import {
  calculateCompletionXpForRoute,
  getBoulderGradeMapping,
  isGradeHigher,
} from '@/utils/routes';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
}

export default function TabOneScreen() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [selectedWall, setSelectedWall] = useState<Locations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } else {
      setRoutes(allRoutes);
    }
  }, [selectedWall, allRoutes]);

  const fetchRoutes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getAllRoutesNonArchive(user?.id);
      const fetchedRoutes = response.data || [];
      setAllRoutes(fetchedRoutes);
      setRoutes(fetchedRoutes);
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

  const getRouteTileStyles = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string }> = {
      green: { bg: 'bg-green-400/25', border: 'border-green-400' },
      red: { bg: 'bg-red-400/25', border: 'border-red-400' },
      blue: { bg: 'bg-blue-400/25', border: 'border-blue-400' },
      yellow: { bg: 'bg-yellow-400/25', border: 'border-yellow-400' },
      purple: { bg: 'bg-purple-400/25', border: 'border-purple-400' },
      orange: { bg: 'bg-orange-400/25', border: 'border-orange-400' },
      white: { bg: 'bg-white/35', border: 'border-white' },
      black: { bg: 'bg-slate-900/25', border: 'border-white' },
      pink: { bg: 'bg-pink-400/25', border: 'border-pink-400' },
    };

    const styles = colorMap[color.toLowerCase()] || {
      bg: 'bg-slate-800',
      border: 'border-slate-700',
    };

    return cn(
      'rounded-lg flex-row justify-between items-center p-3 border-2',
      styles.bg,
      styles.border
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-white mt-4">Loading routes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-black justify-center items-center p-6">
        <Text className="text-red-500 text-lg mb-4">{error}</Text>
        <Text className="text-white text-center">Please try again later</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-black">
      <View className="p-4">
        <Text className="text-white text-2xl font-bold mb-4">Routes</Text>

        {/* TopDown Map */}
        <View className="bg-slate-900 rounded-lg p-4 mb-4 items-center">
          <TopDown
            onData={handleWallSelection}
            initialSelection={selectedWall}
          />
          <Text className="text-gray-400 text-xs mt-2 text-center">
            {selectedWall
              ? `Showing routes for: ${selectedWall
                  .replace(/([A-Z])/g, ' $1')
                  .trim()}`
              : 'Tap a wall on the map to filter routes'}
          </Text>
        </View>

        {routes.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Text className="text-gray-400 text-lg">
              {selectedWall
                ? 'No routes found for this wall'
                : 'No routes found'}
            </Text>
            {selectedWall && (
              <TouchableOpacity onPress={() => setSelectedWall(null)}>
                <Text className="text-blue-500 mt-2 underline">
                  Clear filter
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View className="gap-3">
            {routes.map((route) => (
              <TouchableOpacity
                key={route.id}
                className={cn(getRouteTileStyles(route.color), 'relative')}
                activeOpacity={0.7}
              >
                <View className="flex-1 flex-col max-w-[70%]">
                  <Text
                    className="text-white text-xl font-bold font-barlow"
                    numberOfLines={1}
                  >
                    {route.title}
                  </Text>
                  <Text className="text-gray-300 text-base italic font-barlow mt-1">
                    {route.type === 'boulder'
                      ? getBoulderGradeMapping(route.grade)
                      : route.grade}
                  </Text>
                </View>
                {user && (
                  <View className="flex-row gap-2 items-center absolute -top-2 -right-2">
                    {(() => {
                      // Only show XP if route is not completed (showing potential XP)

                      const previousCompletions =
                        route.completions?.length || 0;
                      const routeType =
                        route.type.toLowerCase() === 'rope'
                          ? 'rope'
                          : 'boulder';
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
                        return (
                          <View className="bg-black border border-green-400 rounded-full px-2 py-1">
                            <Text className="text-green-400 text-sm font-extrabold italic font-barlow">
                              {xpData.xp}xp
                            </Text>
                          </View>
                        );
                      }
                      return null;
                    })()}
                    {route.completed && (
                      <View className="bg-black border border-green-400 rounded-full w-8 h-8 flex items-center justify-center">
                        <Text className="text-green-400 text-lg font-bold">
                          ✓
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
