// Tests de composant — Button (React Native Testing Library)
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../src/components/ui/Button';

describe('<Button />', () => {
  it('affiche le libellé (prop label)', () => {
    const { getByText } = render(<Button label="Réserver" onPress={() => {}} />);
    expect(getByText('Réserver')).toBeTruthy();
  });

  it('accepte aussi la prop title (alias)', () => {
    const { getByText } = render(<Button title="Continuer" onPress={() => {}} />);
    expect(getByText('Continuer')).toBeTruthy();
  });

  it('déclenche onPress au tap', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Valider" onPress={onPress} />);
    fireEvent.press(getByText('Valider'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('affiche un spinner et masque le texte en état loading', () => {
    const { queryByText, UNSAFE_getByType } = render(<Button label="Envoi" onPress={() => {}} isLoading />);
    expect(queryByText('Envoi')).toBeNull();
    // ActivityIndicator présent
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('ne déclenche pas onPress quand disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Bloqué" onPress={onPress} disabled />);
    fireEvent.press(getByText('Bloqué'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
