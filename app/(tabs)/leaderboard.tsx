import SafeScreen from '@/components/SafeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useXp } from '@/contexts/XpContext';
import { api } from '@/services/api';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface LeaderboardUser {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    totalXp: number;
}

interface MonthlyEntry {
    user: LeaderboardUser;
    xp: number;
}

interface LeaderboardData {
    monthly: MonthlyEntry[];
    total: LeaderboardUser[];
    userMonthlyRank: number | null;
    userTotalRank: number | null;
    currentMonth: string;
}

// Level indicator component
function LevelIndicator({ xp, size = 'sm' }: { xp: number; size?: 'xs' | 'sm' | 'md' }) {
    const { getLevelForXp } = useXp();
    const level = getLevelForXp(xp);

    const sizeClasses = {
        xs: 'w-5 h-5 text-[10px]',
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
    };

    const getLevelColor = (lvl: number) => {
        if (lvl >= 50) return { text: 'text-red-400', border: 'border-red-400' };
        if (lvl >= 30) return { text: 'text-yellow-400', border: 'border-yellow-400' };
        if (lvl >= 20) return { text: 'text-orange-400', border: 'border-orange-400' };
        if (lvl >= 10) return { text: 'text-green-400', border: 'border-green-400' };
        return { text: 'text-blue-400', border: 'border-blue-400' };
    };

    const colors = getLevelColor(level);

    return (
        <View className={`${sizeClasses[size]} rounded-full border-2 ${colors.border} bg-gray-900/80 items-center justify-center`}>
            <Text className={`${colors.text} font-plus-jakarta-700`}>{level}</Text>
        </View>
    );
}

// Default avatar SVG component
function DefaultAvatar() {
    return (
        <View className="w-7 h-7 rounded-full bg-gray-700 items-center justify-center">
            <Svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={1.5}
                className="w-5 h-5"
            >
                <Path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
            </Svg>
        </View>
    );
}

// Helper function to shorten XP numbers
function shortenXp(xp: number): string {
    if (xp >= 1000000) {
        return `${(xp / 1000000).toFixed(1)}M`;
    } else if (xp >= 1000) {
        return `${(xp / 1000).toFixed(1)}K`;
    }
    return xp.toString();
}

// Get medal emoji for top 3
function getMedalIcon(index: number): string | null {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
}

// Get row styling based on rank and mode
function getRowStyle(index: number, isMonthly: boolean) {
    if (index === 0) {
        return {
            bg: 'bg-amber-500/75',
            border: 'border-amber-500',
            rankColor: 'text-amber-300',
        };
    }
    if (index === 1) {
        return {
            bg: 'bg-gray-500/75',
            border: 'border-gray-500',
            rankColor: 'text-gray-300',
        };
    }
    if (index === 2) {
        return {
            bg: 'bg-orange-500/75',
            border: 'border-orange-500',
            rankColor: 'text-orange-300',
        };
    }
    // Regular rows: blue for monthly, purple for total
    return isMonthly
        ? { bg: 'bg-blue-500/25', border: 'border-blue-500', rankColor: 'text-blue-300' }
        : { bg: 'bg-purple-500/25', border: 'border-purple-500', rankColor: 'text-purple-300' };
}

// Leaderboard row component
function LeaderboardRow({
    user,
    xp,
    index,
    isMonthly,
}: {
    user: LeaderboardUser;
    xp: number;
    index: number;
    isMonthly: boolean;
}) {
    const medal = getMedalIcon(index);
    const style = getRowStyle(index, isMonthly);

    return (
        <View
            className={`flex-row items-center ${style.bg} border ${style.border} rounded-lg px-3 py-3`}
        >
            {/* Rank */}
            <View className="w-12 flex-row items-center">
                {medal ? (
                    <Text className="text-xl">{medal}</Text>
                ) : (
                    <Text className={`font-plus-jakarta-700 ${style.rankColor}`}>#{index + 1}</Text>
                )}
            </View>

            {/* User info */}
            <View className="flex-1 flex-row items-center bg-slate-900/60 rounded-full px-2 py-1.5 gap-2">
                <LevelIndicator xp={user.totalXp} size="xs" />
                {user.image ? (
                    <Image
                        source={{ uri: user.image }}
                        className="w-7 h-7 rounded-full border-2 border-white/30"
                    />
                ) : (
                    <DefaultAvatar />
                )}
                <Text className="text-white text-xs font-plus-jakarta-600 flex-1" numberOfLines={1}>
                    {user.username || user.name || 'Anonymous'}
                </Text>
            </View>

            {/* XP */}
            <View className="ml-2 bg-slate-900/60 rounded-full px-3 py-1 border border-green-400/50">
                <Text className="text-green-400 font-plus-jakarta-700 text-sm">
                    {shortenXp(xp)} XP
                </Text>
            </View>
        </View>
    );
}

// User position card component
function UserPositionCard({
    user,
    rank,
    xp,
    isMonthly,
}: {
    user: any;
    rank: number | null;
    xp: number;
    isMonthly: boolean;
}) {
    if (rank === null) {
        return (
            <View className={`${isMonthly ? 'bg-blue-500/25 border-blue-500' : 'bg-purple-500/25 border-purple-500'} border rounded-lg p-4 items-center`}>
                <Text className="text-2xl mb-2">📊</Text>
                <Text className="text-white font-plus-jakarta-600">
                    {isMonthly ? 'No data for this month' : 'No ranking data'}
                </Text>
                <Text className="text-gray-400 text-sm mt-1">Start climbing to appear on the leaderboard!</Text>
            </View>
        );
    }

    const medal = getMedalIcon(rank);
    const style = getRowStyle(rank, isMonthly);

    return (
        <View
            className={`flex-row items-center ${style.bg} border-2 ${style.border} rounded-lg px-3 py-3`}
        >
            {/* Rank */}
            <View className="w-14 flex-row items-center gap-1">
                {medal && <Text className="text-2xl">{medal}</Text>}
                <Text className={`font-plus-jakarta-700 ${style.rankColor}`}>#{rank + 1}</Text>
            </View>

            {/* User info */}
            <View className="flex-1 flex-row items-center bg-slate-900/60 rounded-full px-2 py-1.5 gap-2">
                <LevelIndicator xp={user.totalXp || 0} size="xs" />
                {user.image ? (
                    <Image
                        source={{ uri: user.image }}
                        className="w-7 h-7 rounded-full border-2 border-white/30"
                    />
                ) : (
                    <DefaultAvatar />
                )}
                <Text className="text-white text-xs font-plus-jakarta-600 flex-1" numberOfLines={1}>
                    {user.username || user.name || 'You'}
                </Text>
            </View>

            {/* XP */}
            <View className="ml-2 bg-slate-900/60 rounded-full px-3 py-1 border border-green-400/50">
                <Text className="text-green-400 font-plus-jakarta-700 text-sm">
                    {shortenXp(xp)} XP
                </Text>
            </View>
        </View>
    );
}

export default function LeaderboardScreen() {
    const { user } = useAuth();
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMonthly, setIsMonthly] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLeaderboard = useCallback(async () => {
        try {
            setError(null);
            const response = await api.getLeaderboard();
            setData(response);
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
            setError('Failed to load leaderboard');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    // Get current list based on mode
    const currentList = isMonthly ? data?.monthly || [] : data?.total || [];
    const displayList = showAll ? currentList : currentList.slice(0, 10);
    const userRank = isMonthly ? data?.userMonthlyRank : data?.userTotalRank;

    // Get user's XP for position card
    const getUserXp = () => {
        if (!user || userRank === null || userRank === undefined) return 0;
        if (isMonthly) {
            const entry = data?.monthly.find(m => m.user.id === user.id);
            return entry?.xp || 0;
        }
        const entry = data?.total.find(t => t.id === user.id);
        return entry?.totalXp || 0;
    };

    if (isLoading) {
        return (
            <SafeScreen className="bg-black justify-center items-center">
                <ActivityIndicator size="large" color="#fff" />
                <Text className="text-white mt-4 font-plus-jakarta">Loading leaderboard...</Text>
            </SafeScreen>
        );
    }

    if (error) {
        return (
            <SafeScreen className="bg-black justify-center items-center p-6">
                <Text className="text-red-500 text-lg mb-4 font-plus-jakarta-600">{error}</Text>
                <TouchableOpacity
                    onPress={fetchLeaderboard}
                    className="bg-blue-500/25 border border-blue-500 rounded-lg px-4 py-2"
                >
                    <Text className="text-white font-plus-jakarta-600">Try Again</Text>
                </TouchableOpacity>
            </SafeScreen>
        );
    }

    return (
        <SafeScreen className="bg-black">
            <ScrollView
                className="flex-1"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                }
            >
                <View className="p-4">
                    {/* Header */}
                    <View className="flex-row items-end justify-between mb-4">
                        <View>
                            <Text className="text-white text-3xl font-plus-jakarta-700 italic">
                                Leaderboard
                            </Text>
                            <View className="h-1 bg-white rounded-full mt-1" />
                        </View>
                        <Svg viewBox="0 0 256 256" className="w-10 h-10" fill="white">
                            <Path d="M112.41,102.53a8,8,0,0,1,5.06-10.12l12-4A8,8,0,0,1,140,96v40a8,8,0,0,1-16,0V107.1l-1.47.49A8,8,0,0,1,112.41,102.53ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16h8V104A16,16,0,0,1,40,88H80V56A16,16,0,0,1,96,40h64a16,16,0,0,1,16,16v72h40a16,16,0,0,1,16,16v56h8A8,8,0,0,1,248,208Zm-72-64v56h40V144ZM96,200h64V56H96Zm-56,0H80V104H40Z" />
                        </Svg>
                    </View>

                    {/* User Position Section */}
                    <View className="mb-6">
                        <Text className="text-white text-lg font-plus-jakarta-600 mb-2">
                            Your Position{' '}
                            <Text className="text-gray-400 text-sm">
                                ({isMonthly ? 'monthly' : 'total'})
                            </Text>
                        </Text>
                        <UserPositionCard
                            user={user}
                            rank={userRank ?? null}
                            xp={getUserXp()}
                            isMonthly={isMonthly}
                        />
                    </View>

                    {/* Toggle and Title */}
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-white text-xl font-plus-jakarta-700">
                            {isMonthly ? `${data?.currentMonth || 'Monthly'}. XP` : 'Total XP'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                setIsMonthly(!isMonthly);
                                setShowAll(false);
                            }}
                            className={`px-4 py-2 rounded-full ${isMonthly
                                ? 'bg-blue-500/35 border border-blue-500'
                                : 'bg-purple-500/35 border border-purple-500'
                                }`}
                        >
                            <Text className="text-white font-plus-jakarta-600">
                                {isMonthly ? 'Monthly' : 'Total'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Leaderboard List */}
                    {currentList.length === 0 ? (
                        <View className="items-center py-8">
                            <Text className="text-2xl mb-2">📊</Text>
                            <Text className="text-white font-plus-jakarta-600">No data available</Text>
                            <Text className="text-gray-400 text-sm mt-1">
                                Start climbing to appear on the leaderboard!
                            </Text>
                        </View>
                    ) : (
                        <View className="gap-3">
                            {displayList.map((entry, index) => {
                                const entryUser = isMonthly
                                    ? (entry as MonthlyEntry).user
                                    : (entry as LeaderboardUser);
                                const entryXp = isMonthly
                                    ? (entry as MonthlyEntry).xp
                                    : (entry as LeaderboardUser).totalXp;

                                return (
                                    <LeaderboardRow
                                        key={entryUser.id}
                                        user={entryUser}
                                        xp={entryXp}
                                        index={index}
                                        isMonthly={isMonthly}
                                    />
                                );
                            })}

                            {/* Show More/Less Button */}
                            {currentList.length > 10 && (
                                <TouchableOpacity
                                    onPress={() => setShowAll(!showAll)}
                                    className={`mt-2 p-3 rounded-lg ${isMonthly
                                        ? 'bg-blue-500/25 border border-blue-500'
                                        : 'bg-purple-500/25 border border-purple-500'
                                        }`}
                                >
                                    <Text className="text-white text-center font-plus-jakarta-600">
                                        {showAll ? 'Show Less' : `Show All (${currentList.length})`}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeScreen>
    );
}

