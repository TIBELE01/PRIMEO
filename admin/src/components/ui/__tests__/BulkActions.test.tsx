import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BulkActionBar, BulkAction } from '../BulkActions';

jest.mock('@/hooks/useToast', () => ({ useToast: () => ({ success: jest.fn(), error: jest.fn() }) }));

interface Item { id: string; name: string; status: string }
const items: Item[] = [
  { id: '1', name: 'A', status: 'active' },
  { id: '2', name: 'B', status: 'banned' },
  { id: '3', name: 'C', status: 'active' },
];

function setup(run: BulkAction<Item>['run']) {
  const onClear = jest.fn();
  const onDone = jest.fn();
  const actions: BulkAction<Item>[] = [{
    key: 'ban', label: 'Bannir', variant: 'danger', confirmTitle: 'Bannir les comptes', confirmLabel: 'Confirmer le bannissement',
    reasonLabel: 'Motif', appliesTo: (i) => i.status !== 'banned', run,
  }];
  render(<BulkActionBar items={items} getId={(i) => i.id} getName={(i) => i.name} actions={actions} noun="compte" onClear={onClear} onDone={onDone} />);
  return { onClear, onDone };
}

describe('BulkActionBar', () => {
  it("n'exécute rien avant confirmation et exige un motif", () => {
    const run = jest.fn().mockResolvedValue(undefined);
    setup(run);
    fireEvent.click(screen.getByRole('button', { name: 'Bannir' }));
    expect(run).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: /Confirmer le bannissement/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('ignore les éléments non concernés et traite les autres un par un', async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    const { onClear, onDone } = setup(run);
    fireEvent.click(screen.getByRole('button', { name: 'Bannir' }));
    expect(screen.getByText(/ne sont pas concernés/)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Fraude' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le bannissement/ }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls.map((c) => (c[0] as Item).id)).toEqual(['1', '3']);
    expect(run.mock.calls[0]![1]).toBe('Fraude');
    expect(onClear).toHaveBeenCalled();
  });

  it("poursuit malgré un échec individuel", async () => {
    const run = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined);
    const { onDone } = setup(run);
    fireEvent.click(screen.getByRole('button', { name: 'Bannir' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Motif' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le bannissement/ }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(run).toHaveBeenCalledTimes(2);
  });
});
