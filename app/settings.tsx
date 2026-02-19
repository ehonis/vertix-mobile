import EditProfileForm from '@/components/EditProfileForm';
import SafeScreen from '@/components/SafeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/signin');
  };

  if (!user) {
    return (
      <SafeScreen
        className="justify-center items-center bg-black"
        edges={['top', 'bottom']}
      >
        <Text className="text-white text-lg font-plus-jakarta">
          No user data available
        </Text>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="bg-black" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="px-5 pt-2 pb-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 items-center py-1"
            >
              <Svg
                width={28}
                height={28}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M19 12H5M12 19l-7-7 7-7" />
              </Svg>
            </TouchableOpacity>
            <Text className="font-plus-jakarta italic font-bold text-white text-3xl flex-1 text-center">
              Settings
            </Text>
            <View className="w-10 items-center">
              <Svg
                width={40}
                height={40}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                <Path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </Svg>
            </View>
          </View>
          <View className="h-1 bg-white rounded-full mb-4" />

          <EditProfileForm />

          {/* Sign Out */}
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-red-600 rounded-xl py-4 px-6 items-center"
          >
            <Text className="text-white text-base font-plus-jakarta-600">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
