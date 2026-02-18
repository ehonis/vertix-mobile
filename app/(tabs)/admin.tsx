import SafeScreen from '@/components/SafeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function AdminScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdminOrRouteSetter =
    user?.role === 'ADMIN' || user?.role === 'ROUTE_SETTER';

  useEffect(() => {
    if (!isAdminOrRouteSetter) {
      router.replace('/(tabs)');
    }
  }, [isAdminOrRouteSetter, router]);

  if (!isAdminOrRouteSetter) {
    return null;
  }

  return (
    <SafeScreen className="bg-black">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-5"
      >
        <View className="flex-row items-center justify-between w-full mb-3">
          <Text className="text-white text-2xl font-plus-jakarta-700">
            Admin Center
          </Text>
          <Svg
            stroke={'white'}
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            width={42}
            height={42}
          >
            <Path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </Svg>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/route-manager')}
          activeOpacity={0.7}
          className="flex-row bg-slate-900 rounded-xl p-6 items-center justify-between w-full"
        >

          <Text className="text-white font-plus-jakarta-700 text-xl ">
            Route Manager
          </Text>
          <Svg
            fill="none"
            width={32}
            height={32}
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="white"
            className="size-6"

          >
            <Path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </Svg>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
}
