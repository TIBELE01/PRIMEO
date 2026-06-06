/**
 * Expo application configuration
 * See https://docs.expo.dev/versions/latest/config/app/
 *
 * ⚠️  Features that require an EAS Development Build (NOT Expo Go):
 *   • VirtualTourScreen — uses @react-three/fiber/native (compiled native GL)
 *
 *   Build commands:
 *     eas build --profile development --platform ios
 *     eas build --profile development --platform android
 *   Launch dev client after installing the build:
 *     expo start --dev-client
 *
 * Note: written as CommonJS (module.exports) to avoid the Node.js ESM
 * directory-import restriction that occurs when app.config.ts is compiled
 * to an ES module and tries to import 'expo/config' as a directory.
 */

/** @returns {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  name: 'Primeo',
  slug: 'primeo',
  scheme: 'primeo',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1B5E20',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'ci.primeo.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'Primeo uses your location to show nearby properties.',
      NSCameraUsageDescription: 'Primeo needs camera access for profile photos and KYC documents.',
      NSPhotoLibraryUsageDescription: 'Primeo needs photo library access for property images.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1B5E20',
    },
    package: 'ci.primeo.app',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'HIGH_SAMPLING_RATE_SENSORS',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/icon.png',
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
    onesignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '',
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '',
    },
  },
  plugins: [
    'expo-font',
    ['expo-notifications', { icon: './assets/notification-icon.png', color: '#1B5E20' }],
    ['expo-secure-store'],
    [
      'expo-build-properties',
      {
        android: { compileSdkVersion: 35, targetSdkVersion: 35 },
        ios: { deploymentTarget: '16.0' },
      },
    ],
  ],
});
