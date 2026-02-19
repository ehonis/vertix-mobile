import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

const isIOS = Platform.OS === 'ios';
const useGlassTabBar = isIOS && isGlassEffectAPIAvailable();
const useBlurTabBar = isIOS && !useGlassTabBar;
const useFrostedTabBar = useGlassTabBar || useBlurTabBar;

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={20} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { user } = useAuth();
  const isAdminOrRouteSetter =
    user?.role === 'ADMIN' || user?.role === 'ROUTE_SETTER';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tint,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: useFrostedTabBar ? 'transparent' : '#0a0f1a',
          borderTopColor: useFrostedTabBar ? 'transparent' : '#1f2937',
          borderTopWidth: useFrostedTabBar ? 0 : 1,
          height: 80,
          paddingBottom: 0,
          paddingTop: 14,
          ...(useFrostedTabBar && { position: 'absolute' as const }),
        },
        ...(useFrostedTabBar && {
          tabBarBackground: () =>
            useGlassTabBar ? (
              <GlassView
                style={StyleSheet.absoluteFill}
                glassEffectStyle="regular"
                tintColor="#0a0f1a"
              />
            ) : (
              <BlurView
                intensity={60}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            ),
        }),
        tabBarIconStyle: {
          marginBottom: 0, // No bottom margin on icon
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Routes',
          tabBarIcon: ({ color, focused }) => (
            <Svg
              width={42}
              height={42}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke={focused ? Colors.tint : color}
              className="size-6"

            >
              <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, focused }) => (
            <Svg
              fill={focused ? Colors.tint : color}
              viewBox="0 0 256 256"
              width={48}
              height={48}
              className="size-6"
            >
              <Path d="M112.41,102.53a8,8,0,0,1,5.06-10.12l12-4A8,8,0,0,1,140,96v40a8,8,0,0,1-16,0V107.1l-1.47.49A8,8,0,0,1,112.41,102.53ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16h8V104A16,16,0,0,1,40,88H80V56A16,16,0,0,1,96,40h64a16,16,0,0,1,16,16v72h40a16,16,0,0,1,16,16v56h8A8,8,0,0,1,248,208Zm-72-64v56h40V144ZM96,200h64V56H96Zm-56,0H80V104H40Z" />
            </Svg>
          ),
        }}
      />
      {isAdminOrRouteSetter && <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdminOrRouteSetter ? '/(tabs)/admin' : null,
          tabBarIcon: ({ color, focused }) => (
            <Svg
              stroke={focused ? Colors.tint : color}
              viewBox="0 0 24 24"
              strokeWidth={focused ? 2 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              width={42}
              height={42}
            >
              <Path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </Svg>
          ),
        }}
      />}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) =>
            user?.image ? (
              <View
                className="w-12 h-12 rounded-full overflow-hidden border-2"
                style={{ borderColor: focused ? Colors.tint : '#475569' }}
              >
                <Image
                  source={{ uri: user.image }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View className="w-9 h-9 rounded-full bg-slate-700 items-center justify-center">
                <Svg
                  width={22}
                  height={22}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={focused ? Colors.tint : color}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </Svg>
              </View>
            ),
        }}
      />



    </Tabs>
  );
}
