import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';

import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import Svg, { Path } from 'react-native-svg';

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
          backgroundColor: "#0a0f1a",
          borderTopColor: '#1f2937',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 0,
          paddingTop: 10,
        },

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
              stroke={focused ? Colors.tint : color}
              viewBox="0 0 24 24"
              width={40}
              height={40}
              strokeWidth={focused ? 2 : 1.5}
              className="size-8"
            >
              <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
              />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Svg
              stroke={focused ? Colors.tint : color}
              viewBox="0 0 24 24"
              width={32}
              height={32}
              strokeWidth={focused ? 2 : 1.5}
              className="size-2"
            >
              <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
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
              width={32}
              height={32}
              className="size-6"
            >
              <Path d="M112.41,102.53a8,8,0,0,1,5.06-10.12l12-4A8,8,0,0,1,140,96v40a8,8,0,0,1-16,0V107.1l-1.47.49A8,8,0,0,1,112.41,102.53ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16h8V104A16,16,0,0,1,40,88H80V56A16,16,0,0,1,96,40h64a16,16,0,0,1,16,16v72h40a16,16,0,0,1,16,16v56h8A8,8,0,0,1,248,208Zm-72-64v56h40V144ZM96,200h64V56H96Zm-56,0H80V104H40Z" />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name="user"
              size={32}
              color={focused ? Colors.tint : color}
            />
          ),
        }}
      />
      <Tabs.Screen
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
              width={32}
              height={32}
            >
              <Path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </Svg>
          ),
        }}
      />
      {/* <Tabs.Screen
        name="testing"
        options={{
          title: 'Testing',
          tabBarIcon: ({ color, focused }) => (
            <Svg
              stroke={focused ? Colors.tint : color}
              viewBox="0 0 24 24"
              strokeWidth={focused ? 2 : 1.5}
              className="size-6"
            >
              <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23.693L4.2 15.3m15.6 0A2.25 2.25 0 0 1 21.75 17.25v1.5a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25v-1.5a2.25 2.25 0 0 1 1.95-2.231"
              />
            </Svg>
          ),
        }}
      /> */}
    </Tabs>
  );
}
