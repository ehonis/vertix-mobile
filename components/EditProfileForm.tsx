import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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

export default function EditProfileForm() {
  const { user, refreshSession } = useAuth();
  const { showNotification } = useNotification();

  const userWithExtras = user as { tag?: string | null; private?: boolean } | null;
  const currentTag = userWithExtras?.tag ?? 'none';
  const currentPrivate = userWithExtras?.private ?? false;

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [tag, setTag] = useState(currentTag);
  const [profileVisibility, setProfileVisibility] = useState(
    currentPrivate ? 'true' : 'false'
  );
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
  }, [user?.id, currentTag, currentPrivate]);

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
  }, [
    user,
    canSave,
    name,
    username,
    tag,
    profileVisibility,
    showNotification,
    refreshSession,
  ]);

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

  if (!user) return null;

  return (
    <View className="bg-slate-900 rounded-xl p-5 mb-6">
      <Text className="text-white text-lg font-plus-jakarta-600 mb-4">
        Profile Settings
      </Text>

      {/* Profile picture */}
      <View className="mb-4">
        <Text className="text-white font-plus-jakarta-600 mb-2">
          Profile Picture
        </Text>
        <View className="flex-row items-center gap-3">
          {user.image ? (
            <Image
              source={{ uri: user.image }}
              className="w-20 h-20 rounded-full border-2 border-slate-700"
            />
          ) : (
            <View className="w-20 h-20 rounded-full bg-purple-600 items-center justify-center border-2 border-slate-700">
              <Text className="text-white text-2xl font-plus-jakarta-700">
                {user.name?.[0]?.toUpperCase() ??
                  user.email?.[0]?.toUpperCase() ??
                  'U'}
              </Text>
            </View>
          )}
          <View className="flex-1 gap-2">
            <TouchableOpacity
              onPress={handleChangePhoto}
              className="bg-slate-800 rounded-lg py-2 px-3"
              disabled={isRemovingImage}
            >
              <Text className="text-white text-sm font-plus-jakarta">
                Change photo
              </Text>
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
                  <Text className="text-white text-sm font-plus-jakarta">
                    Remove photo
                  </Text>
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
          <Text className="text-red-500 text-sm font-plus-jakarta mt-1">
            {nameError}
          </Text>
        ) : null}
      </View>

      {/* Username */}
      <View className="mb-4">
        <Text className="text-white font-plus-jakarta-600 mb-2">Username</Text>
        <View
          className={cn(
            'flex-row rounded-lg overflow-hidden border-2',
            hasUserTyped &&
              username !== (user.username ?? '') &&
              isUsernameAvailable === false
              ? 'border-red-500'
              : hasUserTyped &&
                  username !== (user.username ?? '') &&
                  isUsernameAvailable === true
                ? 'border-green-500'
                : 'border-slate-700 bg-slate-800'
          )}
        >
          <View
            className="bg-blue-500 justify-center px-3"
            style={{ minHeight: INPUT_MIN_HEIGHT }}
          >
            <Text className="text-white font-plus-jakarta-700 text-base">
              @
            </Text>
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
          <Text className="text-red-500 text-sm font-plus-jakarta mt-1">
            {usernameError}
          </Text>
        ) : null}
        {hasUserTyped &&
          username.length >= 3 &&
          username !== (user.username ?? '') &&
          !isUsernameChecking &&
          isUsernameAvailable === true && (
            <Text className="text-green-500 text-sm font-plus-jakarta mt-1">
              Available
            </Text>
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
                    tag === opt.value
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

      {/* Profile visibility */}
      <View className="mb-4">
        <Text className="text-white font-plus-jakarta-600 mb-1">
          Profile visibility
        </Text>
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
            <Text className="text-white font-plus-jakarta-600">
              Save changes
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
