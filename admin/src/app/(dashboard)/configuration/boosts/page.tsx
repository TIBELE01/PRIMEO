'use client';
import { useConfigStore } from '@/stores/configStore';
import { configService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { formatAmount } from '@/lib/utils';
import { useState } from 'react';

export default function BoostsConfigPage() {
  const { config, updateConfigKey } = useConfigStore();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await configService.updateConfig({ boosts: config.boosts });
      toast.success('Boosts mis à jour');
    } catch { toast.error('Erreur'); } finally { setSaving(false); }
  };

  if (!config) return null;

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Configuration des Boosts</h1>
      <Card>
        <CardHeader>
          <CardTitle>Mise en avant</CardTitle>
          <span className="text-sm text-gray-500">{formatAmount(config.boosts.pricePerThreeDays)} / {config.boosts.durationDays} jours</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Prix du boost payant (FCFA)</label>
              <input
                type="number" min={0}
                value={config.boosts.pricePerThreeDays}
                onChange={(e) => updateConfigKey('boosts', { ...config.boosts, pricePerThreeDays: Number(e.target.value) })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Durée du boost payant (jours)</label>
              <input
                type="number" min={1}
                value={config.boosts.durationDays}
                onChange={(e) => updateConfigKey('boosts', { ...config.boosts, durationDays: Number(e.target.value) })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Boosts gratuits Business</label>
              <input
                type="number" min={0}
                value={config.boosts.freeBoostsBusiness}
                onChange={(e) => updateConfigKey('boosts', { ...config.boosts, freeBoostsBusiness: Number(e.target.value) })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Boosts gratuits Entreprise</label>
              <input
                type="number" min={0}
                value={config.boosts.freeBoostsEntreprise}
                onChange={(e) => updateConfigKey('boosts', { ...config.boosts, freeBoostsEntreprise: Number(e.target.value) })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Jours gratuits Business</label>
              <input
                type="number" min={1}
                value={config.boosts.freeDaysBusiness}
                onChange={(e) => updateConfigKey('boosts', { ...config.boosts, freeDaysBusiness: Number(e.target.value) })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Jours gratuits Entreprise</label>
              <input
                type="number" min={1}
                value={config.boosts.freeDaysEntreprise}
                onChange={(e) => updateConfigKey('boosts', { ...config.boosts, freeDaysEntreprise: Number(e.target.value) })}
                className="input w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Button loading={saving} onClick={save}>Sauvegarder</Button>
    </div>
  );
}
