// Tests de composant — PropertyCard (React Native Testing Library)
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Isole la carte : devise déterministe + badge boost neutralisé
jest.mock('@/hooks/useCurrency', () => ({ useCurrency: () => ({ formatPrice: (n: number) => `${n} FCFA`, currency: 'FCFA' }) }));
jest.mock('@/components/boost/BoostBadge', () => ({ BoostBadge: () => null }));

import { PropertyCard } from '../../src/components/property/PropertyCard';

const property = {
  id: 'p1', title: 'Villa Cocody', city: 'Abidjan', pricePerNight: 85000,
  mainImageUrl: 'https://cdn/x.jpg', rating: 4.8, reviewCount: 12,
};

describe('<PropertyCard />', () => {
  it('affiche le titre et la ville', () => {
    const { getByText } = render(<PropertyCard property={property} onPress={() => {}} />);
    expect(getByText('Villa Cocody')).toBeTruthy();
    expect(getByText(/Abidjan/)).toBeTruthy();
  });

  it('affiche la note formatée', () => {
    const { getByText } = render(<PropertyCard property={property} onPress={() => {}} />);
    expect(getByText('4.8')).toBeTruthy();
  });

  it('déclenche onPress au tap sur la carte', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PropertyCard property={property} onPress={onPress} />);
    fireEvent.press(getByText('Villa Cocody'));
    expect(onPress).toHaveBeenCalled();
  });

  it('affiche le bouton favori et déclenche onFavorite', () => {
    const onFavorite = jest.fn();
    const { getByText } = render(<PropertyCard property={property} onPress={() => {}} onFavorite={onFavorite} isFavorite={false} />);
    fireEvent.press(getByText('🤍'));
    expect(onFavorite).toHaveBeenCalled();
  });

  it('affiche le badge Premium selon badgeType', () => {
    const { getByText } = render(<PropertyCard property={{ ...property, badgeType: 'premium' }} onPress={() => {}} />);
    expect(getByText(/Premium/)).toBeTruthy();
  });
});
