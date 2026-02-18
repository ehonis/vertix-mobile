import SafeScreen from '@/components/SafeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function OnboardingScreen() {
  const { user, refreshSession, signOut } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state - auto-filled from OAuth data
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
  });

  // Check if user signed up with phone number (has phone number)
  // Don't check email since we filter it out
  const isPhoneUser =
    user &&
    user.phoneNumber &&
    (!user.email || user.email === '' || user.email.includes('@phone.local'));

  // Check if user is OAuth (has real email, not a phone-only user)
  const isOAuthUser =
    user &&
    !isPhoneUser &&
    user.email &&
    user.email !== '' &&
    !user.email.includes('@phone.local');

  // Load user data
  useEffect(() => {
    if (user) {
      // For phone users, don't show the temp email - let them add a recovery email
      const emailValue = isPhoneUser ? '' : user.email || '';
      setFormData({
        name: user.name || '',
        username: user.username || '',
        email: emailValue,
      });
    }
  }, [user, isPhoneUser]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.replace('/signin');
    }
  }, [user, router]);

  // Format phone number from E.164 to display format
  const formatPhoneForDisplay = (phone: string): string => {
    // Remove +1 prefix
    const digits = phone.replace(/^\+1/, '').replace(/\D/g, '');
    if (digits.length !== 10) return phone;

    // Format as (xxx) xxx-xxxx
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username =
        'Username can only contain letters, numbers, underscores, and hyphens';
    }

    // Email validation (optional for account recovery for phone users)
    if (formData.email.trim() && isPhoneUser) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.completeOnboarding({
        name: formData.name.trim(),
        username: formData.username.trim(),
        // Only include email if it's provided by phone user (for account recovery)
        ...(isPhoneUser &&
          formData.email.trim() && { email: formData.email.trim() }),
      });

      // Refresh session to get updated user data
      await refreshSession();

      // Redirect to tabs
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      // Handle API errors with field information
      if (error.field) {
        setErrors({ [error.field]: error.message || 'Validation error' });
      } else {
        setErrors({ submit: error.message || 'Failed to complete onboarding' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeScreen edges={['top', 'bottom']} className="bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#fff" />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top', 'bottom']} className="bg-black">
      <ScrollView
        contentContainerClassName="flex-grow justify-center p-4"
        className="flex-1"
      >
        <View className="w-full max-w-sm mx-auto">
          <Text className="text-3xl text-white font-plus-jakarta-700 mb-2">
            Complete Your Profile
          </Text>
          <Text className="text-gray-400 mb-6 font-plus-jakarta">
            We need a few more details to get you started
          </Text>

          <View className="bg-slate-800 rounded-xl p-6 gap-4">
            {/* Name Field */}
            <View>
              <Text className="text-white text-sm font-plus-jakarta mb-2">Name *</Text>
              <TextInput
                className="bg-gray-700 text-white rounded-lg px-4 py-3 font-plus-jakarta"
                placeholder="Your full name"
                placeholderTextColor="#9CA3AF"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              {errors.name && (
                <Text className="text-red-400 text-sm mt-1 font-plus-jakarta">
                  {errors.name}
                </Text>
              )}
            </View>

            {/* Username Field */}
            <View>
              <Text className="text-white text-sm font-plus-jakarta mb-2">
                Username *
              </Text>
              <TextInput
                className="bg-gray-700 text-white rounded-lg px-4 py-3 font-plus-jakarta"
                placeholder="Choose a username"
                placeholderTextColor="#9CA3AF"
                value={formData.username}
                onChangeText={(text) =>
                  setFormData({ ...formData, username: text.toLowerCase() })
                }
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.username && (
                <Text className="text-red-400 text-sm mt-1 font-plus-jakarta">
                  {errors.username}
                </Text>
              )}
              <Text className="text-gray-500 text-xs mt-1 font-plus-jakarta">
                Letters, numbers, underscores, and hyphens only
              </Text>
            </View>

            {/* Phone Number (read-only for phone users) */}
            {isPhoneUser && user?.phoneNumber && (
              <View>
                <Text className="text-white text-sm font-plus-jakarta mb-2">
                  Phone Number
                </Text>
                <TextInput
                  className="bg-gray-800 text-gray-400 rounded-lg px-4 py-3 font-plus-jakarta"
                  value={formatPhoneForDisplay(user.phoneNumber)}
                  editable={false}
                />
                <Text className="text-gray-500 text-xs mt-1 font-plus-jakarta">
                  Verified phone number from sign-up
                </Text>
              </View>
            )}

            {/* Email (read-only for phone users, editable for OAuth as account recovery) */}
            {isPhoneUser ? (
              <View>
                <Text className="text-white text-sm font-plus-jakarta mb-2">
                  Email (Optional)
                </Text>
                <TextInput
                  className="bg-gray-700 text-white rounded-lg px-4 py-3 font-plus-jakarta"
                  placeholder="email@example.com"
                  placeholderTextColor="#9CA3AF"
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    setErrors({});
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.email && (
                  <Text className="text-red-400 text-sm mt-1 font-plus-jakarta">
                    {errors.email}
                  </Text>
                )}
                <Text className="text-gray-500 text-xs mt-1 font-plus-jakarta">
                  Add an email for account recovery
                </Text>
              </View>
            ) : (
              <View>
                <Text className="text-white text-sm font-plus-jakarta mb-2">Email</Text>
                <TextInput
                  className="bg-gray-800 text-gray-400 rounded-lg px-4 py-3 font-plus-jakarta"
                  value={formData.email}
                  editable={false}
                />
                <Text className="text-gray-500 text-xs mt-1 font-plus-jakarta">
                  Email from your OAuth account
                </Text>
              </View>
            )}

            <TouchableOpacity
              className={`bg-blue-600 rounded-lg py-3 px-4 items-center justify-center ${isLoading ? 'opacity-60' : ''
                }`}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-plus-jakarta-600">
                  Complete Setup
                </Text>
              )}
            </TouchableOpacity>

            {/* Debug: Clear Auth Button */}
            <TouchableOpacity
              className="bg-red-600 rounded-lg py-2 px-4 items-center justify-center mt-4"
              onPress={async () => {
                Alert.alert(
                  'Clear Auth Data',
                  'This will sign you out and clear all authentication data. Are you sure?',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          // Clear SecureStore
                          await SecureStore.deleteItemAsync('auth_token');
                          await SecureStore.deleteItemAsync('user_data');
                          // Sign out via context
                          await signOut();
                          // Navigate to sign in
                          router.replace('/signin');
                          Alert.alert('Success', 'Auth data cleared!');
                        } catch (error) {
                          console.error('Clear auth error:', error);
                          Alert.alert('Error', 'Failed to clear auth data');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text className="text-white text-sm font-plus-jakarta-600">
                🔧 Debug: Clear Auth & Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}
