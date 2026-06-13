// Configuration Jest dédiée aux tests de COMPOSANTS (React Native Testing Library).
// Utilise le vrai preset jest-expo (rendu natif simulé) — distinct de la config
// principale (package.json > jest) qui stubbe react-native pour les tests de logique.
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/components/**/*.test.tsx'],
  setupFiles: ['<rootDir>/__tests__/component-setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
  ],
};
