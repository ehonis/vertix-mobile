import SafeScreen from '@/components/SafeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/signin');
  };

  if (!user) {
    return (
      <SafeScreen className="justify-center items-center bg-black">
        <Text className="text-white text-lg">No user data available</Text>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="bg-black">
      <ScrollView className="flex-1">
        <View className="flex-1 p-6">
          {/* Profile Header */}
          <View className="items-center mb-8">
            {user.image ? (
              <Image
                source={{ uri: user.image }}
                className="w-24 h-24 rounded-full mb-4 border-4 border-slate-800"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-purple-600 items-center justify-center mb-4 border-4 border-slate-800">
                <Text className="text-white text-4xl font-plus-jakarta-700">
                  {user.name?.[0]?.toUpperCase() ||
                    user.email[0]?.toUpperCase() ||
                    'U'}
                </Text>
              </View>
            )}
            <Text className="text-white text-2xl font-plus-jakarta-700 mb-1">
              {user.name || 'User'}
            </Text>
            {user.username && (
              <Text className="text-gray-400 text-base font-plus-jakarta">
                @{user.username}
              </Text>
            )}
          </View>

          {/* Settings */}
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            className="bg-gray-700/50 rounded-xl py-4 px-4 mb-2 flex-row items-center justify-between"
          >
            <Svg
              width={40}
              height={40}
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={1.0}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
              <Path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </Svg>
            <View className="flex-row items-center " >
              <Text className="text-white font-plus-jakarta text-lg">Edit profile</Text>
              <Svg

                width={24}
                height={24}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="white"
                className="size-6"

              >
                <Path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </Svg>
            </View>

          </TouchableOpacity>

          {/* User Information Card */}
          <View className="bg-slate-900 rounded-xl p-6 mb-6">
            <Text className="text-white text-lg font-plus-jakarta-600 mb-4">
              Profile Information
            </Text>

            <View className="mb-4">
              <Text className="text-gray-400 text-sm mb-1 font-plus-jakarta">
                Email
              </Text>
              <Text className="text-white text-base font-plus-jakarta">
                {user.email}
              </Text>
            </View>

            {user.username && (
              <View className="mb-4">
                <Text className="text-gray-400 text-sm mb-1 font-plus-jakarta">
                  Username
                </Text>
                <Text className="text-white text-base font-plus-jakarta">
                  @{user.username}
                </Text>
              </View>
            )}

            <View className="mb-4">
              <Text className="text-gray-400 text-sm mb-1 font-plus-jakarta">Role</Text>
              <View className="flex-row items-center">
                <Text className="text-white text-base capitalize font-plus-jakarta">
                  {user.role.toLowerCase()}
                </Text>
                {user.role === 'ADMIN' && (
                  <View className="ml-2 bg-purple-600 px-2 py-1 rounded">
                    <Text className="text-white text-xs font-plus-jakarta-600">
                      ADMIN
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-gray-400 text-sm mb-1 font-plus-jakarta">
                Highest Grades
              </Text>
              <View className="flex-row items-center gap-4">
                <View>
                  <Text className="text-gray-400 text-xs font-plus-jakarta">Rope</Text>
                  <Text className="text-white text-base font-plus-jakarta-700">
                    {user.highestRopeGrade || 'n/a'}
                  </Text>
                </View>
                <View className="w-px h-8 bg-gray-600" />
                <View>
                  <Text className="text-gray-400 text-xs font-plus-jakarta">
                    Boulder
                  </Text>
                  <Text className="text-white text-base font-plus-jakarta-700">
                    {user.highestBoulderGrade || 'n/a'}
                  </Text>
                </View>
              </View>
            </View>

            <View>
              <Text className="text-gray-400 text-sm mb-1 font-plus-jakarta">
                User ID
              </Text>
              <Text className="text-gray-500 text-xs font-mono">{user.id}</Text>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-red-600 rounded-xl py-4 px-6 items-center"
          >
            <Text className="text-white text-base font-plus-jakarta-600">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView >
    </SafeScreen >
  );
}
