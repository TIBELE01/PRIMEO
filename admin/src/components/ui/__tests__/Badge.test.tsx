import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('affiche son contenu', () => {
    render(<Badge>Actif</Badge>);
    expect(screen.getByText('Actif')).toBeInTheDocument();
  });

  it('applique la classe de la variante demandée', () => {
    render(<Badge variant="danger">Banni</Badge>);
    expect(screen.getByText('Banni').className).toContain('danger');
  });

  it('inclut une variante sombre (dark:) pour le thème', () => {
    render(<Badge variant="success">OK</Badge>);
    expect(screen.getByText('OK').className).toContain('dark:');
  });
});
