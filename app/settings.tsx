import SafeScreen from '@/components/SafeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import { useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const TAG_OPTIONS = [
  { value: 'Rope Climber', label: 'Rope Climber' },
  { value: 'Boulder', label: 'Boulder' },
  { value: 'All Around', label: 'All Around' },
  { value: 'none', label: 'none' },
];

const VISIBILITY_OPTIONS = [
  { value: 'true', label: 'Private' },
  { value: 'false', label: 'Public' },
];

const INPUT_MIN_HEIGHT = 44;
const inputVerticalCenterStyle = {
  minHeight: INPUT_MIN_HEIGHT,
  paddingVertical: Platform.OS === 'ios' ? 12 : 0,
  ...(Platform.OS === 'android' && { textAlignVertical: 'center' as const }),
};

const DEBOUNCE_MS = 800;

function useDebouncedUsernameCheck(
  username: string,
  currentUsername: string | null,
  hasUserTyped: boolean,
  isValid: boolean
) {
  const [isChecking, setIsChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (
      !hasUserTyped ||
      !username ||
      username === currentUsername ||
      !isValid ||
      username.length < 3 ||
      username.length > 16
    ) {
      setAvailable(username === currentUsername ? true : null);
      setIsChecking(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    setIsChecking(true);
    setAvailable(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.checkUsernameAvailability(username);
        setAvailable(res.available);
      } catch {
        setAvailable(null);
      } finally {
        setIsChecking(false);
      }
      timeoutRef.current = null;
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [username, currentUsername, hasUserTyped, isValid]);

  return { isChecking, available };
}

export default function SettingsScreen() {
  const { user, signOut, refreshSession } = useAuth();
  const { showNotification } = useNotification();
  const router = useRouter();

  const userWithExtras = user as { tag?: string | null; private?: boolean } | null;
  const currentTag = userWithExtras?.tag ?? 'none';
  const currentPrivate = userWithExtras?.private ?? false;

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [tag, setTag] = useState(currentTag);
  const [profileVisibility, setProfileVisibility] = useState(currentPrivate ? 'true' : 'false');
  const [hasUserTyped, setHasUserTyped] = useState(false);
  const [nameError, setNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);

  const isNameValid = nameError === '';
  const isUsernameValid = usernameError === '';
  const isValidUsernameFormat =
    username.length >= 3 &&
    username.length <= 16 &&
    !username.includes(' ') &&
    /^[a-zA-Z0-9]+$/.test(username);

  const { isChecking: isUsernameChecking, available: isUsernameAvailable } =
    useDebouncedUsernameCheck(
      username,
      user?.username ?? null,
      hasUserTyped,
      isValidUsernameFormat
    );

  const isDirty =
    hasUserTyped &&
    (name !== (user?.name ?? '') ||
      username !== (user?.username ?? '') ||
      tag !== currentTag ||
      profileVisibility !== (currentPrivate ? 'true' : 'false'));

  const canSave =
    isDirty &&
    isNameValid &&
    isUsernameValid &&
    (username === (user?.username ?? '') || isUsernameAvailable === true) &&
    name.trim().length > 0 &&
    username.trim().length > 0;

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setUsername(user.username ?? '');
    setTag(currentTag);
    setProfileVisibility(currentPrivate ? 'true' : 'false');
  }, [user?.id]);

  const handleNameChange = useCallback((text: string) => {
    setHasUserTyped(true);
    setName(text);
    if (text.length < 1 || text.length > 50) {
      setNameError('Name must be between 1 and 50 characters');
    } else if (/[^a-zA-Z0-9\s]/.test(text)) {
      setNameError('Name can only contain letters, numbers and spaces');
    } else {
      setNameError('');
    }
  }, []);

  const handleUsernameChange = useCallback((text: string) => {
    setHasUserTyped(true);
    setUsername(text);
    if (text.length > 0 && (text.length < 3 || text.length > 16)) {
      setUsernameError('Username must be between 3 and 16 characters');
    } else if (text.includes(' ')) {
      setUsernameError('Username cannot contain spaces');
    } else if (text.length > 0 && /[^a-zA-Z0-9]/.test(text)) {
      setUsernameError('Username can only contain letters and numbers');
    } else {
      setUsernameError('');
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!user || !canSave) return;
    setIsSaving(true);
    try {
      await api.saveProfileSettings({
        id: user.id,
        name: name.trim(),
        username: username.trim(),
        tag,
        privacy: profileVisibility === 'true',
      });
      showNotification({ message: 'Profile settings saved', color: 'green' });
      setHasUserTyped(false);
      await refreshSession();
    } catch {
      showNotification({
        message: 'Error saving profile settings',
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  }, [user, canSave, name, username, tag, profileVisibility, showNotification, refreshSession]);

  const handleRemovePhoto = useCallback(async () => {
    if (!user) return;
    setIsRemovingImage(true);
    try {
      await api.removeProfileImage(user.id);
      showNotification({ message: 'Image removed', color: 'green' });
      await refreshSession();
    } catch {
      showNotification({
        message: 'Error removing image',
        color: 'red',
      });
    } finally {
      setIsRemovingImage(false);
    }
  }, [user, showNotification, refreshSession]);

  const handleChangePhoto = useCallback(() => {
    showNotification({ message: 'Coming soon', color: 'red' });
  }, [showNotification]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/signin');
  }, [signOut, router]);

  if (!user) {
    return (
      <SafeScreen className="justify-center items-center bg-black" edges={['top', 'bottom']}>
        <Text className="text-white text-lg font-plus-jakarta">No user data available</Text>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen className="bg-black" edges={['top', 'bottom']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-2 pb-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity onPress={() => router.back()} className="w-10 items-center py-1">
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

          {/* Profile Settings card */}
          <View className="bg-slate-900 rounded-xl p-5 mb-6">
            <Text className="text-white text-lg font-plus-jakarta-600 mb-4">Profile Settings</Text>

            {/* Profile picture */}
            <View className="mb-4">
              <Text className="text-white font-plus-jakarta-600 mb-2">Profile Picture</Text>
              <View className="flex-row items-center gap-3">
                {user.image ? (
                  <Image
                    source={{ uri: user.image }}
                    className="w-20 h-20 rounded-full border-2 border-slate-700"
                  />
                ) : (
                  <View className="w-20 h-20 rounded-full bg-purple-600 items-center justify-center border-2 border-slate-700">
                    <Text className="text-white text-2xl font-plus-jakarta-700">
                      {user.name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase() ?? 'U'}
                    </Text>
                  </View>
                )}
                <View className="flex-1 gap-2">
                  <TouchableOpacity
                    onPress={handleChangePhoto}
                    className="bg-slate-800 rounded-lg py-2 px-3"
                    disabled={isRemovingImage}
                  >
                    <Text className="text-white text-sm font-plus-jakarta">Change photo</Text>
                  </TouchableOpacity>
                  {user.image && (
                    <TouchableOpacity
                      onPress={handleRemovePhoto}
                      className="bg-red-600/80 rounded-lg py-2 px-3"
                      disabled={isRemovingImage}
                    >
                      {isRemovingImage ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text className="text-white text-sm font-plus-jakarta">Remove photo</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Name */}
            <View className="mb-4">
              <Text className="text-white font-plus-jakarta-600 mb-2">Name</Text>
              <TextInput
                className="bg-slate-800 rounded-lg px-3 text-white font-plus-jakarta text-base"
                style={inputVerticalCenterStyle}
                placeholder="Name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={handleNameChange}
                autoCapitalize="words"
                {...(Platform.OS === 'android' && { includeFontPadding: false })}
              />
              {nameError ? (
                <Text className="text-red-500 text-sm font-plus-jakarta mt-1">{nameError}</Text>
              ) : null}
            </View>

            {/* Username */}
            <View className="mb-4">
              <Text className="text-white font-plus-jakarta-600 mb-2">Username</Text>
              <View
                className={cn(
                  'flex-row rounded-lg overflow-hidden border-2',
                  hasUserTyped && username !== (user.username ?? '') && isUsernameAvailable === false
                    ? 'border-red-500'
                    : hasUserTyped && username !== (user.username ?? '') && isUsernameAvailable === true
                      ? 'border-green-500'
                      : 'border-slate-700 bg-slate-800'
                )}
              >
                <View
                  className="bg-blue-500 justify-center px-3"
                  style={{ minHeight: INPUT_MIN_HEIGHT }}
                >
                  <Text className="text-white font-plus-jakarta-700 text-base">@</Text>
                </View>
                <TextInput
                  className="flex-1 px-3 text-white font-plus-jakarta text-base bg-slate-800"
                  style={inputVerticalCenterStyle}
                  placeholder="Username"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  {...(Platform.OS === 'android' && { includeFontPadding: false })}
                />
                {isUsernameChecking ? (
                  <View className="justify-center pr-3">
                    <ActivityIndicator size="small" color="white" />
                  </View>
                ) : null}
              </View>
              {usernameError ? (
                <Text className="text-red-500 text-sm font-plus-jakarta mt-1">{usernameError}</Text>
              ) : null}
              {hasUserTyped &&
                username.length >= 3 &&
                username !== (user.username ?? '') &&
                !isUsernameChecking &&
                isUsernameAvailable === true && (
                  <Text className="text-green-500 text-sm font-plus-jakarta mt-1">Available</Text>
                )}
              {hasUserTyped &&
                username !== (user.username ?? '') &&
                !isUsernameChecking &&
                isUsernameAvailable === false && (
                  <Text className="text-red-500 text-sm font-plus-jakarta mt-1">
                    Username is already taken
                  </Text>
                )}
            </View>

            {/* Tag */}
            <View className="mb-4">
              <Text className="text-white font-plus-jakarta-600 mb-2">Tag</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowTagPicker(!showTagPicker);
                  setShowVisibilityPicker(false);
                }}
                className="bg-slate-800 rounded-lg px-3 items-center justify-center"
                style={{ minHeight: INPUT_MIN_HEIGHT }}
              >
                <Text className="text-white font-plus-jakarta">{tag}</Text>
              </TouchableOpacity>
              {showTagPicker && (
                <View className="mt-2 rounded-lg border border-slate-600 bg-slate-800">
                  {TAG_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        setTag(opt.value);
                        setShowTagPicker(false);
                        setHasUserTyped(true);
                      }}
                      className={cn(
                        'px-4 py-3 border-b border-slate-700 last:border-b-0 items-center justify-center',
                        tag === opt.value && 'bg-slate-700'
                      )}
                    >
                      <Text
                        className={cn(
                          'font-plus-jakarta',
                          tag === opt.value ? 'text-white font-plus-jakarta-600' : 'text-slate-300'
                        )}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Profile visibility */}
            <View className="mb-4">
              <Text className="text-white font-plus-jakarta-600 mb-1">Profile visibility</Text>
              <Text className="text-gray-400 text-xs font-plus-jakarta mb-2">
                If private, you will not appear on the public leaderboard.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowVisibilityPicker(!showVisibilityPicker);
                  setShowTagPicker(false);
                }}
                className="bg-slate-800 rounded-lg px-3 items-center justify-center"
                style={{ minHeight: INPUT_MIN_HEIGHT }}
              >
                <Text className="text-white font-plus-jakarta">
                  {profileVisibility === 'true' ? 'Private' : 'Public'}
                </Text>
              </TouchableOpacity>
              {showVisibilityPicker && (
                <View className="mt-2 rounded-lg border border-slate-600 bg-slate-800">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        setProfileVisibility(opt.value);
                        setShowVisibilityPicker(false);
                        setHasUserTyped(true);
                      }}
                      className={cn(
                        'px-4 py-3 border-b border-slate-700 last:border-b-0 items-center justify-center',
                        profileVisibility === opt.value && 'bg-slate-700'
                      )}
                    >
                      <Text
                        className={cn(
                          'font-plus-jakarta',
                          profileVisibility === opt.value
                            ? 'text-white font-plus-jakarta-600'
                            : 'text-slate-300'
                        )}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Save */}
            {canSave && (
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className="bg-green-500 rounded-xl py-3 px-4 items-center"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-plus-jakarta-600">Save changes</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Sign Out */}

        </View>
      </ScrollView>
    </SafeScreen>
  );
}
