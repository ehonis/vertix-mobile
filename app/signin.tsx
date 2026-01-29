import { API_BASE_URL } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
// Complete auth session for OAuth
WebBrowser.maybeCompleteAuthSession();

type AuthStep = 'initial' | 'verify' | 'createAccount';
type AuthMethod = 'phone' | 'email';

// Format phone number as (xxx) xxx-xxxx
const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const limitedDigits = digits.slice(0, 10);
  if (limitedDigits.length === 0) return '';
  if (limitedDigits.length <= 3) return `(${limitedDigits}`;
  if (limitedDigits.length <= 6)
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(
    3,
    6
  )}-${limitedDigits.slice(6)}`;
};

export default function SignInScreen() {
  const [step, setStep] = useState<AuthStep>('initial');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  // Phone verification state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneErrors, setPhoneErrors] = useState<string>('');
  const [codeErrors, setCodeErrors] = useState<string>('');

  // Email verification state
  const [email, setEmail] = useState('');
  const [emailErrors, setEmailErrors] = useState<string>('');

  const handleGoogleSignIn = async (isSignUp: boolean = false) => {
    setIsGoogleLoading(true);
    try {
      // Use the production scheme from app.json (vertixmobile) for OAuth
      // Linking.createURL uses exp:// in development which iOS can't handle
      // We need to use the registered scheme: vertixmobile://auth
      const callbackUrl = 'vertixmobile://auth';
      const authUrl = `${API_BASE_URL}/api/mobile-auth/oauth?provider=google&callbackUrl=${encodeURIComponent(
        callbackUrl
      )}`;

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        callbackUrl
      );

      const resultUrl = 'url' in result ? result.url : null;

      if ('error' in result && result.error) {
        console.error('OAuth Error:', result.error);
      }

      if (result.type === 'success' && resultUrl) {
        // Parse the callback URL to get the token
        try {
          const url = new URL(resultUrl);
          const token = url.searchParams.get('token');
          const userParam = url.searchParams.get('user');
          const error = url.searchParams.get('error');

          if (error) {
            Alert.alert('Authentication Error', error);
            return;
          }

          if (token && userParam) {
            const user = JSON.parse(decodeURIComponent(userParam));
            await signIn(token, user);
            // Check if user needs onboarding (new user)
            if (!user.isOnboarded) {
              router.replace('/onboarding');
            } else {
              router.replace('/(tabs)');
            }
          } else {
            Alert.alert(
              'Error',
              'Failed to complete authentication - missing token or user data'
            );
          }
        } catch (parseError) {
          console.error('Error parsing callback URL:', parseError);
          Alert.alert('Error', 'Failed to parse authentication response');
        }
      } else if (result.type === 'cancel') {
        // User cancelled, do nothing
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGithubSignIn = async (isSignUp: boolean = false) => {
    setIsGithubLoading(true);
    try {
      const callbackUrl = 'vertixmobile://auth';
      const authUrl = `${API_BASE_URL}/api/mobile-auth/oauth?provider=github&callbackUrl=${encodeURIComponent(
        callbackUrl
      )}`;

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        callbackUrl
      );

      const resultUrl = 'url' in result ? result.url : null;

      if ('error' in result && result.error) {
        console.error('OAuth Error:', result.error);
      }

      if (result.type === 'success' && resultUrl) {
        try {
          const url = new URL(resultUrl);
          const token = url.searchParams.get('token');
          const userParam = url.searchParams.get('user');
          const error = url.searchParams.get('error');

          if (error) {
            Alert.alert('Authentication Error', error);
            return;
          }

          if (token && userParam) {
            const user = JSON.parse(decodeURIComponent(userParam));
            await signIn(token, user);
            // Check if user needs onboarding (new user)
            if (!user.isOnboarded) {
              router.replace('/onboarding');
            } else {
              router.replace('/(tabs)');
            }
          } else {
            Alert.alert(
              'Error',
              'Failed to complete authentication - missing token or user data'
            );
          }
        } catch (parseError) {
          console.error('Error parsing callback URL:', parseError);
          Alert.alert('Error', 'Failed to parse authentication response');
        }
      } else if (result.type === 'cancel') {
        // User cancelled, do nothing
      }
    } catch (error: any) {
      console.error('GitHub sign in error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in with GitHub');
    } finally {
      setIsGithubLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'verify') {
      setStep('initial');
      setVerificationCode('');
      setCodeErrors('');
    } else if (step === 'createAccount') {
      setStep('initial');
      setPhoneNumber('');
      setPhoneErrors('');
      setEmail('');
      setEmailErrors('');
    }
  };

  // Email submit handler
  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      setEmailErrors('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailErrors('Please enter a valid email address');
      return;
    }

    setIsEmailLoading(true);
    setEmailErrors('');

    try {
      await api.sendEmailVerification(email.trim().toLowerCase());
      setStep('verify');
    } catch (error: any) {
      console.error('Email verification error:', error);
      setEmailErrors(error.message || 'Failed to send verification code');
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Email code verification handler
  const handleVerifyEmailCode = async () => {
    if (!verificationCode.trim()) {
      setCodeErrors('Verification code is required');
      return;
    }

    if (verificationCode.length !== 6) {
      setCodeErrors('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    setCodeErrors('');

    try {
      const response = await api.verifyEmailCode(
        email.trim().toLowerCase(),
        verificationCode
      );

      if (response.token && response.user) {
        await signIn(response.token, response.user);
        if (!response.user.isOnboarded) {
          router.replace('/onboarding');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      console.error('Email code verification error:', error);
      setCodeErrors(error.message || 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber.trim()) {
      setPhoneErrors('Phone number is required');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setPhoneErrors('Please enter a valid 10-digit phone number');
      return;
    }

    setIsPhoneLoading(true);
    setPhoneErrors('');

    try {
      const fullPhoneNumber = `+1${cleanPhone}`;
      await api.sendPhoneVerification(fullPhoneNumber);
      setStep('verify');
    } catch (error: any) {
      console.error('Phone verification error:', error);
      setPhoneErrors(error.message || 'Failed to send verification code');
    } finally {
      setIsPhoneLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setCodeErrors('Verification code is required');
      return;
    }

    if (verificationCode.length !== 6) {
      setCodeErrors('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    setCodeErrors('');

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const fullPhoneNumber = `+1${cleanPhone}`;
      const response = await api.verifyPhoneCode(
        fullPhoneNumber,
        verificationCode
      );

      if (response.token && response.user) {
        await signIn(response.token, response.user);
        // Check if user needs onboarding (always true for phone sign-in)
        if (!response.user.isOnboarded) {
          router.replace('/onboarding');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      console.error('Code verification error:', error);
      setCodeErrors(error.message || 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  // Main sign-in screen
  if (step === 'initial') {
    return (
      <ScrollView
        contentContainerClassName="flex-grow justify-center items-center p-1"
        className="flex-1 bg-black"
      >
        <View className="w-full max-w-sm items-center">
          <Text
            className="text-7xl font-bold text-white text-center font-jost-700-bold"
            style={{ includeFontPadding: false, lineHeight: 80 }}
          >
            Vertix
          </Text>

          <View className="bg-slate-800 rounded-xl p-6 w-full gap-4">
            {/* Tab Toggle */}
            <View className="flex-row bg-gray-700 rounded-lg p-1">
              <TouchableOpacity
                className={`flex-1 py-2 rounded-md ${
                  authMethod === 'phone' ? 'bg-blue-600' : ''
                }`}
                onPress={() => {
                  setAuthMethod('phone');
                  setEmailErrors('');
                }}
              >
                <Text
                  className={`text-center font-barlow-500 ${
                    authMethod === 'phone' ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  Phone
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-2 rounded-md ${
                  authMethod === 'email' ? 'bg-blue-600' : ''
                }`}
                onPress={() => {
                  setAuthMethod('email');
                  setPhoneErrors('');
                }}
              >
                <Text
                  className={`text-center font-barlow-500 ${
                    authMethod === 'email' ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {/* Phone Number Input */}
            {authMethod === 'phone' && (
              <View className="gap-2">
                <Text className="text-white text-base font-barlow-500">
                  Phone Number
                </Text>
                <View className="flex-row gap-2 items-center">
                  <Text className="text-white text-base font-barlow">+1</Text>
                  <TextInput
                    className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 font-barlow"
                    placeholder="(555) 123-4567"
                    placeholderTextColor="#9CA3AF"
                    value={phoneNumber}
                    onChangeText={(text) => {
                      const formatted = formatPhoneNumber(text);
                      setPhoneNumber(formatted);
                      setPhoneErrors('');
                    }}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={14}
                  />
                </View>
                {phoneErrors && (
                  <Text className="text-red-400 text-sm font-barlow">
                    {phoneErrors}
                  </Text>
                )}
                {phoneNumber.replace(/\D/g, '').length === 10 && (
                  <TouchableOpacity
                    className={`bg-blue-600 rounded-lg py-3 px-4 items-center justify-center ${
                      isPhoneLoading ? 'opacity-60' : ''
                    }`}
                    onPress={handlePhoneSubmit}
                    disabled={isPhoneLoading}
                  >
                    {isPhoneLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white text-base font-barlow-600">
                        Send Verification Code
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Email Input */}
            {authMethod === 'email' && (
              <View className="gap-2">
                <Text className="text-white text-base font-barlow-500">
                  Email Address
                </Text>
                <TextInput
                  className="bg-gray-700 text-white rounded-lg px-4 py-3 font-barlow"
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailErrors('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
                {emailErrors && (
                  <Text className="text-red-400 text-sm font-barlow">
                    {emailErrors}
                  </Text>
                )}
                {email.trim().length > 0 && (
                  <TouchableOpacity
                    className={`bg-blue-600 rounded-lg py-3 px-4 items-center justify-center ${
                      isEmailLoading ? 'opacity-60' : ''
                    }`}
                    onPress={handleEmailSubmit}
                    disabled={isEmailLoading}
                  >
                    {isEmailLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white text-base font-barlow-600">
                        Send Verification Code
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View className="h-px bg-white w-full opacity-30 my-2" />

            <View className="gap-3 w-full">
              {/* Google Sign In */}
              <TouchableOpacity
                className="py-3 px-2 rounded-full items-center justify-center min-h-12 bg-white flex-row gap-2"
                onPress={() => handleGoogleSignIn(false)}
                disabled={isGoogleLoading || isGithubLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <View className="flex flex-row items-center justify-between gap-2 w-full">
                    <Svg
                      width={24}
                      height={24}
                      viewBox="0 0 48 48"
                      className=""
                    >
                      <Path
                        fill="#FFC107"
                        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                      />
                      <Path
                        fill="#FF3D00"
                        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                      />
                      <Path
                        fill="#4CAF50"
                        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                      />
                      <Path
                        fill="#1976D2"
                        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                      />
                    </Svg>
                    <Text className="text-black text-xl font-barlow-600">
                      Continue with Google
                    </Text>
                    <View className="w-6" />
                  </View>
                )}
              </TouchableOpacity>

              {/* GitHub Sign In */}
              <TouchableOpacity
                className="py-3 px-2 rounded-full items-center justify-center min-h-12 bg-black flex-row gap-2"
                onPress={() => handleGithubSignIn(false)}
                disabled={isGoogleLoading || isGithubLoading}
              >
                {isGithubLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View className="flex flex-row items-center justify-between gap-2 w-full">
                    <Svg
                      width={24}
                      height={24}
                      fill="#fff"
                      className=""
                      viewBox="0 0 16 16"
                    >
                      <Path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8" />
                    </Svg>
                    <Text className="text-white text-xl font-barlow-600">
                      Continue with GitHub
                    </Text>
                    <View className="w-6" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View className="h-px bg-white w-full opacity-30 my-4" />
            <Text className="text-gray-400 text-sm font-barlow-500 text-center italic">If you don't have an account, you can create one below</Text>

            {/* Create Account Button */}
            <TouchableOpacity
              className="py-3 px-4 rounded-full items-center justify-center min-h-12 bg-green-600"
              onPress={() => setStep('createAccount')}
            >
              <Text className="text-white text-xl font-barlow-600">
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="mt-5 text-xs text-gray-400 text-center italic">
            Having trouble logging in? Please reach out by emailing{' '}
            <Text className="text-blue-500 underline">
              support@vertixclimb.com
            </Text>
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Create Account Screen
  if (step === 'createAccount') {
    return (
      <ScrollView
        contentContainerClassName="flex-grow justify-center items-center p-1"
        className="flex-1 bg-black"
      >
        <View className="w-full max-w-sm items-center">
          <Text
            className="text-7xl font-bold text-white text-center font-jost-700-bold"
            style={{ includeFontPadding: false, lineHeight: 80 }}
          >
            Vertix
          </Text>
          <Text className="text-white text-base font-barlow-500">All of your climbing data, in one place</Text>
          <Text className="text-3xl font-barlow-700 text-white mb-8 text-center">
            Create Account
          </Text>

          <View className="bg-slate-800 rounded-xl p-6 w-full gap-4">
            <TouchableOpacity onPress={handleBack} className="self-start mb-2">
              <Text className="text-gray-400 text-sm font-barlow">← Back</Text>
            </TouchableOpacity>

            {/* Tab Toggle */}
            <View className="flex-row bg-gray-700 rounded-lg p-1">
              <TouchableOpacity
                className={`flex-1 py-2 rounded-md ${
                  authMethod === 'phone' ? 'bg-blue-600' : ''
                }`}
                onPress={() => {
                  setAuthMethod('phone');
                  setEmailErrors('');
                }}
              >
                <Text
                  className={`text-center font-barlow-500 ${
                    authMethod === 'phone' ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  Phone
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-2 rounded-md ${
                  authMethod === 'email' ? 'bg-blue-600' : ''
                }`}
                onPress={() => {
                  setAuthMethod('email');
                  setPhoneErrors('');
                }}
              >
                <Text
                  className={`text-center font-barlow-500 ${
                    authMethod === 'email' ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {/* Phone Number Input */}
            {authMethod === 'phone' && (
              <View className="gap-2">
                <Text className="text-white text-base font-barlow-500">
                  Phone Number
                </Text>
                <View className="flex-row gap-2 items-center">
                  <Text className="text-white text-base font-barlow">+1</Text>
                  <TextInput
                    className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 font-barlow"
                    placeholder="(555) 123-4567"
                    placeholderTextColor="#9CA3AF"
                    value={phoneNumber}
                    onChangeText={(text) => {
                      const formatted = formatPhoneNumber(text);
                      setPhoneNumber(formatted);
                      setPhoneErrors('');
                    }}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={14}
                  />
                </View>
                {phoneErrors && (
                  <Text className="text-red-400 text-sm font-barlow">
                    {phoneErrors}
                  </Text>
                )}
                {phoneNumber.replace(/\D/g, '').length === 10 && (
                  <TouchableOpacity
                    className={`bg-blue-600 rounded-lg py-3 px-4 items-center justify-center ${
                      isPhoneLoading ? 'opacity-60' : ''
                    }`}
                    onPress={handlePhoneSubmit}
                    disabled={isPhoneLoading}
                  >
                    {isPhoneLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white text-base font-barlow-600">
                        Send Verification Code
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Email Input */}
            {authMethod === 'email' && (
              <View className="gap-2">
                <Text className="text-white text-base font-barlow-500">
                  Email Address
                </Text>
                <TextInput
                  className="bg-gray-700 text-white rounded-lg px-4 py-3 font-barlow"
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailErrors('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
                {emailErrors && (
                  <Text className="text-red-400 text-sm font-barlow">
                    {emailErrors}
                  </Text>
                )}
                {email.trim().length > 0 && (
                  <TouchableOpacity
                    className={`bg-blue-600 rounded-lg py-3 px-4 items-center justify-center ${
                      isEmailLoading ? 'opacity-60' : ''
                    }`}
                    onPress={handleEmailSubmit}
                    disabled={isEmailLoading}
                  >
                    {isEmailLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white text-base font-barlow-600">
                        Send Verification Code
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View className="h-px bg-white w-full opacity-30 my-2" />

            <View className="gap-3 w-full">
              {/* Google Sign Up */}
              <TouchableOpacity
                className="py-3 px-2 rounded-full items-center justify-center min-h-12 bg-white flex-row gap-2"
                onPress={() => handleGoogleSignIn(true)}
                disabled={isGoogleLoading || isGithubLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <View className="flex flex-row items-center justify-between gap-2 w-full">
                    <Svg
                      width={24}
                      height={24}
                      viewBox="0 0 48 48"
                      className=""
                    >
                      <Path
                        fill="#FFC107"
                        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                      />
                      <Path
                        fill="#FF3D00"
                        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                      />
                      <Path
                        fill="#4CAF50"
                        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                      />
                      <Path
                        fill="#1976D2"
                        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                      />
                    </Svg>
                    <Text className="text-black text-xl font-barlow-600">
                      Continue with Google
                    </Text>
                    <View className="w-6" />
                  </View>
                )}
              </TouchableOpacity>

              {/* GitHub Sign Up */}
              <TouchableOpacity
                className="py-3 px-2 rounded-full items-center justify-center min-h-12 bg-black flex-row gap-2"
                onPress={() => handleGithubSignIn(true)}
                disabled={isGoogleLoading || isGithubLoading}
              >
                {isGithubLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View className="flex flex-row items-center justify-between gap-2 w-full">
                    <Svg
                      width={24}
                      height={24}
                      fill="#fff"
                      className=""
                      viewBox="0 0 16 16"
                    >
                      <Path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8" />
                    </Svg>
                    <Text className="text-white text-xl font-barlow-600">
                      Continue with GitHub
                    </Text>
                    <View className="w-6" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Verification Code Input Step
  if (step === 'verify') {
    const isPhoneVerification = authMethod === 'phone';
    const displayValue = isPhoneVerification ? `+1 ${phoneNumber}` : email;
    const handleResend = isPhoneVerification ? handlePhoneSubmit : handleEmailSubmit;
    const handleVerify = isPhoneVerification ? handleVerifyCode : handleVerifyEmailCode;
    const isResending = isPhoneVerification ? isPhoneLoading : isEmailLoading;

    return (
      <ScrollView
        contentContainerClassName="flex-grow justify-center items-center p-4"
        className="flex-1 bg-black"
      >
        <View className="w-full max-w-sm items-center">
          <Text
            className="text-7xl font-bold text-white text-center font-jost-700-bold"
            style={{ includeFontPadding: false, lineHeight: 80 }}
          >
            Vertix
          </Text>
          <Text className="text-3xl font-barlow-700 text-white mb-8 text-center">
            Enter Verification Code
          </Text>

          <View className="bg-slate-800 rounded-xl p-6 w-full gap-4">
            <TouchableOpacity onPress={handleBack} className="self-start mb-2">
              <Text className="text-gray-400 text-sm font-barlow">← Back</Text>
            </TouchableOpacity>

            <Text className="text-white text-base font-barlow mb-2">
              We sent a verification code to:
            </Text>
          
            <Text className="text-blue-400 text-base font-barlow mb-4">
              {displayValue}
            </Text>

            { authMethod === 'email' && <Text className="text-gray-400 text-sm italic font-barlow-500">If you do not receive a code through email, please check your spam folder.</Text>}

            <TextInput
              className="bg-gray-700 text-white rounded-lg px-4 py-3 font-barlow text-center text-2xl tracking-widest"
              placeholder="000000"
              placeholderTextColor="#9CA3AF"
              value={verificationCode}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(digits);
                setCodeErrors('');
              }}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={6}
              textContentType="oneTimeCode"
            />

            {codeErrors && (
              <Text className="text-red-400 text-sm font-barlow">
                {codeErrors}
              </Text>
            )}

            <TouchableOpacity
              className={`bg-blue-600 rounded-lg py-3 px-4 items-center justify-center ${
                isVerifying ? 'opacity-60' : ''
              }`}
              onPress={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-barlow-600">
                  Verify Code
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResend}
              disabled={isResending}
              className="mt-2"
            >
              <Text className="text-blue-400 text-sm font-barlow text-center">
                {isResending ? 'Sending...' : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }
}
