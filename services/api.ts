import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
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
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
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

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth methods
  async signInWithToken(token: string): Promise<void> {
    await this.setToken(token);
  }

  async signInWithOAuth(provider: string, accessToken: string): Promise<{ token: string; user: any }> {
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
    return this.post<{ message: string }>(
      API_ENDPOINTS.AUTH_MOBILE_SIGNIN,
      { email, method: 'email' }
    );
  }

  async getSession(): Promise<any> {
    return this.get(API_ENDPOINTS.AUTH_SESSION);
  }

  async signOut(): Promise<void> {
    await this.post(API_ENDPOINTS.AUTH_SIGNOUT);
    await this.removeToken();
  }

  // User methods
  async getUserXp(): Promise<{ xp: number; monthlyXp: number }> {
    return this.get(API_ENDPOINTS.USER_XP);
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

  // Dashboard methods
  async getDashboardCompletions(): Promise<{ data: any[] }> {
    return this.get<{ data: any[] }>(API_ENDPOINTS.DASHBOARD_COMPLETIONS);
  }

  async getDashboardAttempts(): Promise<{ data: any[] }> {
    return this.get<{ data: any[] }>(API_ENDPOINTS.DASHBOARD_ATTEMPTS);
  }
}

export const api = new ApiService();

