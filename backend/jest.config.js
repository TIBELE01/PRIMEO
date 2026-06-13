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
    './src/modules/auth/auth.service.ts': {
      statements: 55, branches: 50, functions: 40, lines: 55,
    },

    // ── Core business ≥ 70 % — verrouillé en CI (marges sous le niveau atteint) ──
    // Métrique-phare = statements/lines (≥ 72-95 %). Branches/functions fixées
    // sous le niveau atteint (secondaires, plus difficiles à saturer).
    './src/modules/bookings/bookings.service.ts': {
      statements: 75, branches: 50, functions: 58, lines: 78,
    },
    './src/modules/subscriptions/subscriptions.service.ts': {
      statements: 80, branches: 45, functions: 60, lines: 85,
    },
    './src/modules/boosts/boosts.service.ts': {
      statements: 85, branches: 55, functions: 75, lines: 88,
    },
    './src/modules/referrals/referrals.service.ts': {
      statements: 88, branches: 65, functions: 68, lines: 90,
    },
    './src/modules/notifications/notifications.service.ts': {
      statements: 80, branches: 55, functions: 68, lines: 82,
    },
    './src/modules/wallets/wallets.service.ts': {
      statements: 95, branches: 80, functions: 100, lines: 95,
    },
    './src/modules/webhooks/handlers/genius-pay.handler.ts': {
      statements: 72, branches: 45, functions: 38, lines: 72,
    },
  },
};
