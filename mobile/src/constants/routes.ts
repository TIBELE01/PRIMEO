// Route name constants — single source of truth for all screen names

// Root stack
export const ROUTES = {
  // Auth flow
  AUTH: {
    STACK:           'AuthStack',
    WELCOME:         'Welcome',
    LOGIN:           'Login',
    REGISTER:        'Register',
    VERIFY_PHONE:    'VerifyPhone',
    VERIFY_TOTP:     'VerifyTotp',
    FORGOT_PASSWORD: 'ForgotPassword',
    RESET_PASSWORD:  'ResetPassword',
  },

  // Client tab navigator
  CLIENT: {
    TABS:            'ClientTabs',
    HOME:            'Home',
    SEARCH:          'Search',
    BOOKINGS:        'Bookings',
    MESSAGES:        'Messages',
    PROFILE:         'Profile',
  },

  // Professional tab navigator
  PRO: {
    TABS:            'ProTabs',
    DASHBOARD:       'Dashboard',
    LISTINGS:        'Listings',
    RESERVATIONS:    'Reservations',
    MESSAGES:        'ProMessages',
    PROFILE:         'ProProfile',
  },

  // Shared screens (pushed on root stack)
  PROPERTY_DETAIL:   'PropertyDetail',
  BOOKING_DETAIL:    'BookingDetail',
  CHAT:              'Chat',
  PAYMENT:           'Payment',
  REVIEW:            'Review',
  DISPUTE:           'Dispute',
  SETTINGS:          'Settings',
  SUPPORT:           'Support',
  REFERRAL:          'Referral',
  SUBSCRIPTION:      'Subscription',
  BOOST:             'Boost',
  ADD_PROPERTY:      'AddProperty',
  EDIT_PROPERTY:     'EditProperty',
} as const;
