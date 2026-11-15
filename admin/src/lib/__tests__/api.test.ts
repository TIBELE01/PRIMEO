import { normalizeApiBase } from '../api';

// Vérifie la correction du bug « /api manquant » : la base se termine toujours
// par exactement un /api, quelle que soit la forme de NEXT_PUBLIC_API_URL.
describe('normalizeApiBase', () => {
  it('ajoute /api quand il est absent', () => {
    expect(normalizeApiBase('https://api-primeo.onrender.com')).toBe('https://api-primeo.onrender.com/api');
  });
  it('ne double pas /api quand il est déjà présent', () => {
    expect(normalizeApiBase('https://api-primeo.onrender.com/api')).toBe('https://api-primeo.onrender.com/api');
  });
  it('supprime les slashs de fin avant d\'ajouter /api', () => {
    expect(normalizeApiBase('https://x.onrender.com/')).toBe('https://x.onrender.com/api');
    expect(normalizeApiBase('https://x.onrender.com/api/')).toBe('https://x.onrender.com/api');
  });
  it('retombe sur localhost si non défini', () => {
    expect(normalizeApiBase(undefined)).toBe('http://localhost:4000/api');
    expect(normalizeApiBase(null)).toBe('http://localhost:4000/api');
  });
});
