/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts'],
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageReporters: ['text-summary', 'lcov', 'html'],

  // Seuils de couverture — la CI échoue si la couverture passe sous ces planchers.
  // Plancher global volontairement bas (l'historique part de ~5 %), à relever
  // progressivement (objectif 60 % — voir docs/guides/strategie-tests.md).
  // Les modules CRITIQUES (paiements, réservations, abonnements, webhooks) ont
  // des seuils dédiés bien plus élevés pour verrouiller leur couverture.
  coverageThreshold: {
    // Note : Jest exclut du bucket "global" les fichiers ayant un seuil dédié
    // ci-dessous ; le plancher global porte donc sur le reste du code (non encore
    // couvert). Valeurs basses à relever au fil des sprints.
    global: {
      statements: 22,
      branches: 5,
      functions: 3,
      lines: 24,
    },
    './src/modules/payments/services/genius-pay.service.ts': {
      statements: 85, branches: 60, functions: 90, lines: 85,
    },
    './src/modules/payments/services/refund.service.ts': {
      statements: 85, branches: 70, functions: 90, lines: 90,
    },
    './src/modules/payments/payments.service.ts': {
      statements: 85, branches: 70, functions: 70, lines: 85,
    },
    './src/modules/bookings/services/pricing.service.ts': {
      statements: 90, branches: 90, functions: 100, lines: 90,
    },
    './src/modules/bookings/services/cancellation.service.ts': {
      statements: 95, branches: 95, functions: 100, lines: 95,
    },
    './src/modules/webhooks/webhooks.service.ts': {
      statements: 50, branches: 30, functions: 40, lines: 50,
    },
    './src/modules/subscriptions/subscriptions.service.ts': {
      statements: 35, branches: 25, functions: 20, lines: 38,
    },
    './src/modules/auth/auth.service.ts': {
      statements: 55, branches: 50, functions: 40, lines: 55,
    },
  },
};
