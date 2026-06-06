'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { configService } from '@/services/api';

interface Field { key: string; label: string; type?: string; min?: number; max?: number; step?: number; suffix?: string }
interface Props { fields: Field[]; initialValues: Record<string, number | string>; onSuccess?: () => void }

export function ConfigForm({ fields, initialValues, onSuccess }: Props) {
  const toast = useToast();
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await configService.updateConfig(values);
      toast.success('Configuration sauvegardée');
      onSuccess?.();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
          <div className="relative">
            <input
              type={f.type ?? 'number'}
              min={f.min}
              max={f.max}
              step={f.step ?? 1}
              value={values[f.key] as number | string}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: f.type === 'text' ? e.target.value : Number(e.target.value) }))}
              className={`input w-full ${f.suffix ? 'pr-10' : ''}`}
            />
            {f.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{f.suffix}</span>}
          </div>
        </div>
      ))}
      <Button loading={saving} onClick={save}>Sauvegarder</Button>
    </div>
  );
}
