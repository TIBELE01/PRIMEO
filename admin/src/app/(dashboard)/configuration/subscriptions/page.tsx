'use client';
import { useConfigStore } from '@/stores/configStore';
import { configService } from '@/services/api';
import type { PlanConfig } from '@/types/config';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { formatAmount } from '@/lib/utils';
import { useState } from 'react';
import { Check, X, ToggleLeft, ToggleRight } from 'lucide-react';

type PlanKey = 'starter' | 'business' | 'entreprise';

const PLANS: { key: PlanKey; label: string; color: string }[] = [
  { key: 'starter',    label: 'Starter',    color: 'bg-gray-100 text-gray-700' },
  { key: 'business',   label: 'Business',   color: 'bg-blue-100 text-blue-700' },
  { key: 'entreprise', label: 'Entreprise', color: 'bg-purple-100 text-purple-700' },
];

// Lignes booléennes éditables (capacités média)
const BOOL_FIELDS: { key: keyof PlanConfig; label: string }[] = [
  { key: 'videoUpload', label: 'Upload vidéo' },
  { key: 'virtualTour', label: 'Visite virtuelle 3D' },
];

export default function SubscriptionsConfigPage() {
  const { config, updateConfigKey } = useConfigStore();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!config) return null;
  const subs = config.subscriptions;

  // Met à jour un champ d'une formule dans le store local
  const setField = (plan: PlanKey, patch: Partial<PlanConfig>) =>
    updateConfigKey('subscriptions', { [plan]: { ...subs[plan], ...patch } });

  const save = async () => {
    setSaving(true);
    try {
      await configService.updateConfig({ subscriptions: config.subscriptions });
      toast.success('Formules mises à jour — appliquées immédiatement');
      setEditing(false);
    } catch { toast.error('Erreur lors de la sauvegarde'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Formules d&apos;abonnement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Prix, limites et fonctionnalités — appliqués en temps réel à l&apos;application.</p>
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Modifier</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Fermer</Button>
            <Button size="sm" loading={saving} onClick={save}>Sauvegarder</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(({ key, label, color }) => {
          const p = subs[key];
          const disabled = p.active === false;
          return (
            <Card key={key} className={disabled ? 'opacity-60' : ''}>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={color}>{label}</Badge>
                  {/* Activer / désactiver (Starter toujours actif) */}
                  {editing && key !== 'starter' ? (
                    <button
                      type="button"
                      onClick={() => setField(key, { active: disabled })}
                      className={`flex items-center gap-1 text-xs font-medium ${disabled ? 'text-gray-400' : 'text-green-700'}`}
                    >
                      {disabled ? <ToggleLeft size={22} className="text-gray-300" /> : <ToggleRight size={22} className="text-green-600" />}
                      {disabled ? 'Désactivée' : 'Active'}
                    </button>
                  ) : (
                    <Badge variant={disabled ? 'danger' : 'success'}>{disabled ? 'Désactivée' : 'Active'}</Badge>
                  )}
                </div>

                {/* Prix */}
                <div>
                  <label className="text-xs text-gray-500">Prix mensuel (FCFA)</label>
                  {editing && key !== 'starter' ? (
                    <input
                      type="number" min={0}
                      value={p.monthlyPrice}
                      onChange={(e) => setField(key, { monthlyPrice: Number(e.target.value) })}
                      className="input w-full mt-1"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">
                      {p.monthlyPrice === 0 ? 'Gratuit' : formatAmount(p.monthlyPrice)}
                      {p.monthlyPrice > 0 && <span className="text-sm font-normal text-gray-500"> /mois</span>}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">0 % de commission</p>
                </div>

                {/* Limites de publications */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Publications (biens)</label>
                    {editing ? (
                      <input type="number" min={0} value={p.includedPropertiesLimit}
                        onChange={(e) => setField(key, { includedPropertiesLimit: Number(e.target.value) })}
                        className="input w-full mt-1" />
                    ) : <p className="text-sm font-semibold text-gray-800 mt-1">{p.includedPropertiesLimit}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Menus (restaurants)</label>
                    {editing ? (
                      <input type="number" min={0} value={p.includedMenusLimit}
                        onChange={(e) => setField(key, { includedMenusLimit: Number(e.target.value) })}
                        className="input w-full mt-1" />
                    ) : <p className="text-sm font-semibold text-gray-800 mt-1">{p.includedMenusLimit >= 9999 ? '∞' : p.includedMenusLimit}</p>}
                  </div>
                </div>

                {/* Capacités média */}
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  {BOOL_FIELDS.map(({ key: f, label: flabel }) => {
                    const val = Boolean(p[f]);
                    return (
                      <div key={f as string} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{flabel}</span>
                        {editing ? (
                          <button type="button" onClick={() => setField(key, { [f]: !val } as Partial<PlanConfig>)}>
                            {val ? <ToggleRight size={22} className="text-green-600" /> : <ToggleLeft size={22} className="text-gray-300" />}
                          </button>
                        ) : (
                          val ? <Check size={16} className="text-green-600" /> : <X size={16} className="text-gray-300" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        Les modifications sont appliquées immédiatement : tarifs (montée/descente de gamme),
        limites de publications, autorisation vidéo / visite 3D et disponibilité des formules.
        Une formule désactivée n&apos;est plus proposée aux professionnels (Starter reste toujours disponible).
        * Des frais Genius Pay s&apos;appliquent sur les paiements en ligne.
      </p>
    </div>
  );
}
