import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import { Jost_700Bold } from '@expo-google-fonts/jost';

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import 'react-native-reanimated';
import '../global.css';

import Notification from '@/components/Notification';
import { useColorScheme } from '@/components/useColorScheme';
import XpLevelBar from '@/components/XpLevelBar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { XpProvider, useXp } from '@/contexts/XpContext';
import { api } from '@/services/api';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Barlow_400Regular: Barlow_400Regular,
    Barlow_500Medium: Barlow_500Medium,
    Barlow_600SemiBold: Barlow_600SemiBold,
    Barlow_700Bold: Barlow_700Bold,
    Jost_700Bold: Jost_700Bold,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) {
      console.warn(
        'Font loading error (this is normal in development):',
        error
      );
      // Don't throw - let the app continue with fallback fonts
    }
  }, [error]);

  useEffect(() => {
    // Hide splash screen even if fonts didn't load
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  return (
    <GestureHandlerRootView className="flex-1 bg-black" style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AuthProvider>
        <XpProvider>
          <NotificationProvider>

            <RootLayoutNav />
            <GlobalComponents />
          </NotificationProvider>
        </XpProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

// Initialize XP from server when user is authenticated
function XpInitializer() {
  const { user, isAuthenticated } = useAuth();
  const { setUserXp, isXpInitialized } = useXp();

  useEffect(() => {
    const initializeXp = async (retryCount = 0) => {
      if (isAuthenticated && user && !isXpInitialized) {
        // Small delay on first attempt to allow token to be fully stored
        // This prevents race condition when signing in
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        try {
          const xpData = await api.getUserXp();
          setUserXp(xpData.xp, xpData.monthlyXp);
        } catch (error: any) {
          // Retry up to 2 times with increasing delay for auth errors
          if (retryCount < 2 && error?.message === 'Unauthorized') {
            const delay = (retryCount + 1) * 500; // 500ms, 1000ms
            setTimeout(() => initializeXp(retryCount + 1), delay);
          } else {
            console.error('Error fetching user XP:', error);
          }
        }
      }
    };

    initializeXp();
  }, [isAuthenticated, user, isXpInitialized, setUserXp]);

  return null;
}

// Global components that render XP level bar and notifications
function GlobalComponents() {
  const { showLevelBar, levelBarData, hideLevelBar, isAnimatingOut } = useXp();

  return (
    <>
      <XpInitializer />
      {showLevelBar && levelBarData && (
        <XpLevelBar
          xpData={levelBarData}
          onComplete={hideLevelBar}
        />
      )}
      <Notification />
    </>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, signIn, user } = useAuth();
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
          const isOnboarded = parsedUrl.queryParams?.isOnboarded === 'true';
          const error = parsedUrl.queryParams?.error as string;

          if (error) {
            console.error('OAuth error:', error);
            return;
          }

          if (token && userParam) {
            const user = JSON.parse(decodeURIComponent(userParam));
            await signIn(token, user);
            // Redirect to onboarding if not completed, otherwise to tabs
            if (!isOnboarded) {
              router.replace('/onboarding' as any);
            } else {
              router.replace('/(tabs)');
            }
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

  // useEffect to check if the user is authenticated and redirect to the appropriate screen
  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === 'signin' || firstSegment === undefined;
    const inOnboarding = firstSegment === 'onboarding';

    if (!isAuthenticated && !inAuthGroup && !inOnboarding) {
      // Redirect to sign in if not authenticated
      router.replace('/signin' as any);
    } else if (isAuthenticated) {
      // Check if user needs onboarding
      if (user && !user.isOnboarded && !inOnboarding) {
        router.replace('/onboarding' as any);
      } else if (inAuthGroup && user?.isOnboarded) {
        // Redirect to tabs if authenticated and on sign in page
        router.replace('/(tabs)');
      } else if (inOnboarding && user?.isOnboarded) {
        // Redirect to tabs if already onboarded
        router.replace('/(tabs)');
      }
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
      <View className="flex-1 bg-black">
        <Stack>
          <Stack.Screen name="signin" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="profile"
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="route-manager"
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}
