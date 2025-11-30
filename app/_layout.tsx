import { Barlow_400Regular, Barlow_500Medium } from '@expo-google-fonts/barlow';
import { Jost_700Bold } from '@expo-google-fonts/jost';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    Barlow_400Regular: Barlow_400Regular,
    Barlow_500Medium: Barlow_500Medium,
    Jost_700Bold: Jost_700Bold,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Handle deep links for OAuth callbacks
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        const parsedUrl = Linking.parse(url);
        // Handle both 'auth' hostname and '/auth' path formats
        const isAuthCallback =
          parsedUrl.hostname === 'auth' ||
          parsedUrl.path === '/auth' ||
          parsedUrl.path?.includes('auth');

        if (isAuthCallback) {
          const token = parsedUrl.queryParams?.token as string;
          const userParam = parsedUrl.queryParams?.user as string;
          const error = parsedUrl.queryParams?.error as string;

          if (error) {
            console.error('OAuth error:', error);
            return;
          }

          if (token && userParam) {
            const user = JSON.parse(decodeURIComponent(userParam));
            await signIn(token, user);
            router.replace('/(tabs)');
          }
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
      }
    };

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [signIn, router]);

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === 'signin' || firstSegment === undefined;

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to sign in if not authenticated
      router.replace('/signin' as any);
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to tabs if authenticated and on sign in page
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="signin" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
