import { useAuth } from '@/contexts/AuthContext';
import { useXp } from '@/contexts/XpContext';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import {
  calculateCompletionXpForRoute,
  getBoulderGradeMapping,
  getGradeRange,
} from '@/utils/routes';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface RoutePopupProps {
  id: string;
  grade: string;
  name: string;
  color: string;
  completions: number;
  attempts: number;
  userGrade: string | null;
  communityGrade: string | null;
  xp: {
    xp: number;
    baseXp: number;
    xpExtrapolated: { type: string; xp: number }[];
  } | null;
  isArchived: boolean;
  bonusXp?: number;
  onCancel: () => void;
  onRouteCompleted?: () => void;
}

export default function RoutePopup({
  id,
  grade,
  name,
  color,
  completions,
  attempts,
  userGrade,
  communityGrade,
  xp,
  isArchived,
  bonusXp = 0,
  onCancel,
  onRouteCompleted,
}: RoutePopupProps) {
  const { user } = useAuth();
  const { gainXp } = useXp();
  const [isCompletionLoading, setIsCompletionLoading] = useState(false);
  const [isAttemptLoading, setIsAttemptLoading] = useState(false);
  const [isGradeLoading, setIsGradeLoading] = useState(false);
  const [isFrontendCompleted, setIsFrontendCompleted] = useState(false);
  const [frontendCompletions, setFrontendCompletions] = useState(
    completions || 0
  );
  const [frontendAttempts, setFrontendAttempts] = useState(attempts || 0);
  const [frontendCommunityGrade, setFrontendCommunityGrade] = useState(
    communityGrade || ''
  );
  const [selectedGrade, setSelectedGrade] = useState('');
  const [isXpExpanded, setIsXpExpanded] = useState(false);
  const [currentXp, setCurrentXp] = useState(xp);
  const [isToday, setIsToday] = useState(true);
  const [isFlash, setIsFlash] = useState(false);
  const [completionDate, setCompletionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);

  // Success animation states
  const [showCompleteSuccess, setShowCompleteSuccess] = useState(false);
  const [showAttemptSuccess, setShowAttemptSuccess] = useState(false);
  const [showGradeSuccess, setShowGradeSuccess] = useState(false);

  // Animation values
  const completeScale = useRef(new Animated.Value(0)).current;
  const completeOpacity = useRef(new Animated.Value(0)).current;
  const attemptScale = useRef(new Animated.Value(0)).current;
  const attemptOpacity = useRef(new Animated.Value(0)).current;
  const gradeScale = useRef(new Animated.Value(0)).current;
  const gradeOpacity = useRef(new Animated.Value(0)).current;

  // Modal fade animation
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.95)).current;

  // Fast fade-in animation on mount
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

  const FLASH_MODE_KEY = 'flash_mode_preference';

  const routeType = grade.startsWith('5') ? 'rope' : 'boulder';
  const gradeRange = getGradeRange(grade);
  const gradeMapped = grade.startsWith('v')
    ? getBoulderGradeMapping(grade)
    : grade;

  // Load flash mode preference from storage on mount
  useEffect(() => {
    const loadFlashMode = async () => {
      try {
        const storedFlashMode = await SecureStore.getItemAsync(FLASH_MODE_KEY);
        if (storedFlashMode !== null) {
          setIsFlash(storedFlashMode === 'true');
        }
      } catch (error) {
        console.error('Error loading flash mode preference:', error);
      }
    };
    loadFlashMode();
  }, []);

  // Save flash mode preference to storage when it changes
  const handleFlashModeToggle = async (newValue: boolean) => {
    setIsFlash(newValue);
    try {
      await SecureStore.setItemAsync(FLASH_MODE_KEY, newValue.toString());
    } catch (error) {
      console.error('Error saving flash mode preference:', error);
    }
  };

  useEffect(() => {
    setCurrentXp(xp);
  }, [xp]);

  // Sync frontend state with prop changes
  useEffect(() => {
    setFrontendCompletions(completions || 0);
    setIsFrontendCompleted((completions || 0) > 0);
  }, [completions]);

  useEffect(() => {
    setFrontendAttempts(attempts || 0);
  }, [attempts]);

  useEffect(() => {
    setFrontendCommunityGrade(communityGrade || '');
  }, [communityGrade]);

  const getRouteTileStyles = (routeColor: string) => {
    const colorMap: Record<string, { border: string }> = {
      green: { border: 'border-green-400' },
      red: { border: 'border-red-400' },
      blue: { border: 'border-blue-400' },
      yellow: { border: 'border-yellow-400' },
      purple: { border: 'border-purple-400' },
      orange: { border: 'border-orange-400' },
      white: { border: 'border-white' },
      black: { border: 'border-white' },
      pink: { border: 'border-pink-400' },
    };

    const styles = colorMap[routeColor.toLowerCase()] || {
      bg: 'bg-slate-800',
      border: 'border-slate-700',
    };

    return cn('rounded-lg p-3 border-2', styles.border);
  };

  const animateSuccess = (
    scale: Animated.Value,
    opacity: Animated.Value,
    setShow: (show: boolean) => void
  ) => {
    setShow(true);
    scale.setValue(0);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide after animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShow(false);
      });
    }, 1500);
  };

  const handleQuickComplete = async () => {
    if (!user) return;

    try {
      setIsCompletionLoading(true);
      const effectiveDate = isToday ? new Date() : completionDate;
      await api.completeRoute({
        userId: user.id,
        routeId: id,
        flash: isFlash,
        date: effectiveDate.toISOString(),
      });

      setIsFrontendCompleted(true);
      setFrontendCompletions((prev) => prev + 1);

      // Calculate and show XP notification
      if (!isArchived && currentXp && currentXp.xp > 0) {
        gainXp({
          totalXp: currentXp.xp,
          baseXp: currentXp.baseXp,
          xpExtrapolated: currentXp.xpExtrapolated,
        });
      }

      // Update XP calculation for next completion
      if (!isArchived && user) {
        const newXp = calculateCompletionXpForRoute({
          grade: grade,
          previousCompletions: frontendCompletions + 1,
          newHighestGrade: false,
          bonusXp: bonusXp || 0,
        });
        setCurrentXp(newXp);
      }

      // Show success animation
      animateSuccess(completeScale, completeOpacity, setShowCompleteSuccess);

      onRouteCompleted?.();
    } catch (error) {
      console.error('Error completing route:', error);
    } finally {
      setIsCompletionLoading(false);
    }
  };

  const handleRouteAttempt = async () => {
    if (!user) return;

    try {
      setIsAttemptLoading(true);
      await api.attemptRoute({
        userId: user.id,
        routeId: id,
      });
      setFrontendAttempts((prev) => prev + 1);

      // Show success animation
      animateSuccess(attemptScale, attemptOpacity, setShowAttemptSuccess);
    } catch (error) {
      console.error('Error attempting route:', error);
    } finally {
      setIsAttemptLoading(false);
    }
  };

  const handleGradeSubmission = async () => {
    if (!user || !selectedGrade) return;

    try {
      setIsGradeLoading(true);
      const response = await api.gradeRoute({
        userId: user.id,
        routeId: id,
        selectedGrade: selectedGrade,
      });

      // Check if the response indicates success
      if (response?.status === 200 || response?.data?.status === 200) {
        setFrontendCommunityGrade(selectedGrade);
        setSelectedGrade('');
        setShowGradeDropdown(false);

        // Show success animation
        animateSuccess(gradeScale, gradeOpacity, setShowGradeSuccess);
      } else {
        console.error('Error grading route: Unexpected response', response);
      }
    } catch (error) {
      console.error('Error grading route:', error);
    } finally {
      setIsGradeLoading(false);
    }
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: modalOpacity, transform: [{ scale: modalScale }] },
        ]}
      >
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
          <Pressable
            className="flex-1 items-center justify-center p-4"
            onPress={onCancel}
          >
            {/* XP Section */}
            {!isArchived && currentXp && (
              <Pressable
                onPress={() => setIsXpExpanded(!isXpExpanded)}
                className={cn(
                  'bg-black/50 border rounded-full px-3 py-1 mb-2',
                  isXpExpanded ? 'rounded-lg' : 'rounded-full',
                  'border-green-400'
                )}
              >
                <View className="flex-row items-center gap-2">
                  <Text className="text-green-400 text-xl font-plus-jakarta-700 italic">
                    {currentXp.xp}xp
                  </Text>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d={isXpExpanded ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>

                {isXpExpanded && (
                  <View className="mt-2 gap-1">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-300 text-xs font-plus-jakarta">
                        Base XP:
                      </Text>
                      <Text className="text-green-400 text-xs font-plus-jakarta-700">
                        {currentXp.baseXp} XP
                      </Text>
                    </View>
                    {currentXp.xpExtrapolated.map((extrapolated) => (
                      <View
                        key={extrapolated.type}
                        className="flex-row justify-between"
                      >
                        <Text className="text-gray-300 text-xs font-plus-jakarta">
                          {extrapolated.type}:
                        </Text>
                        <Text
                          className={cn(
                            'text-xs font-plus-jakarta-700',
                            extrapolated.xp > 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          )}
                        >
                          {extrapolated.xp > 0 ? '+' : ''}
                          {extrapolated.xp} XP
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            )}

            {/* Route Info Card */}
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className={cn(
                'bg-slate-900/90 p-6 rounded-lg w-full max-w-sm border-2',
                getRouteTileStyles(color)
              )}
            >
              {/* Close Button */}
              <TouchableOpacity
                onPress={onCancel}
                className="absolute top-4 right-4 z-10"
              >
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

              {/* Route Header */}
              <View className="flex-row gap-3 items-center mb-6">
                {(frontendCompletions > 0 || isFrontendCompleted) && (
                  <View className="bg-green-400 rounded-full w-10 h-10 items-center justify-center">
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M4.5 12.75l6 6 9-13.5"
                        stroke="#000"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                )}
                <View className="flex-1">
                  <Text
                    className="text-white text-3xl font-plus-jakarta-700"
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  <Text className="text-gray-300 text-xl italic font-plus-jakarta">
                    {gradeMapped}
                  </Text>
                  {grade.toLowerCase() !== 'vfeature' &&
                    grade.toLowerCase() !== '5.feature' && (
                      <Text className="text-gray-400 text-sm font-plus-jakarta mt-1">
                        Community Grade:{' '}
                        <Text className="font-plus-jakarta-700">
                          {frontendCommunityGrade === 'none' ||
                            !frontendCommunityGrade
                            ? 'N/A'
                            : frontendCommunityGrade}
                        </Text>
                      </Text>
                    )}
                </View>
              </View>

              {!user ? (
                <View className="items-center gap-4">
                  <Text className="text-white text-lg text-center font-plus-jakarta">
                    To complete or attempt this route you must be signed in
                  </Text>
                </View>
              ) : (
                <ScrollView className="max-h-96">
                  <View className="gap-4">
                    {/* Complete and Attempt Buttons */}
                    <View className="flex-row justify-between gap-4">
                      <View className="flex-1 items-center gap-2">
                        <TouchableOpacity
                          onPress={handleRouteAttempt}
                          disabled={isAttemptLoading}
                          className="bg-gray-400/45 border border-gray-300 px-5 py-3 rounded-full relative overflow-hidden"
                        >
                          {isAttemptLoading ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <>
                              <Text
                                className="text-white text-xl font-plus-jakarta-600"
                                style={{ opacity: showAttemptSuccess ? 0 : 1 }}
                              >
                                Attempt
                              </Text>
                              {showAttemptSuccess && (
                                <Animated.View
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    transform: [{ scale: attemptScale }],
                                    opacity: attemptOpacity,
                                  }}
                                >
                                  <View className="bg-green-500 rounded-full p-2">
                                    <Svg
                                      width={24}
                                      height={24}
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <Path
                                        d="M4.5 12.75l6 6 9-13.5"
                                        stroke="#fff"
                                        strokeWidth={3}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </Svg>
                                  </View>
                                </Animated.View>
                              )}
                            </>
                          )}
                        </TouchableOpacity>
                        {frontendAttempts > 0 && (
                          <Text className="text-gray-400 text-sm font-plus-jakarta">
                            {frontendAttempts} attempt
                            {frontendAttempts !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </View>

                      <View className="flex-1 items-center gap-2">
                        <TouchableOpacity
                          onPress={handleQuickComplete}
                          disabled={isCompletionLoading}
                          className="bg-green-400/45 border border-green-400 px-5 py-3 rounded-full relative overflow-hidden"
                        >
                          {isCompletionLoading ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <>
                              <Text
                                className="text-white text-xl font-plus-jakarta-600"
                                style={{ opacity: showCompleteSuccess ? 0 : 1 }}
                              >
                                Complete
                              </Text>
                              {showCompleteSuccess && (
                                <Animated.View
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    transform: [{ scale: completeScale }],
                                    opacity: completeOpacity,
                                  }}
                                >
                                  <View className="bg-green-500 rounded-full p-2">
                                    <Svg
                                      width={24}
                                      height={24}
                                      viewBox="0 0 24 24"
                                      fill="none"
                                    >
                                      <Path
                                        d="M4.5 12.75l6 6 9-13.5"
                                        stroke="#fff"
                                        strokeWidth={3}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </Svg>
                                  </View>
                                </Animated.View>
                              )}
                            </>
                          )}
                        </TouchableOpacity>
                        {(frontendCompletions > 0 || isFrontendCompleted) && (
                          <Text className="text-gray-400 text-sm font-plus-jakarta">
                            {frontendCompletions} send
                            {frontendCompletions !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Grade Selection */}
                    {!userGrade &&
                      grade.toLowerCase() !== 'vfeature' &&
                      grade.toLowerCase() !== '5.feature' && (
                        <View className="items-center gap-3 mt-4">
                          <Text className="text-white text-lg font-plus-jakarta-600">
                            Grade it Yourself!
                          </Text>
                          <View className="w-full">
                            <TouchableOpacity
                              onPress={() =>
                                setShowGradeDropdown(!showGradeDropdown)
                              }
                              className={cn(
                                'w-full px-4 py-3 rounded-lg border flex-row items-center justify-between',
                                selectedGrade
                                  ? 'bg-green-500/20 border-green-400'
                                  : 'bg-gray-600/45 border-gray-300'
                              )}
                            >
                              <Text
                                className={cn(
                                  'font-plus-jakarta-600',
                                  selectedGrade
                                    ? 'text-green-400'
                                    : 'text-gray-400'
                                )}
                              >
                                {selectedGrade || 'Select a grade...'}
                              </Text>
                              <Svg
                                width={20}
                                height={20}
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <Path
                                  d={
                                    showGradeDropdown
                                      ? 'M5 15l7-7 7 7'
                                      : 'M19 9l-7 7-7-7'
                                  }
                                  stroke={selectedGrade ? '#22c55e' : '#9ca3af'}
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </Svg>
                            </TouchableOpacity>

                            {/* Dropdown Options */}
                            {showGradeDropdown && (
                              <View className="mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg max-h-48">
                                <ScrollView
                                  showsVerticalScrollIndicator={false}
                                  className="max-h-48"
                                >
                                  {gradeRange.map((gradeOption) => (
                                    <TouchableOpacity
                                      key={gradeOption}
                                      onPress={() => {
                                        setSelectedGrade(gradeOption);
                                        setShowGradeDropdown(false);
                                      }}
                                      className={cn(
                                        'px-4 py-3 border-b border-gray-700',
                                        selectedGrade === gradeOption
                                          ? 'bg-green-500/20'
                                          : 'bg-transparent'
                                      )}
                                    >
                                      <Text
                                        className={cn(
                                          'font-plus-jakarta-600',
                                          selectedGrade === gradeOption
                                            ? 'text-green-400'
                                            : 'text-white'
                                        )}
                                      >
                                        {gradeOption}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </View>
                            )}
                          </View>
                          {selectedGrade !== '' && !frontendCommunityGrade && (
                            <TouchableOpacity
                              onPress={handleGradeSubmission}
                              disabled={isGradeLoading}
                              className="bg-green-500 px-4 py-2 rounded-full relative overflow-hidden"
                            >
                              {isGradeLoading ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <>
                                  <Text
                                    className="text-white text-lg font-plus-jakarta-600"
                                    style={{ opacity: showGradeSuccess ? 0 : 1 }}
                                  >
                                    Submit
                                  </Text>
                                  {showGradeSuccess && (
                                    <Animated.View
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        transform: [{ scale: gradeScale }],
                                        opacity: gradeOpacity,
                                      }}
                                    >
                                      <View className="bg-green-600 rounded-full p-1.5">
                                        <Svg
                                          width={20}
                                          height={20}
                                          viewBox="0 0 24 24"
                                          fill="none"
                                        >
                                          <Path
                                            d="M4.5 12.75l6 6 9-13.5"
                                            stroke="#fff"
                                            strokeWidth={3}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </Svg>
                                      </View>
                                    </Animated.View>
                                  )}
                                </>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                    {userGrade && (
                      <View className="items-center mt-4">
                        <Text className="text-white text-center font-plus-jakarta">
                          You graded this climb a{' '}
                          <Text className="font-plus-jakarta-700">
                            {userGrade.toUpperCase()}
                          </Text>
                        </Text>
                      </View>
                    )}

                    {/* Options */}
                    <View className="mt-4">
                      <Text className="text-white text-lg font-plus-jakarta-600 mb-3">
                        Options
                      </Text>
                      <View className="bg-gray-600/45 border border-gray-300 p-4 rounded-lg gap-4">
                        {/* Today Toggle */}
                        <View className="flex-row items-center gap-3">
                          <TouchableOpacity
                            onPress={() => setIsToday(!isToday)}
                            className={cn(
                              'w-6 h-6 rounded-full items-center justify-center',
                              isToday
                                ? 'bg-green-400/45 border border-green-400'
                                : 'bg-gray-600'
                            )}
                          >
                            {isToday && (
                              <Svg
                                width={16}
                                height={16}
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <Path
                                  d="M4.5 12.75l6 6 9-13.5"
                                  stroke="#22c55e"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </Svg>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              if (!isToday) {
                                setShowDatePicker(true);
                              }
                            }}
                            disabled={isToday}
                            className="flex-1"
                          >
                            <Text className="text-white font-plus-jakarta">
                              Completion Date is{' '}
                              {isToday ? (
                                <Text className="text-green-400">Today</Text>
                              ) : (
                                <Text className="text-blue-400 underline">
                                  {completionDate.toLocaleDateString()}
                                </Text>
                              )}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Flash Toggle */}

                      </View>
                    </View>
                  </View>
                </ScrollView>
              )}
            </Pressable>
          </Pressable>

          {/* Date Picker */}
          {showDatePicker && !isToday && (
            <View className="bg-black rounded-lg p-4 flex items-center justify-center">
              <DateTimePicker
                value={completionDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor="#ffffff"
                themeVariant="dark"
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') {
                    setShowDatePicker(false);
                  }

                  if (event.type === 'set' && selectedDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const selected = new Date(selectedDate);
                    selected.setHours(0, 0, 0, 0);

                    // Prevent selecting future dates
                    if (selected > today) {
                      setCompletionDate(today);
                    } else {
                      setCompletionDate(selectedDate);
                    }
                  } else if (
                    event.type === 'dismissed' &&
                    Platform.OS === 'android'
                  ) {
                    setShowDatePicker(false);
                  }
                }}
                maximumDate={new Date()}
              />
            </View>
          )}

          {/* iOS Date Picker Dismiss Button */}
          {showDatePicker && Platform.OS === 'ios' && (
            <View className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-gray-700 p-4 px-8">
              <View className="flex-row justify-end gap-3">
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  className="px-6 py-2"
                >
                  <Text className="text-gray-400 font-plus-jakarta">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  className="px-6 py-2 bg-green-500 rounded-lg"
                >
                  <Text className="text-white font-plus-jakarta-600">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </BlurView>
      </Animated.View>
    </Modal>
  );
}
