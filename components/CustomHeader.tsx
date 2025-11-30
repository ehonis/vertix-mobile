import { useAuth } from '@/contexts/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

export default function CustomHeader() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <View className="bg-black border-b border-slate-800 pt-14 pb-3 flex-row items-center justify-between px-4">
      {/* Logo on the left */}
      <View className="flex-row items-center">
        <Text className="text-white text-4xl font-jost-700-bold">Vertix</Text>
      </View>

      {/* Profile icon on the right */}
      <Pressable
        onPress={() => router.push('/profile')}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
        className="-mt-3"
      >
        {user?.image ? (
          <Image
            source={{ uri: user.image }}
            className="w-10 h-10 rounded-full border border-slate-600"
          />
        ) : (
          <View className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 items-center justify-center">
            <FontAwesome name="user" size={16} color="#fff" />
          </View>
        )}
      </Pressable>
    </View>
  );
}
