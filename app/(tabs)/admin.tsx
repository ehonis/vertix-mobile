import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';

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
    <ScrollView
      className="bg-black"
      contentContainerClassName="px-5 pt-5"
    >
      <Text className="text-white text-2xl font-barlow-700 mb-3">
        Admin Center
      </Text>

      <TouchableOpacity
        onPress={() => router.push('/route-manager')}
        activeOpacity={0.7}
        className="flex bg-slate-900 rounded-xl p-6 items-center"
      >

        <Text className="text-white font-barlow-700 text-xl ">
          Route Manager
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
