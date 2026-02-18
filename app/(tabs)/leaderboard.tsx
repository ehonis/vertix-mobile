import SafeScreen from '@/components/SafeScreen';
import UserProfilePopup, { UserProfilePopupInitialData } from '@/components/UserProfilePopup';
import { useAuth } from '@/contexts/AuthContext';
import { useXp } from '@/contexts/XpContext';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Leaderboard category (future-ready: only XP wired to API)
export type LeaderboardCategoryId = 'xp' | 'highest_grade' | 'most_sends' | 'flash_count' | 'projects_completed';

const LEADERBOARD_CATEGORIES: { id: LeaderboardCategoryId; label: string }[] = [
    { id: 'xp', label: 'XP' },
    { id: 'highest_grade', label: 'Highest grade' },
    { id: 'most_sends', label: 'Most Sends' },

];

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
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
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

// Default avatar SVG component (size for list vs podium)
function DefaultAvatar({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-7 h-7',
        md: 'w-12 h-12',
        lg: 'w-24 h-24',
    };
    const iconClasses = {
        sm: 'w-5 h-5',
        md: 'w-7 h-7',
        lg: 'w-12 h-12',
    };
    return (
        <View className={cn('rounded-full bg-gray-700 items-center justify-center', sizeClasses[size])}>
            <Svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={1.5}
                className={iconClasses[size]}
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
    // Regular rows: blue for monthly, purple for yearly
    return isMonthly
        ? { bg: 'bg-blue-500/25', border: 'border-blue-500', rankColor: 'text-blue-300' }
        : { bg: 'bg-purple-500/25', border: 'border-purple-500', rankColor: 'text-purple-300' };
}

// Podium slot shape: 2nd left, 1st center (elevated), 3rd right
const PODIUM_ORDER: [number, number, number] = [1, 0, 2]; // display indices for 2nd, 1st, 3rd

function PodiumBlock({
    topThree,
    isMonthly,
    onPressUser,
}: {
    topThree: { user: LeaderboardUser; value: number }[];
    isMonthly: boolean;
    onPressUser?: (user: LeaderboardUser) => void;
}) {
    if (topThree.length === 0) return null;

    const slots = PODIUM_ORDER.map((entryIndex) => {
        const entry = topThree[entryIndex];
        if (!entry) return null;
        const rank = (entryIndex + 1) as 1 | 2 | 3; // 1st=1, 2nd=2, 3rd=3
        return { rank, user: entry.user, value: entry.value };
    }).filter(Boolean) as { rank: 1 | 2 | 3; user: LeaderboardUser; value: number }[];

    const podiumStyles: Record<1 | 2 | 3, { bg: string; border: string; medal: string }> = {
        1: { bg: 'bg-amber-500/90', border: 'border-amber-400', medal: '🥇' },
        2: { bg: 'bg-slate-400/90', border: 'border-slate-300', medal: '🥈' },
        3: { bg: 'bg-amber-700/90', border: 'border-amber-600', medal: '🥉' },
    };

    return (
        <View className="flex-row items-end justify-center gap-1 mb-4">
            {slots.map(({ rank, user, value }) => {
                const style = podiumStyles[rank];
                const isFirst = rank === 1;
                const isSecond = rank === 2;
                const isThird = rank === 3;
                const SlotWrapper = onPressUser ? Pressable : View;
                return (
                    <SlotWrapper
                        key={user.id}
                        onPress={onPressUser ? () => onPressUser(user) : undefined}
                        className={cn(
                            'flex-1 items-center rounded-xl border-2 pb-3 pt-4',
                            style.bg,
                            style.border,
                            isFirst && '-mt-6'

                        )}
                    >
                        <Text className={"text-3xl mb-1"}>{style.medal}</Text>
                        {user.image ? (
                            <Image
                                source={{ uri: user.image }}
                                className={cn(
                                    'rounded-full border-2 border-white/40',
                                    isFirst && 'w-24 h-24',
                                    isSecond && 'w-16 h-16',
                                    isThird && 'w-12 h-12'
                                )}
                            />
                        ) : (
                            <DefaultAvatar size={isFirst ? 'lg' : 'md'} />
                        )}
                        <Text
                            className="text-white font-plus-jakarta-700 mt-2 text-center text-sm px-1"
                            numberOfLines={1}
                        >
                            {user.username || user.name || 'Anonymous'}
                        </Text>
                        <View className="mt-1 bg-slate-900/70 rounded-full px-2 py-0.5 border border-green-400/50">
                            <Text className="text-green-400 font-plus-jakarta-700 text-xs">
                                {shortenXp(value)} XP
                            </Text>
                        </View>
                    </SlotWrapper>
                );
            })}
        </View>
    );
}

// Leaderboard row component
function LeaderboardRow({
    user,
    xp,
    index,
    isMonthly,
    onPressUser,
}: {
    user: LeaderboardUser;
    xp: number;
    index: number;
    isMonthly: boolean;
    onPressUser?: (user: LeaderboardUser) => void;
}) {
    const medal = getMedalIcon(index);
    const style = getRowStyle(index, isMonthly);
    const Wrapper = onPressUser ? Pressable : View;

    return (
        <Wrapper
            onPress={onPressUser ? () => onPressUser(user) : undefined}
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
                <LevelIndicator xp={user.totalXp} size="sm" />
                {user.image ? (
                    <Image
                        source={{ uri: user.image }}
                        className="w-9 h-9 rounded-full border-2 border-white/30"
                    />
                ) : (
                    <DefaultAvatar size="sm" />
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
        </Wrapper>
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
                    {isMonthly ? 'No data for this month' : 'No data for this year'}
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
                {medal ? <Text className="text-3xl">{medal}</Text> : <Text className={`font-plus-jakarta-700 ${style.rankColor}`}>#{rank + 1}</Text>}
            </View>

            {/* User info */}
            <View className="flex-1 flex-row items-center bg-slate-900/60 rounded-full px-2 py-1.5 gap-2">
                <LevelIndicator xp={user.totalXp || 0} size="sm" />
                {user.image ? (
                    <Image
                        source={{ uri: user.image }}
                        className="w-8 h-8 rounded-full border-2 border-white/30"
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
    const [category, setCategory] = useState<LeaderboardCategoryId>('xp');
    const [isMonthly, setIsMonthly] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [profileUserId, setProfileUserId] = useState<string | null>(null);
    const [profileInitialData, setProfileInitialData] = useState<UserProfilePopupInitialData | null>(null);

    const openUserProfile = useCallback((u: LeaderboardUser) => {
        setProfileUserId(u.id);
        setProfileInitialData({
            username: u.username,
            image: u.image,
            totalXp: u.totalXp,
        });
    }, []);
    const closeUserProfile = useCallback(() => {
        setProfileUserId(null);
        setProfileInitialData(null);
    }, []);

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

    // Get current list based on mode (monthly vs yearly)
    const currentList = isMonthly ? data?.monthly || [] : data?.total || [];
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

                        </View>
                        <Svg viewBox="0 0 256 256" className="w-10 h-10" fill="white">
                            <Path d="M112.41,102.53a8,8,0,0,1,5.06-10.12l12-4A8,8,0,0,1,140,96v40a8,8,0,0,1-16,0V107.1l-1.47.49A8,8,0,0,1,112.41,102.53ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16h8V104A16,16,0,0,1,40,88H80V56A16,16,0,0,1,96,40h64a16,16,0,0,1,16,16v72h40a16,16,0,0,1,16,16v56h8A8,8,0,0,1,248,208Zm-72-64v56h40V144ZM96,200h64V56H96Zm-56,0H80V104H40Z" />
                        </Svg>
                    </View>

                    {/* Category selector */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mb-4 -mx-4 px-4"
                        contentContainerStyle={{ gap: 8 }}
                    >
                        {LEADERBOARD_CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setCategory(cat.id)}
                                className={cn(
                                    'px-4 py-2.5 rounded-full border',
                                    category === cat.id
                                        ? 'bg-white/15 border-white/50'
                                        : 'bg-white/5 border-white/20'
                                )}
                            >
                                <Text
                                    className={cn(
                                        'font-plus-jakarta-600 text-sm',
                                        category === cat.id ? 'text-white' : 'text-gray-400'
                                    )}
                                >
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* User Position Section (only for XP) */}
                    {category === 'xp' && (
                        <View className="mb-6">
                            <Text className="text-white text-lg font-plus-jakarta-600 mb-2">
                                Your Position{' '}
                                <Text className="text-gray-400 text-sm">
                                    ({isMonthly ? 'monthly' : 'yearly'})
                                </Text>
                            </Text>
                            <UserPositionCard
                                user={user}
                                rank={userRank ?? null}
                                xp={getUserXp()}
                                isMonthly={isMonthly}
                            />
                        </View>
                    )}

                    {/* Non-XP: Coming soon */}
                    {category !== 'xp' && (
                        <View className="items-center py-12 px-4">
                            <Text className="text-4xl mb-3">🏔️</Text>
                            <Text className="text-white font-plus-jakarta-600 text-lg text-center">
                                Coming soon
                            </Text>
                            <Text className="text-gray-400 text-sm mt-2 text-center">
                                This leaderboard category is not available yet. Check back later.
                            </Text>
                        </View>
                    )}

                    {/* XP: Timeframe toggle and leaderboard */}
                    {category === 'xp' && (
                        <>
                            <View className="flex-row items-center justify-between mb-10">
                                <Text className="text-white text-xl font-plus-jakarta-700">
                                    {isMonthly
                                        ? `${data?.currentMonth || 'Monthly'}. XP`
                                        : `${new Date().getFullYear()} XP`}
                                </Text>
                                <View className="flex-row rounded-full bg-white/10 p-0.5">
                                    <TouchableOpacity
                                        onPress={() => {
                                            setIsMonthly(true);
                                            setShowAll(false);
                                        }}
                                        className={cn(
                                            'px-4 py-2 rounded-full',
                                            isMonthly && 'bg-blue-500/50 border border-blue-500'
                                        )}
                                    >
                                        <Text
                                            className={cn(
                                                'font-plus-jakarta-600 text-sm',
                                                isMonthly ? 'text-white' : 'text-gray-400'
                                            )}
                                        >
                                            Monthly
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setIsMonthly(false);
                                            setShowAll(false);
                                        }}
                                        className={cn(
                                            'px-4 py-2 rounded-full',
                                            !isMonthly && 'bg-purple-500/50 border border-purple-500'
                                        )}
                                    >
                                        <Text
                                            className={cn(
                                                'font-plus-jakarta-600 text-sm',
                                                !isMonthly ? 'text-white' : 'text-gray-400'
                                            )}
                                        >
                                            Yearly
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Podium (top 3) + List (4+) */}
                            {currentList.length === 0 ? (
                                <View className="items-center py-8">
                                    <Text className="text-2xl mb-2">📊</Text>
                                    <Text className="text-white font-plus-jakarta-600">No data available</Text>
                                    <Text className="text-gray-400 text-sm mt-1">
                                        Start climbing to appear on the leaderboard!
                                    </Text>
                                </View>
                            ) : (
                                <View>
                                    {currentList.length >= 3 && (
                                        <PodiumBlock
                                            onPressUser={openUserProfile}
                                            topThree={[
                                                {
                                                    user: isMonthly
                                                        ? (currentList[0] as MonthlyEntry).user
                                                        : (currentList[0] as LeaderboardUser),
                                                    value: isMonthly
                                                        ? (currentList[0] as MonthlyEntry).xp
                                                        : (currentList[0] as LeaderboardUser).totalXp,
                                                },
                                                {
                                                    user: isMonthly
                                                        ? (currentList[1] as MonthlyEntry).user
                                                        : (currentList[1] as LeaderboardUser),
                                                    value: isMonthly
                                                        ? (currentList[1] as MonthlyEntry).xp
                                                        : (currentList[1] as LeaderboardUser).totalXp,
                                                },
                                                {
                                                    user: isMonthly
                                                        ? (currentList[2] as MonthlyEntry).user
                                                        : (currentList[2] as LeaderboardUser),
                                                    value: isMonthly
                                                        ? (currentList[2] as MonthlyEntry).xp
                                                        : (currentList[2] as LeaderboardUser).totalXp,
                                                },
                                            ]}
                                            isMonthly={isMonthly}
                                        />
                                    )}
                                    {currentList.length < 3 && currentList.length > 0 && (
                                        <View className="gap-3 mb-4">
                                            {currentList.map((entry, index) => {
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
                                                        onPressUser={openUserProfile}
                                                    />
                                                );
                                            })}
                                        </View>
                                    )}
                                    {currentList.length >= 3 && (
                                        <View className="gap-3">
                                            {(showAll ? currentList.slice(3) : currentList.slice(3, 10)).map(
                                                (entry, index) => {
                                                    const actualIndex = index + 3;
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
                                                            index={actualIndex}
                                                            isMonthly={isMonthly}
                                                            onPressUser={openUserProfile}
                                                        />
                                                    );
                                                }
                                            )}
                                            {currentList.length > 10 && (
                                                <TouchableOpacity
                                                    onPress={() => setShowAll(!showAll)}
                                                    className={cn(
                                                        'mt-2 p-3 rounded-lg',
                                                        isMonthly
                                                            ? 'bg-blue-500/25 border border-blue-500'
                                                            : 'bg-purple-500/25 border border-purple-500'
                                                    )}
                                                >
                                                    <Text className="text-white text-center font-plus-jakarta-600">
                                                        {showAll
                                                            ? 'Show Less'
                                                            : `Show All (${currentList.length})`}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
            {profileUserId && (
                <UserProfilePopup
                    userId={profileUserId}
                    initialData={profileInitialData ?? undefined}
                    onClose={closeUserProfile}
                />
            )}
        </SafeScreen>
    );
}

