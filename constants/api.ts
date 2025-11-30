// API Configuration
// TODO: Replace with your actual API URL
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.vertixclimb.com';

export const API_ENDPOINTS = {
  // Mobile Auth endpoints (separate from NextAuth)
  AUTH_MOBILE_SIGNIN: '/api/mobile-auth/signin',
  AUTH_SESSION: '/api/mobile-auth/session',
  AUTH_SIGNOUT: '/api/mobile-auth/signout',
  AUTH_OAUTH: '/api/mobile-auth/oauth',
  
  // User endpoints
  USER_XP: '/api/user/xp',
  USER_PROFILE: '/api/user/profile',
  
  // Route endpoints
  ROUTES_SEARCH: '/api/routes/search-routes',
  ROUTES_BY_WALL: '/api/routes/get-wall-routes-non-archive',
  ROUTES_ALL_NON_ARCHIVE: '/api/mobile/routes/fetch-all-routes-non-archive',
  ROUTE_BY_ID: '/api/routes/get-route-by-id',
  ROUTE_COMPLETE: '/api/routes/complete-route',
  ROUTE_ATTEMPT: '/api/routes/attempt-route',
  
  // Dashboard endpoints
  DASHBOARD_COMPLETIONS: '/api/mobile/dashboard/completions',
  DASHBOARD_ATTEMPTS: '/api/mobile/dashboard/attempts',
} as const;

