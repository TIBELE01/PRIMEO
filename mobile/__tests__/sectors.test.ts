// Secteurs activables par l'admin (cartes de l'accueil) — règles appliquées par l'application
import {
  ALL_SECTORS_ENABLED,
  parseSectorFlags,
  isSectorEnabled,
  isPropertyTypeEnabled,
  isAccountTypeEnabled,
  filterEnabledProperties,
  filterEnabledOptions,
  sectorOfAccountType,
  sectorOfPropertyType,
  type SectorFlags,
} from '../src/utils/sectors';

const RESTAURANT_OFF: SectorFlags = { ...ALL_SECTORS_ENABLED, restaurant_enabled: false };

// Options telles que définies dans les écrans d'inscription
const ACCOUNT_OPTIONS = [
  { value: 'client' },
  { value: 'professional_hebergement' },
  { value: 'professional_hotel' },
  { value: 'professional_immobilier' },
  { value: 'restaurateur' },
];
// Filtres de type de l'écran de recherche (valeurs normalisées côté application)
const SEARCH_TYPES = [
  { label: 'Tous', value: '' },
  { label: 'Résidences', value: 'apartment' },
  { label: 'Hôtels', value: 'hotel' },
  { label: 'Immobilier', value: 'real_estate' },
  { label: 'Restaurants', value: 'restaurant' },
  { label: 'Villas', value: 'villa' },
];

describe('parseSectorFlags', () => {
  it('lit la réponse de GET /api/config/features', () => {
    expect(parseSectorFlags({ residence_enabled: true, hotel_enabled: true, immobilier_enabled: true, restaurant_enabled: false }))
      .toEqual(RESTAURANT_OFF);
  });

  it('considère tout activé si la réponse est vide, absente ou incomplète', () => {
    expect(parseSectorFlags(undefined)).toEqual(ALL_SECTORS_ENABLED);
    expect(parseSectorFlags(null)).toEqual(ALL_SECTORS_ENABLED);
    expect(parseSectorFlags({})).toEqual(ALL_SECTORS_ENABLED);
    expect(parseSectorFlags({ hotel_enabled: false })).toEqual({ ...ALL_SECTORS_ENABLED, hotel_enabled: false });
  });

  it('ne désactive que sur un false explicite', () => {
    expect(parseSectorFlags({ restaurant_enabled: 'false', hotel_enabled: 0 })).toEqual(ALL_SECTORS_ENABLED);
  });
});

describe('carte Restaurant désactivée', () => {
  it('la carte Restaurant n\'est plus affichable, les trois autres le restent', () => {
    expect(isSectorEnabled(RESTAURANT_OFF, 'restaurant')).toBe(false);
    expect(isSectorEnabled(RESTAURANT_OFF, 'residence')).toBe(true);
    expect(isSectorEnabled(RESTAURANT_OFF, 'hotel')).toBe(true);
    expect(isSectorEnabled(RESTAURANT_OFF, 'immobilier')).toBe(true);
  });

  it('le type de compte « Restaurateur » disparaît de l\'inscription, pas le compte client', () => {
    const options = filterEnabledOptions(ACCOUNT_OPTIONS, RESTAURANT_OFF, (o) => sectorOfAccountType(o.value));
    expect(options.map((o) => o.value)).toEqual([
      'client', 'professional_hebergement', 'professional_hotel', 'professional_immobilier',
    ]);
    expect(isAccountTypeEnabled(RESTAURANT_OFF, 'restaurateur')).toBe(false);
    expect(isAccountTypeEnabled(RESTAURANT_OFF, 'client')).toBe(true);
  });

  it('le filtre « Restaurants » disparaît de la recherche, « Tous » reste', () => {
    const types = filterEnabledOptions(SEARCH_TYPES, RESTAURANT_OFF, (t) => sectorOfPropertyType(t.value));
    expect(types.map((t) => t.label)).toEqual(['Tous', 'Résidences', 'Hôtels', 'Immobilier', 'Villas']);
  });

  it('les restaurants sont retirés des listes (résultats, accueil, cache hors ligne)', () => {
    const items = [
      { id: '1', type: 'restaurant' },
      { id: '2', type: 'hotel' },
      { id: '3', type: 'apartment' },
      { id: '4', propertyType: 'restaurant' }, // forme brute de l'API
      { id: '5', type: 'real_estate' },
    ];
    expect(filterEnabledProperties(items, RESTAURANT_OFF).map((p) => p.id)).toEqual(['2', '3', '5']);
  });

  it('réactivation : tout redevient visible', () => {
    const items = [{ id: '1', type: 'restaurant' }, { id: '2', type: 'hotel' }];
    expect(filterEnabledProperties(items, ALL_SECTORS_ENABLED)).toHaveLength(2);
    expect(filterEnabledOptions(ACCOUNT_OPTIONS, ALL_SECTORS_ENABLED, (o) => sectorOfAccountType(o.value))).toHaveLength(5);
    expect(filterEnabledOptions(SEARCH_TYPES, ALL_SECTORS_ENABLED, (t) => sectorOfPropertyType(t.value))).toHaveLength(6);
  });
});

describe('correspondance type ↔ secteur', () => {
  it('rattache les trois types immobiliers au secteur Immobilier', () => {
    const off: SectorFlags = { ...ALL_SECTORS_ENABLED, immobilier_enabled: false };
    for (const t of ['immobilier_location', 'immobilier_achat', 'immobilier_terrain', 'real_estate', 'immobilier']) {
      expect(isPropertyTypeEnabled(off, t)).toBe(false);
    }
    expect(isPropertyTypeEnabled(off, 'hotel')).toBe(true);
    expect(isAccountTypeEnabled(off, 'professional_immobilier')).toBe(false);
  });

  it('rattache résidence/appartement/villa au secteur Résidence', () => {
    const off: SectorFlags = { ...ALL_SECTORS_ENABLED, residence_enabled: false };
    for (const t of ['residence', 'apartment', 'villa']) expect(isPropertyTypeEnabled(off, t)).toBe(false);
    expect(isAccountTypeEnabled(off, 'professional_hebergement')).toBe(false);
  });

  it('laisse visible un type inconnu ou absent (aucun secteur)', () => {
    const allOff: SectorFlags = { residence_enabled: false, hotel_enabled: false, immobilier_enabled: false, restaurant_enabled: false };
    expect(isPropertyTypeEnabled(allOff, 'inconnu')).toBe(true);
    expect(isPropertyTypeEnabled(allOff, undefined)).toBe(true);
    expect(isAccountTypeEnabled(allOff, 'admin')).toBe(true);
  });
});
