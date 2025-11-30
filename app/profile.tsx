import { useAuth } from '@/contexts/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/signin');
  };

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white text-lg">No user data available</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-black">
      <View className="flex-1 mt-12 p-6">
        {/* Header with back button */}
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2">
            <FontAwesome name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold font-barlow">
            Profile
          </Text>
        </View>

        {/* Profile Header */}
        <View className="items-center mb-8 mt-4">
          {user.image ? (
            <Image
              source={{ uri: user.image }}
              className="w-24 h-24 rounded-full mb-4 border-4 border-slate-800"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-purple-600 items-center justify-center mb-4 border-4 border-slate-800">
              <Text className="text-white text-4xl font-bold">
                {user.name?.[0]?.toUpperCase() ||
                  user.email[0]?.toUpperCase() ||
                  'U'}
              </Text>
            </View>
          )}
          <Text className="text-white text-2xl font-bold mb-1 font-barlow">
            {user.name || 'User'}
          </Text>
          {user.username && (
            <Text className="text-gray-400 text-base font-barlow">
              @{user.username}
            </Text>
          )}
        </View>

        {/* User Information Card */}
        <View className="bg-slate-900 rounded-xl p-6 mb-6">
          <Text className="text-white text-lg font-semibold mb-4 font-barlow">
            Profile Information
          </Text>

          <View className="mb-4">
            <Text className="text-gray-400 text-sm mb-1 font-barlow">
              Email
            </Text>
            <Text className="text-white text-base font-barlow">
              {user.email}
            </Text>
          </View>

          {user.username && (
            <View className="mb-4">
              <Text className="text-gray-400 text-sm mb-1 font-barlow">
                Username
              </Text>
              <Text className="text-white text-base font-barlow">
                @{user.username}
              </Text>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-gray-400 text-sm mb-1 font-barlow">Role</Text>
            <View className="flex-row items-center">
              <Text className="text-white text-base capitalize font-barlow">
                {user.role.toLowerCase()}
              </Text>
              {user.role === 'ADMIN' && (
                <View className="ml-2 bg-purple-600 px-2 py-1 rounded">
                  <Text className="text-white text-xs font-semibold font-barlow">
                    ADMIN
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-400 text-sm mb-1 font-barlow">
              Highest Grades
            </Text>
            <View className="flex-row items-center gap-4">
              <View>
                <Text className="text-gray-400 text-xs font-barlow">Rope</Text>
                <Text className="text-white text-base font-bold font-barlow">
                  {user.highestRopeGrade || 'n/a'}
                </Text>
              </View>
              <View className="w-px h-8 bg-gray-600" />
              <View>
                <Text className="text-gray-400 text-xs font-barlow">
                  Boulder
                </Text>
                <Text className="text-white text-base font-bold font-barlow">
                  {user.highestBoulderGrade || 'n/a'}
                </Text>
              </View>
            </View>
          </View>

          <View>
            <Text className="text-gray-400 text-sm mb-1 font-barlow">
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
          <Text className="text-white text-base font-semibold font-barlow">
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
