'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';

export interface BulkAction<T> {
  key: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'cta' | 'danger' | 'outline';
  /** Une action destructrice demande toujours une confirmation explicite */
  confirmTitle: string;
  confirmMessage?: string;
  confirmLabel?: string;
  /** Motif obligatoire (rejet, bannissement, suspension…) */
  reasonLabel?: string;
  reasonPresets?: string[];
  /** Champ de saisie facultatif (ex. référence de virement) */
  reasonOptional?: boolean;
  /** Seuls les éléments pour lesquels l'action est applicable sont traités */
  appliesTo?: (item: T) => boolean;
  run: (item: T, reason: string) => Promise<unknown>;
}

interface Props<T> {
  items: T[];
  getId: (item: T) => string;
  getName?: (item: T) => string;
  actions: BulkAction<T>[];
  noun: string; // « utilisateur(s) », « annonce(s) »…
  onClear: () => void;
  onDone: () => void;
}

/** Barre d'actions groupées + modale de confirmation (avec motif si nécessaire) + exécution séquentielle. */
export function BulkActionBar<T>({ items, getId, getName, actions, noun, onClear, onDone }: Props<T>) {
  const toast = useToast();
  const [current, setCurrent] = useState<BulkAction<T> | null>(null);
  const [reason, setReason] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  if (items.length === 0) return null;

  const applicable = current ? items.filter((i) => (current.appliesTo ? current.appliesTo(i) : true)) : [];
  const skipped = current ? items.length - applicable.length : 0;

  const close = () => { if (!running) { setCurrent(null); setReason(''); setProgress(0); } };

  const execute = async () => {
    if (!current) return;
    setRunning(true);
    setProgress(0);
    let ok = 0;
    const failed: string[] = [];
    for (const item of applicable) {
      try {
        await current.run(item, reason.trim());
        ok++;
      } catch {
        failed.push(getName ? getName(item) : getId(item));
      }
      setProgress((p) => p + 1);
    }
    setRunning(false);
    if (ok) toast.success(`${ok} ${noun}${ok > 1 ? 's' : ''} traité${ok > 1 ? 's' : ''} — ${current.label.toLowerCase()}`);
    if (failed.length) toast.error(`${failed.length} échec(s) : ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''}`);
    setCurrent(null);
    setReason('');
    onClear();
    onDone();
  };

  return (
    <>
      <div className="sticky top-2 z-20 mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 shadow-sm dark:border-primary-800 dark:bg-primary-900/30">
        <span className="text-sm font-semibold text-primary-800 dark:text-primary-200">
          {items.length} {noun}{items.length > 1 ? 's' : ''} sélectionné{items.length > 1 ? 's' : ''}
        </span>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button key={a.key} size="sm" variant={a.variant ?? 'outline'} leftIcon={a.icon} onClick={() => setCurrent(a)}>
              {a.label}
            </Button>
          ))}
        </div>
        <button onClick={onClear} className="ml-auto inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <X size={14} /> Désélectionner
        </button>
      </div>

      <Modal
        isOpen={!!current}
        onClose={close}
        title={current?.confirmTitle ?? ''}
        footer={
          <>
            <Button variant="outline" onClick={close} disabled={running}>Annuler</Button>
            <Button
              variant={current?.variant === 'danger' ? 'danger' : 'primary'}
              onClick={execute}
              loading={running}
              disabled={applicable.length === 0 || (!!current?.reasonLabel && !current?.reasonOptional && !reason.trim())}
            >
              {running ? `${progress}/${applicable.length}…` : (current?.confirmLabel ?? 'Confirmer')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {current?.confirmMessage ?? 'Cette action sera appliquée à'}{' '}
          <strong>{applicable.length} {noun}{applicable.length > 1 ? 's' : ''}</strong>.
        </p>
        {skipped > 0 && (
          <p className="mt-2 text-xs text-secondary-700 dark:text-secondary-300">
            {skipped} élément(s) sélectionné(s) ne sont pas concernés par cette action et seront ignorés.
          </p>
        )}
        {applicable.length > 0 && applicable.length <= 8 && getName && (
          <ul className="mt-3 max-h-32 overflow-auto rounded-lg bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
            {applicable.map((i) => <li key={getId(i)}>• {getName(i)}</li>)}
          </ul>
        )}
        {current?.reasonLabel && (
          <div className="mt-4 space-y-2">
            {current.reasonPresets?.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${reason === p ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-gray-200 hover:bg-gray-50'}`}
              >{p}</button>
            ))}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{current.reasonLabel}{current.reasonOptional ? '' : ' *'}</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input w-full h-20 resize-none" />
          </div>
        )}
      </Modal>
    </>
  );
}
