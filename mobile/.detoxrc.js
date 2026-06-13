/**
 * Configuration Detox (E2E mobile).
 *
 * Primeo est une app Expo *managed* : Detox a besoin d'un binaire natif. Avant
 * de builder/tester, générer les projets natifs :
 *     npm run e2e:prebuild        # expo prebuild --platform android
 * puis :
 *     npm run e2e:build:android   # detox build (gradle)
 *     npm run e2e:test:android    # detox test (émulateur Android)
 *
 * Voir docs/E2E-DETOX.md pour les pré-requis (SDK Android, AVD) et la CI.
 * @type {Detox.DetoxConfig}
 */
module.exports = {
  testRunner: {
    args: { $0: 'jest', config: 'e2e/jest.config.js' },
    jest: { setupTimeout: 120000 },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..',
      reversePorts: [8081],
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release && cd ..',
    },
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Primeo.app',
      build:
        'xcodebuild -workspace ios/Primeo.xcworkspace -scheme Primeo -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_6_API_34' },
    },
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
  },
  configurations: {
    'android.emu.debug': { device: 'emulator', app: 'android.debug' },
    'android.emu.release': { device: 'emulator', app: 'android.release' },
    'ios.sim.debug': { device: 'simulator', app: 'ios.debug' },
  },
};
