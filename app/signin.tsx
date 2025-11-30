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

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
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
            router.replace('/(tabs)');
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

  const handleGithubSignIn = async () => {
    setIsGithubLoading(true);
    try {
      // Use the production scheme from app.json (vertixmobile) for OAuth
      // Linking.createURL uses exp:// in development which iOS can't handle
      // We need to use the registered scheme: vertixmobile://auth
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
            router.replace('/(tabs)');
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

  const handleEmailSignIn = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsEmailLoading(true);
    try {
      await api.signInWithEmail(email.trim());
      Alert.alert(
        'Check your email',
        'We sent you a magic link. Click the link in the email to sign in.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Email sign in error:', error);
      Alert.alert('Error', error.message || 'Failed to send magic link');
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerClassName="flex-grow justify-center items-center p-1"
      className="flex-1 bg-black"
    >
      <View className="w-full max-w-sm items-center ">
        <Text
          className="text-7xl font-bold text-white  text-center font-jost-700-bold "
          style={{ includeFontPadding: false, lineHeight: 80 }}
        >
          Vertix
        </Text>
        <Text className="text-3xl font-bold text-white mb-8 text-center font-barlow-500">
          Login or Sign Up
        </Text>

        <View className="bg-slate-800 rounded-xl p-6 w-full gap-4">
          <View className="gap-3">
            <TouchableOpacity
              className="py-3 px-2 rounded-full items-center justify-center min-h-12 bg-white flex-row gap-2"
              onPress={handleGoogleSignIn}
              disabled={isGoogleLoading || isGithubLoading || isEmailLoading}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <View className="flex flex-row items-center justify-between gap-2 w-full ">
                  <Svg width={24} height={24} viewBox="0 0 48 48" className="">
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
                  <Text className="text-black text-xl font-semibold font-barlow-500 ">
                    Google
                  </Text>
                  <View className=" w-6" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 px-2 rounded-full items-center justify-center min-h-12 bg-black"
              onPress={handleGithubSignIn}
              disabled={isGoogleLoading || isGithubLoading || isEmailLoading}
            >
              {isGithubLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex flex-row items-center justify-between gap-2 w-full ">
                  <Svg
                    width={24}
                    height={24}
                    fill="#fff"
                    className=""
                    viewBox="0 0 16 16"
                  >
                    <Path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8" />
                  </Svg>

                  <Text className="text-white text-xl font-semibold font-barlow-500">
                    GitHub
                  </Text>
                  <View className=" w-6" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View className="h-px bg-white w-full opacity-30" />

          <View className="gap-3">
            <TextInput
              className="bg-gray-700 rounded-lg p-3 text-white text-base"
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isEmailLoading}
            />
            <TouchableOpacity
              className={`py-3 px-4 rounded-full items-center justify-center min-h-12 bg-purple-600 ${
                isEmailLoading ? 'opacity-60' : ''
              }`}
              onPress={handleEmailSignIn}
              disabled={isEmailLoading}
            >
              {isEmailLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-semibold font-barlow-500">
                  Send Email Magic Link
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
