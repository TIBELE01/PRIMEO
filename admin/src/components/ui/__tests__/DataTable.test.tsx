import { fireEvent, render, screen } from '@testing-library/react';
import { Table, Pagination } from '../Table';
import { StatusTabs } from '../StatusTabs';

interface Row { id: string; name: string }
const rows: Row[] = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];
const columns = [{ key: 'name', header: 'Nom', sortable: true }];

describe('Table', () => {
  it('sélectionne toutes les lignes de la page', () => {
    const onSelectionChange = jest.fn();
    render(<Table columns={columns} data={rows} keyExtractor={(r: Row) => r.id} selectable selectedIds={new Set()} onSelectionChange={onSelectionChange} />);
    fireEvent.click(screen.getByLabelText('Tout sélectionner'));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1', '2']));
  });

  it('désélectionne tout quand tout est déjà sélectionné', () => {
    const onSelectionChange = jest.fn();
    render(<Table columns={columns} data={rows} keyExtractor={(r: Row) => r.id} selectable selectedIds={new Set(['1', '2'])} onSelectionChange={onSelectionChange} />);
    fireEvent.click(screen.getByLabelText('Tout sélectionner'));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it('déclenche le tri au clic sur un en-tête triable', () => {
    const onSort = jest.fn();
    render(<Table columns={columns} data={rows} keyExtractor={(r: Row) => r.id} sortKey="name" sortDir="asc" onSort={onSort} />);
    fireEvent.click(screen.getByRole('button', { name: /Nom/ }));
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it("ne déclenche pas le clic de ligne en cochant la case", () => {
    const onRowClick = jest.fn();
    render(<Table columns={columns} data={rows} keyExtractor={(r: Row) => r.id} selectable selectedIds={new Set()} onSelectionChange={() => {}} onRowClick={onRowClick} />);
    fireEvent.click(screen.getAllByLabelText('Sélectionner la ligne')[0]!);
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe('Pagination', () => {
  it('affiche la plage et change de page', () => {
    const onPageChange = jest.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} total={95} pageSize={20} />);
    expect(screen.getByText(/21–40 sur 95/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Page suivante'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});

describe('StatusTabs', () => {
  it('affiche les compteurs et notifie le changement', () => {
    const onChange = jest.fn();
    render(<StatusTabs tabs={[{ value: '', label: 'Tous', count: 12 }, { value: 'banned', label: 'Bannis', count: 3 }]} value="" onChange={onChange} />);
    expect(screen.getByText('12')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Bannis/ }));
    expect(onChange).toHaveBeenCalledWith('banned');
  });
});
