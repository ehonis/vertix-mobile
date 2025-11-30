import { api } from '@/services/api';
import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

interface User {
  id: string;
  username: string | null;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  highestRopeGrade?: string | null;
  highestBoulderGrade?: string | null;
  totalXp?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = 'user_data';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored user data on mount
  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync(USER_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (token: string, userData: User) => {
    try {
      await api.signInWithToken(token);
      // Store initial user data
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
      setUser(userData);
      // Refresh session to get complete user data (XP, highest grades, etc.)
      try {
        const session = await api.getSession();
        if (session?.user) {
          const completeUserData = session.user;
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(completeUserData));
          setUser(completeUserData);
        }
      } catch (refreshError) {
        // If refresh fails, keep the initial user data - don't fail the sign-in
        console.warn('Failed to refresh session after sign-in:', refreshError);
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await api.signOut();
      await SecureStore.deleteItemAsync(USER_KEY);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      // Clear local state even if API call fails
      await SecureStore.deleteItemAsync(USER_KEY);
      setUser(null);
    }
  };

  const refreshSession = async () => {
    try {
      const session = await api.getSession();
      if (session?.user) {
        const userData = session.user;
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
        setUser(userData);
      } else {
        // Session invalid, sign out
        await signOut();
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      // If refresh fails, sign out
      await signOut();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
