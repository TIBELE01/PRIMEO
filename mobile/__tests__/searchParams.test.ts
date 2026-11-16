import { toApiSearchParams } from '../src/services/api/endpoints/properties';

describe('toApiSearchParams', () => {
  it('convertit les types de l\'application en propertyType de l\'API', () => {
    expect(toApiSearchParams({ type: 'apartment', city: 'Abidjan' })).toEqual({ propertyType: 'residence', city: 'Abidjan' });
    expect(toApiSearchParams({ type: 'villa' })).toEqual({ propertyType: 'residence' });
    expect(toApiSearchParams({ type: 'hotel' })).toEqual({ propertyType: 'hotel' });
    expect(toApiSearchParams({ type: 'restaurant' })).toEqual({ propertyType: 'restaurant' });
    expect(toApiSearchParams({ type: 'real_estate' })).toEqual({ propertyType: 'immobilier_achat,immobilier_location,immobilier_terrain' });
  });
  it('laisse les paramètres sans type et un propertyType explicite intacts', () => {
    expect(toApiSearchParams({ sortBy: 'rating', limit: 8 })).toEqual({ sortBy: 'rating', limit: 8 });
    expect(toApiSearchParams({ type: '', page: 2 })).toEqual({ page: 2 });
    expect(toApiSearchParams({ type: 'hotel', propertyType: 'residence' })).toEqual({ propertyType: 'residence' });
  });
  it('ignore un type inconnu au lieu d\'envoyer une valeur invalide', () => {
    expect(toApiSearchParams({ type: 'guesthouse' })).toEqual({});
  });
});
