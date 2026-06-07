// Setup pour les tests de composants (RNTL) — contrairement à setup.ts, on NE
// stubbe PAS react-native : le preset jest-expo fournit le vrai moteur de rendu.
// On se contente de mocker les modules natifs Expo non disponibles sous Node.
// (RNTL v13 fournit ses propres matchers — pas besoin de jest-native.)

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'test-project-id' } } } },
}));
