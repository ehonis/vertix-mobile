import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import { getLevelForXp, getXpForLevel } from '@/utils/routes';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Completion {
  id: number;
  userId: string;
  routeId: string;
  completionDate: string;
  xpEarned: number;
  flash: boolean;
  route: {
    type: string;
    grade: string;
    title: string;
    color: string;
    id: string;
  };
}

interface Attempt {
  id: number;
  userId: string;
  routeId: string;
  attemptDate: string;
  attempts: number;
  route: {
    type: string;
    grade: string;
    title: string;
    color: string;
    id: string;
  };
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user?.id]); // Only depend on user ID, not the entire user object

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [completionsRes, attemptsRes] = await Promise.all([
        api.getDashboardCompletions(),
        api.getDashboardAttempts(),
      ]);
      setCompletions(completionsRes.data || []);
      setAttempts(attemptsRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const totalXp = user?.totalXp || 0;
  const currentLevel = getLevelForXp(totalXp);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const currentLevelXp = getXpForLevel(currentLevel);
  const xpToNextLevel = nextLevelXp - totalXp;
  const progressPercent =
    ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  // Grade counts
  const boulderCompletions = completions.filter(
    (c) => c.route.type === 'BOULDER'
  );
  const ropeCompletions = completions.filter((c) => c.route.type === 'ROPE');
  const totalCompletions = completions.length;

  // Grade distribution
  const gradeCounts: Record<string, number> = {};
  completions.forEach((completion) => {
    const grade = completion.route.grade;
    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
  });

  // Recent activity (last 20 items) - grouped by date
  const allActivities = [
    ...completions.map((c) => ({
      ...c,
      type: 'completion' as const,
      date: c.completionDate,
    })),
    ...attempts.map((a) => ({
      ...a,
      type: 'attempt' as const,
      date: a.attemptDate,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  // Group activities by date
  const groupedActivities = allActivities.reduce((groups, activity) => {
    const dateKey = new Date(activity.date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
    return groups;
  }, {} as Record<string, typeof allActivities>);

  // Get level accent colors
  const getLevelAccentColors = (level: number) => {
    if (level >= 50) return { text: 'text-red-400', progress: 'bg-red-500' };
    if (level >= 30)
      return { text: 'text-yellow-400', progress: 'bg-yellow-500' };
    if (level >= 20)
      return { text: 'text-orange-400', progress: 'bg-orange-500' };
    if (level >= 10)
      return { text: 'text-green-400', progress: 'bg-green-500' };
    return { text: 'text-blue-400', progress: 'bg-blue-500' };
  };

  const accentColors = getLevelAccentColors(currentLevel);

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

    return cn('rounded-lg p-3 border-2', styles.bg, styles.border);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-white mt-4">Loading dashboard...</Text>
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
      <View className="p-5 pt-2 gap-2 items-center">
        {/* User Profile Section - ImageNamePlate Style */}
        <View className="w-full items-start  py-4 relative">
          {/* Profile Picture - positioned with negative margin */}
          <View className="relative -mb-16 z-10">
            {user?.image ? (
              <Image
                source={{ uri: user.image }}
                className="w-36 h-36 rounded-full border-4 border-slate-900"
              />
            ) : (
              <View className="w-36 h-36 rounded-full border-4 border-slate-900 bg-slate-700" />
            )}
          </View>

          {/* Name and ID Plate - overlaps with image */}
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            className="bg-slate-900 w-full rounded-lg mt-12 p-6 px-4 relative flex-row justify-between items-center"
            activeOpacity={0.7}
          >
            <View className="flex-1">
              <Text className="text-white font-barlow font-bold text-2xl text-start">
                {user?.name || 'User'}
              </Text>
              <Text className="text-gray-400 font-barlow font-bold text-start text-sm">
                @{user?.username || user?.id}
              </Text>
            </View>
            <View className="font-barlow text-white flex flex-col justify-center items-center gap-1">
              <Text className="font-bold text-lg font-barlow text-white">
                Highest Grade
              </Text>
              <View className="flex-row gap-3">
                <Text className="text-white font-barlow">
                  {user?.highestRopeGrade || 'n/a'}
                </Text>
                <View className="bg-white rounded-full h-8 w-0.5" />
                <Text className="text-white font-barlow">
                  {user?.highestBoulderGrade || 'n/a'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* XP Level Display - matches web styling with -mt-2 overlap */}
        <View className="bg-slate-900 rounded-lg p-4 w-full -mt-2">
          <View className="flex-row items-center gap-3">
            <Text
              className={`text-5xl font-extrabold font-barlow ${accentColors.text} -mt-1`}
            >
              {currentLevel}
            </Text>
            <View className="flex-1">
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-300 text-sm font-barlow">
                  {totalXp} XP
                </Text>
                <Text className="text-gray-300 text-sm font-barlow">
                  {xpToNextLevel} to next level
                </Text>
              </View>
              <View className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <View
                  className={`h-full ${accentColors.progress} rounded-full`}
                  style={{
                    width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                  }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-gray-400 text-xs font-barlow">
                  Level {currentLevel}
                </Text>
                <Text className="text-gray-400 text-xs font-barlow">
                  Level {currentLevel + 1}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="w-full">
          <Text className="text-white text-2xl font-bold font-barlow mb-3">
            Recent Tix & Attempts
          </Text>
          <ScrollView className="bg-slate-900 rounded-lg px-3 py-2 gap-3 max-h-96 overflow-y-scroll">
            {allActivities.length === 0 ? (
              <Text className="text-gray-400 text-center py-8 font-barlow">
                No activity yet. Start climbing!
              </Text>
            ) : (
              Object.entries(groupedActivities).map(([date, activities]) => (
                <View key={date} className="flex-col gap-2">
                  {/* Date separator */}
                  <View className="flex-row items-center gap-2">
                    <View className="h-px bg-gray-500 flex-1" />
                    <Text className="text-gray-400 font-barlow text-lg font-medium px-2">
                      {date}
                    </Text>
                    <View className="h-px bg-gray-500 flex-1" />
                  </View>

                  {/* Activities for this date */}
                  {activities.map((activity, index) => {
                    const isCompletion = activity.type === 'completion';
                    const route = isCompletion
                      ? (activity as Completion).route
                      : (activity as Attempt).route;
                    const activityDate = new Date(activity.date);
                    const activityType = isCompletion ? 'Tick' : 'Attempt';

                    return (
                      <View
                        key={`${activity.type}-${activity.id}-${index}`}
                        className={cn(
                          'flex-row justify-between items-center rounded-md p-2',
                          getRouteTileStyles(route.color)
                        )}
                      >
                        <View className="flex-col flex-1">
                          <Text
                            className="text-white text-lg font-bold font-barlow"
                            numberOfLines={1}
                          >
                            {route.title}
                          </Text>
                          <Text className="text-gray-300 font-barlow">
                            {route.grade}
                          </Text>
                          <Text className="text-gray-400 text-xs font-barlow">
                            {activityType}
                          </Text>
                        </View>
                        <Text className="text-gray-300 font-barlow">
                          {activityDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}
