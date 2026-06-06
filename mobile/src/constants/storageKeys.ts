// SecureStore / AsyncStorage key names — single source of truth

export const STORAGE_KEYS = {
  // Auth tokens (SecureStore — encrypted)
  ACCESS_TOKEN:  'accessToken',
  REFRESH_TOKEN: 'refreshToken',

  // User profile snapshot (AsyncStorage — used to restore session UI instantly)
  USER_PROFILE: 'userProfile',

  // User preferences (AsyncStorage)
  THEME_MODE:          'themeMode',         // 'light' | 'dark' | 'blue' | 'auto'
  SELECTED_CURRENCY:   'selectedCurrency',
  LANGUAGE:            'language',

  // Onboarding
  HAS_SEEN_ONBOARDING: 'hasSeenOnboarding',

  // Push notifications
  PUSH_TOKEN: 'pushToken',

  // Search history
  SEARCH_HISTORY: 'searchHistory',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
