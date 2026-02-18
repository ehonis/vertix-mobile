// API Configuration
// TODO: Replace with your actual API URL
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.vertixclimb.com';

export const API_ENDPOINTS = {
  // Mobile Auth endpoints (separate from NextAuth)
  AUTH_MOBILE_SIGNIN: '/api/mobile-auth/signin',
  AUTH_SESSION: '/api/mobile-auth/session',
  AUTH_SIGNOUT: '/api/mobile-auth/signout',
  AUTH_OAUTH: '/api/mobile-auth/oauth',
  
  // Phone Auth endpoints
  PHONE_SEND_VERIFICATION: '/api/auth/phone/send-verification',
  PHONE_VERIFY: '/api/auth/phone/verify',
  
  // Email Auth endpoints
  EMAIL_SEND_VERIFICATION: '/api/auth/email/send-verification',
  EMAIL_VERIFY: '/api/auth/email/verify',
  
  // User endpoints
  USER_XP: '/api/user/xp',
  USER_PROFILE: '/api/user/profile',
  USER_ONBOARDING: '/api/user/onboarding',

  // User settings endpoints
  USER_SETTINGS_USERNAME_CHECK: '/api/user/settings/userNameCheck',
  USER_SETTINGS_IMAGE_UPLOAD: '/api/user/settings/imageUpload',
  USER_SETTINGS_REMOVE_IMAGE: '/api/user/settings/removeImage',
  USER_SETTINGS_UPLOAD_ONBOARDING: '/api/user/settings/uploadOnboarding',
  
  // Route endpoints
  ROUTES_SEARCH: '/api/routes/search-routes',
  ROUTES_BY_WALL: '/api/routes/get-wall-routes-non-archive',
  ROUTES_ALL_NON_ARCHIVE: '/api/mobile/routes/fetch-all-routes-non-archive',
  ROUTE_BY_ID: '/api/routes/get-route-by-id',
  ROUTE_COMPLETE: '/api/mobile/routes/complete-route',
  ROUTE_ATTEMPT: '/api/mobile/routes/attempt-route',
  ROUTE_GRADE: '/api/mobile/routes/grade',
  ROUTE_DELETE: '/api/routes/edit/delete-route',
  ROUTE_ARCHIVE: '/api/routes/edit/archive-route',
  
  // Dashboard endpoints
  DASHBOARD_COMPLETIONS: '/api/mobile/dashboard/completions',
  DASHBOARD_ATTEMPTS: '/api/mobile/dashboard/attempts',
  DELETE_COMPLETION: '/api/mobile/routes/delete-completion',
  DELETE_ATTEMPT: '/api/mobile/routes/delete-attempt',
  
  // Leaderboard endpoints
  LEADERBOARD: '/api/mobile/leaderboard',

  // Public user profile (append /:userId/profile)
  USER_PUBLIC_PROFILE: '/api/mobile/user',
} as const;

