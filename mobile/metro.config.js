const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

// EXPO_NO_METRO_WORKSPACE_ROOT=1 prevents Expo from using the pnpm workspace
// root (/PRIMEO) as the Metro server root instead of the mobile project root.
// Without it, Metro resolves entry points relative to /PRIMEO and fails to
// find index.js, which only exists in /PRIMEO/mobile.
process.env.EXPO_NO_METRO_WORKSPACE_ROOT = '1';

const config = getDefaultConfig(projectRoot);

// Watch both mobile project and monorepo root so cross-package imports resolve
config.watchFolders = [monorepoRoot];

// Look for node_modules in both mobile and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Support for Three.js GLB/GLTF model files
config.resolver.assetExts.push('glb', 'gltf', 'bin');
config.resolver.sourceExts.push('cjs');

// Web stubs — redirect native-only modules to web-friendly shims
const WEB_STUBS = {
  'react-native-maps':                    path.resolve(projectRoot, 'web-stubs/react-native-maps.js'),
  'react-native-webview':                 path.resolve(projectRoot, 'web-stubs/react-native-webview.js'),
  'expo-notifications':                   path.resolve(projectRoot, 'web-stubs/expo-notifications.js'),
  'expo-secure-store':                    path.resolve(projectRoot, 'web-stubs/expo-secure-store.js'),
  'expo-document-picker':                 path.resolve(projectRoot, 'web-stubs/expo-document-picker.js'),
  '@react-three/fiber/native':            path.resolve(projectRoot, 'web-stubs/react-three-fiber-native.js'),
  '@react-native-community/netinfo':      path.resolve(projectRoot, 'web-stubs/netinfo.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return { filePath: WEB_STUBS[moduleName], type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
