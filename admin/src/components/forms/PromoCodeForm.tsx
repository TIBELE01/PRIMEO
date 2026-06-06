'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { configService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface Props { onSuccess: () => void; onCancel: () => void }

const today = () => new Date().toISOString().slice(0, 16);

export function PromoCodeForm({ onSuccess, onCancel }: Props) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    discountType: 'percent',
    discountValue: 10,
    minAmount: '',
    maxUses: '',
    validFrom: today(),
    validUntil: '',
    isActive: true,
  });

  const set = (key: string, value: unknown) => setForm((p) => ({ ...p, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return toast.error('Le code est requis');
    if (!form.validUntil) return toast.error('La date d\'expiration est requise');
    if (new Date(form.validUntil) <= new Date(form.validFrom)) {
      return toast.error('La date de fin doit être postérieure à la date de début');
    }
    setSaving(true);
    try {
      await configService.createPromoCode({
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minAmount: form.minAmount ? Number(form.minAmount) : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil).toISOString(),
        isActive: form.isActive,
      });
      toast.success('Code promo créé');
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erreur lors de la création';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Nouveau code promo</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Code */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Code <span className="text-red-500">*</span></label>
            <input
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              required
              maxLength={30}
              className="input w-full font-mono tracking-widest"
              placeholder="EX: SUMMER25"
            />
          </div>

          {/* Type de réduction */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Type de réduction</label>
            <select value={form.discountType} onChange={(e) => set('discountType', e.target.value)} className="input w-full">
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed_amount">Montant fixe (FCFA)</option>
            </select>
          </div>

          {/* Valeur */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Valeur <span className="text-gray-400">({form.discountType === 'percent' ? '%' : 'FCFA'})</span>
            </label>
            <input
              type="number"
              min={1}
              max={form.discountType === 'percent' ? 100 : undefined}
              value={form.discountValue}
              onChange={(e) => set('discountValue', Number(e.target.value))}
              required
              className="input w-full"
            />
          </div>

          {/* Montant minimum */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Montant minimum <span className="text-gray-400 text-xs">(FCFA, optionnel)</span>
            </label>
            <input
              type="number"
              min={0}
              value={form.minAmount}
              onChange={(e) => set('minAmount', e.target.value)}
              placeholder="Ex : 20000"
              className="input w-full"
            />
          </div>

          {/* Utilisations max */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Utilisations max <span className="text-gray-400 text-xs">(vide = illimité)</span>
            </label>
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => set('maxUses', e.target.value)}
              placeholder="Illimité"
              className="input w-full"
            />
          </div>

          {/* Statut */}
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                className="w-4 h-4 accent-primary-700"
              />
              <span className="text-sm text-gray-700">Activer immédiatement</span>
            </label>
          </div>

          {/* Dates */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Date de début</label>
            <input
              type="datetime-local"
              value={form.validFrom}
              onChange={(e) => set('validFrom', e.target.value)}
              required
              className="input w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Date de fin <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              value={form.validUntil}
              min={form.validFrom}
              onChange={(e) => set('validUntil', e.target.value)}
              required
              className="input w-full text-sm"
            />
          </div>

          {/* Actions */}
          <div className="sm:col-span-2 flex gap-2 justify-end pt-2 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={onCancel} disabled={saving}>Annuler</Button>
            <Button type="submit" loading={saving}>Créer le code</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
