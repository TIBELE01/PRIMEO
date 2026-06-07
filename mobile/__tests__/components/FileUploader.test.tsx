// Test de composant (RNTL) — FileUploader, brique du parcours KYC / inscription pro.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FileUploader } from '../../src/components/form/FileUploader';

describe('FileUploader', () => {
  it('affiche le libellé et l\'invite par défaut', () => {
    const { getByText } = render(<FileUploader label="Pièce d'identité" onPick={jest.fn()} />);
    expect(getByText("Pièce d'identité")).toBeTruthy();
    expect(getByText('Choisir un fichier')).toBeTruthy();
  });

  it('affiche le nom du fichier sélectionné', () => {
    const { getByText, queryByText } = render(
      <FileUploader label="RCCM" fileName="rccm.pdf" onPick={jest.fn()} />,
    );
    expect(getByText('rccm.pdf')).toBeTruthy();
    expect(queryByText('Choisir un fichier')).toBeNull();
  });

  it('déclenche onPick au clic', () => {
    const onPick = jest.fn();
    const { getByText } = render(<FileUploader label="Doc" onPick={onPick} />);
    fireEvent.press(getByText('Choisir un fichier'));
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('affiche le message d\'erreur quand fourni', () => {
    const { getByText } = render(<FileUploader label="Doc" onPick={jest.fn()} error="Fichier requis" />);
    expect(getByText('Fichier requis')).toBeTruthy();
  });
});
