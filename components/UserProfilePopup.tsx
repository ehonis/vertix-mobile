import { useXp } from '@/contexts/XpContext';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

export interface UserProfilePopupInitialData {
  username: string | null;
  image: string | null;
  totalXp: number;
}

export interface UserProfilePopupProps {
  userId: string;
  initialData?: UserProfilePopupInitialData;
  onClose: () => void;
}

function DefaultAvatar({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  const sizeClasses = { md: 'w-16 h-16', lg: 'w-24 h-24' };
  const iconClasses = { md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <View className={cn('rounded-full bg-gray-700 items-center justify-center', sizeClasses[size])}>
      <Svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className={iconClasses[size]}>
        <Path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
      </Svg>
    </View>
  );
}

function LevelBadge({ xp }: { xp: number }) {
  const { getLevelForXp } = useXp();
  const level = getLevelForXp(xp);
  const colorClasses: Record<string, { border: string; text: string }> = {
    high: { border: 'border-red-400', text: 'text-red-400' },
    mid: { border: 'border-yellow-400', text: 'text-yellow-400' },
    low: { border: 'border-orange-400', text: 'text-orange-400' },
    green: { border: 'border-green-400', text: 'text-green-400' },
    blue: { border: 'border-blue-400', text: 'text-blue-400' },
  };
  const tier = level >= 50 ? 'high' : level >= 30 ? 'mid' : level >= 20 ? 'low' : level >= 10 ? 'green' : 'blue';
  const { border, text } = colorClasses[tier];
  return (
    <View className={cn('w-10 h-10 rounded-full border-2 bg-gray-900/90 items-center justify-center', border)}>
      <Text className={cn('font-plus-jakarta-700 text-lg', text)}>{level}</Text>
    </View>
  );
}

export default function UserProfilePopup({ userId, initialData, onClose }: UserProfilePopupProps) {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof api.getPublicUserProfile>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPublicUserProfile(userId);
      setProfile(data);
    } catch (err) {
      console.error('UserProfilePopup fetch error:', err);
      setError('Could not load profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const displayName = profile?.username ?? initialData?.username ?? 'Anonymous';
  const displayImage = profile?.image ?? initialData?.image ?? null;
  const displayXp = profile?.totalXp ?? initialData?.totalXp ?? 0;

  const highestGrade = [profile?.highestBoulderGrade, profile?.highestRopeGrade]
    .filter(Boolean)
    .join(' / ') || '—';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
        <Pressable className="flex-1 items-center justify-center p-4" onPress={onClose}>
          <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-sm">
            <View className="bg-slate-900/95 rounded-2xl border border-slate-600 overflow-hidden">
              {/* Header with close */}
              <View className="flex-row items-center justify-end pr-3 pt-3">
                <TouchableOpacity onPress={onClose} hitSlop={12}>
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                    <Path d="M6 18L18 6M6 6l12 12" stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </TouchableOpacity>
              </View>

              {loading && !profile ? (
                <View className="items-center py-12">
                  <ActivityIndicator size="large" color="#fff" />
                  <Text className="text-gray-400 font-plus-jakarta mt-2">Loading profile...</Text>
                </View>
              ) : error && !profile ? (
                <View className="items-center py-12 px-4">
                  <Text className="text-red-400 font-plus-jakarta-600 text-center">{error}</Text>
                  <TouchableOpacity onPress={fetchProfile} className="mt-3 px-4 py-2 bg-slate-700 rounded-lg">
                    <Text className="text-white font-plus-jakarta-600">Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="px-6 pb-6 pt-0">
                  {/* Avatar + username + level */}
                  <View className="items-center mb-5">
                    <View className="relative">
                      {displayImage ? (
                        <Image source={{ uri: displayImage }} className="w-24 h-24 rounded-full border-2 border-slate-500" />
                      ) : (
                        <DefaultAvatar size="lg" />
                      )}
                      <View className="absolute -bottom-1 -right-1">
                        <LevelBadge xp={displayXp} />
                      </View>
                    </View>
                    <Text className="text-white font-plus-jakarta-700 text-lg mt-3" numberOfLines={1}>
                      {displayName}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <Text className="text-green-400 font-plus-jakarta-600 text-sm">{displayXp.toLocaleString()} XP</Text>
                    </View>
                  </View>

                  {/* Stats */}
                  <View className="gap-3">
                    <View className="bg-slate-800/80 rounded-xl px-4 py-3 border border-slate-600">
                      <Text className="text-gray-400 text-xs font-plus-jakarta mb-1">Highest grade</Text>
                      <Text className="text-white font-plus-jakarta-600">{highestGrade}</Text>
                    </View>
                    {profile && profile.last5Completions.length > 0 && (
                      <View className="bg-slate-800/80 rounded-xl px-4 py-3 border border-slate-600">
                        <Text className="text-gray-400 text-xs font-plus-jakarta mb-2">Last 5 sends</Text>
                        <View className="flex-col w-full flex-wrap gap-2">
                          {profile.last5Completions.map((c, i) => {

                            return (
                              <View
                                key={i}
                                className={cn(
                                  "bg-slate-700/80 border border-slate-500 rounded-md w-full px-3 py-1.5",
                                  c.color === "green" && "bg-green-400/25 border-green-400",
                                  c.color === "red" && "bg-red-400/25 border-red-400",
                                  c.color === "blue" && "bg-blue-400/25 border-blue-400",
                                  c.color === "yellow" && "bg-yellow-400/25 border-yellow-400",
                                  c.color === "purple" && "bg-purple-400/25 border-purple-400",
                                  c.color === "orange" && "bg-orange-400/25 border-orange-400",
                                  c.color === "white" && "bg-white/25 border-white",
                                  c.color === "black" && "bg-slate-900/25 border-white"
                                )}
                              >
                                <Text className="text-white font-plus-jakarta-600 text-sm font-bold">{c.title}</Text>
                                <Text className="text-white font-plus-jakarta-400 text-xs italic">{c.grade}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </BlurView>
    </Modal>
  );
}
