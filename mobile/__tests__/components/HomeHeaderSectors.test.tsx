// Rendu de l'accueil selon les secteurs activés par l'admin :
// une carte désactivée n'est pas affichée.
import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeHeader } from '../../src/screens/client/Home/HomeHeader';
import { ALL_SECTORS_ENABLED } from '../../src/utils/sectors';

describe('HomeHeader — cartes de secteur', () => {
  it('affiche les quatre cartes par défaut', () => {
    const { getByText } = render(<HomeHeader />);
    expect(getByText('Résidences')).toBeTruthy();
    expect(getByText('Hôtels')).toBeTruthy();
    expect(getByText('Immobilier')).toBeTruthy();
    expect(getByText('Restaurants')).toBeTruthy();
  });

  it('masque la carte Restaurants quand le secteur est désactivé', () => {
    const { queryByText, getByText } = render(
      <HomeHeader sectors={{ ...ALL_SECTORS_ENABLED, restaurant_enabled: false }} />,
    );
    expect(queryByText('Restaurants')).toBeNull();
    expect(getByText('Résidences')).toBeTruthy();
    expect(getByText('Hôtels')).toBeTruthy();
    expect(getByText('Immobilier')).toBeTruthy();
  });

  it('réaffiche la carte à la réactivation', () => {
    const off = { ...ALL_SECTORS_ENABLED, restaurant_enabled: false };
    const { queryByText, rerender } = render(<HomeHeader sectors={off} />);
    expect(queryByText('Restaurants')).toBeNull();
    rerender(<HomeHeader sectors={ALL_SECTORS_ENABLED} />);
    expect(queryByText('Restaurants')).toBeTruthy();
  });

  it('adapte le titre quand Résidence et Hôtel sont désactivés', () => {
    const { queryByText } = render(
      <HomeHeader sectors={{ ...ALL_SECTORS_ENABLED, residence_enabled: false, hotel_enabled: false }} />,
    );
    expect(queryByText('Résidences')).toBeNull();
    expect(queryByText('Hôtels')).toBeNull();
    expect(queryByText(/Résidence ou Hôtel/)).toBeNull();
  });

  it('affiche un message quand toutes les cartes sont désactivées', () => {
    const { getByText } = render(
      <HomeHeader sectors={{ residence_enabled: false, hotel_enabled: false, immobilier_enabled: false, restaurant_enabled: false }} />,
    );
    expect(getByText(/temporairement indisponibles/)).toBeTruthy();
  });
});
