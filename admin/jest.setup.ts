// Matchers DOM (@testing-library/jest-dom) pour tous les tests.
import '@testing-library/jest-dom';

// Filtre l'avertissement COSMÉTIQUE de dépréciation `ReactDOMTestUtils.act`
// (Testing Library sur React 18 utilise encore react-dom/test-utils ; aucun
// impact fonctionnel). Les autres erreurs/avertissements restent visibles.
const originalError = console.error.bind(console);
jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
  const first = typeof args[0] === 'string' ? args[0] : '';
  if (first.includes('ReactDOMTestUtils.act') || first.includes('react-dom/test-utils')) return;
  originalError(...(args as []));
});
