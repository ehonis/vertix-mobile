import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // token management methods

  private async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  private async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }
  // generic request method
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          await this.removeToken();
          throw new Error('Unauthorized');
        }
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        // Preserve error structure for onboarding endpoint
        const errorObj: any = new Error(
          error.message || error.error || `HTTP error! status: ${response.status}`
        );
        if (error.field) {
          errorObj.field = error.field;
          errorObj.message = error.message || error.error;
        }
        throw errorObj;
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  //generic get, post, put, delete methods

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T>(endpoint + queryString, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Auth methods
  async signInWithToken(token: string): Promise<void> {
    await this.setToken(token);
  }

  async signInWithOAuth(
    provider: string,
    accessToken: string
  ): Promise<{ token: string; user: any }> {
    const response = await this.post<{ token: string; user: any }>(
      API_ENDPOINTS.AUTH_MOBILE_SIGNIN,
      { provider, accessToken }
    );
    await this.setToken(response.token);
    return response;
  }

  getOAuthUrl(provider: string, callbackUrl: string): string {
    return `${this.baseURL}${API_ENDPOINTS.AUTH_OAUTH}?provider=${provider}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
  }

  async signInWithEmail(email: string): Promise<{ message: string }> {
    return this.post<{ message: string }>(API_ENDPOINTS.AUTH_MOBILE_SIGNIN, {
      email,
      method: 'email',
    });
  }

  async getSession(): Promise<any> {
    return this.get(API_ENDPOINTS.AUTH_SESSION);
  }

  async signOut(): Promise<void> {
    await this.post(API_ENDPOINTS.AUTH_SIGNOUT);
    await this.removeToken();
  }

  // Phone Auth methods
  async sendPhoneVerification(phoneNumber: string): Promise<any> {
    return this.post(API_ENDPOINTS.PHONE_SEND_VERIFICATION, { phoneNumber });
  }

  async verifyPhoneCode(phoneNumber: string, code: string): Promise<any> {
    return this.post(API_ENDPOINTS.PHONE_VERIFY, { phoneNumber, code });
  }

  // Email Auth methods
  async sendEmailVerification(email: string): Promise<any> {
    return this.post(API_ENDPOINTS.EMAIL_SEND_VERIFICATION, { email });
  }

  async verifyEmailCode(email: string, code: string): Promise<any> {
    return this.post(API_ENDPOINTS.EMAIL_VERIFY, { email, code });
  }

  // User methods
  async getUserXp(): Promise<{ xp: number; monthlyXp: number }> {
    return this.get(API_ENDPOINTS.USER_XP);
  }

  async completeOnboarding(data: {
    name: string;
    username: string;
    phoneNumber?: string;
    email?: string;
  }): Promise<any> {
    return this.post(API_ENDPOINTS.USER_ONBOARDING, data);
  }

  // User settings methods
  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    return this.get<{ available: boolean }>(API_ENDPOINTS.USER_SETTINGS_USERNAME_CHECK, {
      username,
    });
  }

  async uploadProfileImage(userId: string, newImage: string): Promise<{ message: string }> {
    return this.post<{ message: string }>(API_ENDPOINTS.USER_SETTINGS_IMAGE_UPLOAD, {
      userId,
      newImage,
    });
  }

  async removeProfileImage(userId: string): Promise<{ message: string }> {
    return this.post<{ message: string }>(API_ENDPOINTS.USER_SETTINGS_REMOVE_IMAGE, {
      userId,
    });
  }

  async saveProfileSettings(payload: {
    id: string;
    name: string;
    username: string;
    tag: string;
    privacy?: boolean;
  }): Promise<any> {
    return this.post(API_ENDPOINTS.USER_SETTINGS_UPLOAD_ONBOARDING, payload);
  }

  // Route methods
  async searchRoutes(params: {
    text?: string;
    userId?: string;
    take?: number;
    skip?: number;
  }): Promise<any> {
    return this.get(API_ENDPOINTS.ROUTES_SEARCH, params as Record<string, string>);
  }

  async getRoutesByWall(wall: string, userId?: string): Promise<any> {
    const params: Record<string, string> = { wall };
    if (userId) params.userId = userId;
    return this.get(API_ENDPOINTS.ROUTES_BY_WALL, params);
  }

  async getAllRoutesNonArchive(userId?: string): Promise<{ data: any[] }> {
    const params: Record<string, string> = {};
    if (userId) params.userId = userId;
    return this.get<{ data: any[] }>(API_ENDPOINTS.ROUTES_ALL_NON_ARCHIVE, params);
  }

  async getRouteById(routeId: string, userId?: string): Promise<any> {
    const params: Record<string, string> = { routeId };
    if (userId) params.userId = userId;
    return this.get(API_ENDPOINTS.ROUTE_BY_ID, params);
  }

  async completeRoute(data: {
    userId: string;
    routeId: string;
    flash?: boolean;
    date?: string;
  }): Promise<any> {
    return this.post(API_ENDPOINTS.ROUTE_COMPLETE, data);
  }

  async attemptRoute(data: { userId: string; routeId: string }): Promise<any> {
    return this.post(API_ENDPOINTS.ROUTE_ATTEMPT, data);
  }

  async deleteRoute(routeIds: string[]): Promise<{ message: string }> {
    return this.delete<{ message: string }>(API_ENDPOINTS.ROUTE_DELETE, {
      routes: routeIds.map((id) => ({ id })),
    });
  }

  async archiveRoute(routeIds: string[]): Promise<{ message: string }> {
    return this.patch<{ message: string }>(API_ENDPOINTS.ROUTE_ARCHIVE, {
      routes: routeIds.map((id) => ({ id })),
    });
  }

  async gradeRoute(data: { userId: string; routeId: string; selectedGrade: string }): Promise<any> {
    return this.post(API_ENDPOINTS.ROUTE_GRADE, data);
  }

  // Dashboard methods
  async getDashboardCompletions(): Promise<{ data: any[] }> {
    return this.get<{ data: any[] }>(API_ENDPOINTS.DASHBOARD_COMPLETIONS);
  }

  async getDashboardAttempts(): Promise<{ data: any[] }> {
    return this.get<{ data: any[] }>(API_ENDPOINTS.DASHBOARD_ATTEMPTS);
  }

  async deleteCompletion(completionId: number): Promise<any> {
    return this.delete(API_ENDPOINTS.DELETE_COMPLETION, { completionId });
  }

  async deleteAttempt(attemptId: number): Promise<any> {
    return this.delete(API_ENDPOINTS.DELETE_ATTEMPT, { attemptId });
  }

  // Leaderboard methods
  async getLeaderboard(): Promise<{
    monthly: {
      user: {
        id: string;
        name: string | null;
        username: string | null;
        image: string | null;
        totalXp: number;
      };
      xp: number;
    }[];
    total: {
      id: string;
      name: string | null;
      username: string | null;
      image: string | null;
      totalXp: number;
    }[];
    userMonthlyRank: number | null;
    userTotalRank: number | null;
    currentMonth: string;
  }> {
    return this.get(API_ENDPOINTS.LEADERBOARD);
  }

  // Public user profile (for leaderboard and elsewhere)
  async getPublicUserProfile(userId: string): Promise<{
    id: string;
    username: string | null;
    image: string | null;
    totalXp: number;
    highestRopeGrade: string | null;
    highestBoulderGrade: string | null;
    last5Completions: { grade: string; title: string; color: string }[];
  }> {
    return this.get(`${API_ENDPOINTS.USER_PUBLIC_PROFILE}/${userId}/profile`);
  }
}

export const api = new ApiService();
