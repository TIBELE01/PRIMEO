'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { configService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { PromoCode } from '@/types/config';

interface Props { onSuccess: () => void; onCancel: () => void; /** Fourni : le formulaire modifie ce code au lieu d'en créer un */ promo?: PromoCode }

const today = () => new Date().toISOString().slice(0, 16);
// ISO (UTC) → valeur d'un champ datetime-local (heure locale)
const toLocalInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function PromoCodeForm({ onSuccess, onCancel, promo }: Props) {
  const editing = !!promo;
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: promo?.code ?? '',
    discountType: promo ? (promo.discountType === 'percentage' || promo.discountType === 'percent' ? 'percent' : 'fixed_amount') : 'percent',
    discountValue: promo?.discountValue ?? 10,
    minAmount: promo?.minAmount ? String(promo.minAmount) : '',
    maxUses: promo?.maxUses ? String(promo.maxUses) : '',
    validFrom: promo ? toLocalInput(promo.validFrom ?? promo.createdAt) : today(),
    validUntil: promo ? toLocalInput(promo.validUntil) : '',
    isActive: promo?.isActive ?? true,
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
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        // création : champ absent = pas de limite ; modification : null = effacer la limite existante
        minAmount: form.minAmount ? Number(form.minAmount) : (editing ? null : undefined),
        maxUses: form.maxUses ? Number(form.maxUses) : (editing ? null : undefined),
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil).toISOString(),
        isActive: form.isActive,
      };
      if (promo) await configService.updatePromoCode(promo.id, payload);
      else await configService.createPromoCode(payload);
      toast.success(editing ? 'Code promo modifié' : 'Code promo créé');
      onSuccess();
    } catch (err: any) {
      const d = err?.response?.data;
      const first = d?.details ? (Object.values(d.details)[0] as string[] | undefined)?.[0] : undefined;
      toast.error(d?.message ?? (first ? `${d.error ?? 'Erreur'} : ${first}` : d?.error) ?? (editing ? 'Erreur lors de la modification' : 'Erreur lors de la création'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>{editing ? `Modifier le code ${promo!.code}` : 'Nouveau code promo'}</CardTitle></CardHeader>
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
              readOnly={editing}
              title={editing ? 'Le code ne peut pas être renommé' : undefined}
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
              Valeur <span className="text-gray-400 dark:text-gray-500">({form.discountType === 'percent' ? '%' : 'FCFA'})</span>
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
            <Button type="submit" loading={saving}>{editing ? 'Enregistrer' : 'Créer le code'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
