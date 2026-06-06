'use client';
import { useConfigStore } from '@/stores/configStore';
import { configService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { formatAmount } from '@/lib/utils';
import { useState } from 'react';
import { Check, X } from 'lucide-react';

// Ligne du tableau comparatif
interface FeatureRow {
  label: string;
  starter: string | boolean;
  business: string | boolean;
  entreprise: string | boolean;
}

const FEATURE_ROWS: FeatureRow[] = [
  { label: 'Publications',         starter: '3',           business: '10',          entreprise: '40 (∞ resto)' },
  { label: 'Commission',           starter: '0 %',         business: '0 %',         entreprise: '0 %' },
  { label: 'Boosts gratuits/mois', starter: '0',           business: '2 (3 jours)', entreprise: '7 (3 jours)' },
  { label: 'Upload vidéo',         starter: false,         business: true,          entreprise: true },
  { label: 'Visite virtuelle 3D',  starter: false,         business: false,         entreprise: true },
  { label: 'Badge',                starter: '—',           business: 'Vérifié',     entreprise: 'Premium' },
  { label: 'Visibilité',           starter: 'Standard',    business: '+30 %',       entreprise: 'Prioritaire' },
  { label: 'Statistiques',         starter: 'Basiques',    business: 'Avancées',    entreprise: 'Avancées' },
  { label: 'Multi-utilisateurs',   starter: false,         business: false,         entreprise: true },
  { label: 'Rapport PDF mensuel',  starter: false,         business: false,         entreprise: true },
  { label: 'Programme fidélité',   starter: false,         business: false,         entreprise: true },
];

function FeatureCell({ value }: { value: string | boolean }) {
  if (value === true)  return <Check size={16} className="text-green-600 mx-auto" />;
  if (value === false) return <X     size={16} className="text-gray-300 mx-auto" />;
  return <span className="text-sm text-gray-700">{value}</span>;
}

const PLAN_COLOR: Record<string, string> = {
  starter:    'bg-gray-100 text-gray-700',
  business:   'bg-blue-100 text-blue-700',
  entreprise: 'bg-purple-100 text-purple-700',
};

export default function SubscriptionsConfigPage() {
  const { config, updateConfigKey } = useConfigStore();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!config) return null;

  const plans: Array<{ key: keyof typeof config.subscriptions; label: string }> = [
    { key: 'starter',    label: 'Starter' },
    { key: 'business',   label: 'Business' },
    { key: 'entreprise', label: 'Entreprise' },
  ];

  const save = async () => {
    setSaving(true);
    try {
      await configService.updateConfig({ subscriptions: config.subscriptions });
      toast.success('Tarifs mis à jour');
      setEditing(false);
    } catch { toast.error('Erreur lors de la sauvegarde'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Formules d&apos;abonnement</h1>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Modifier les prix</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Annuler</Button>
            <Button size="sm" loading={saving} onClick={save}>Sauvegarder</Button>
          </div>
        )}
      </div>

      {/* Cartes prix */}
      <div className="grid grid-cols-3 gap-4">
        {plans.map(({ key, label }) => {
          const price = config.subscriptions[key];
          return (
            <Card key={key}>
              <CardContent className="pt-5">
                <Badge className={PLAN_COLOR[key]}>{label}</Badge>
                {editing && key !== 'starter' ? (
                  <div className="mt-3">
                    <label className="text-xs text-gray-500">Prix mensuel (FCFA)</label>
                    <input
                      type="number"
                      min={0}
                      value={price}
                      onChange={(e) =>
                        updateConfigKey('subscriptions', { ...config.subscriptions, [key]: Number(e.target.value) })
                      }
                      className="input w-full mt-1"
                    />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-3">
                    {price === 0 ? 'Gratuit' : formatAmount(price)}
                    {price > 0 && <span className="text-sm font-normal text-gray-500"> /mois</span>}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">0 % de commission</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tableau comparatif */}
      <Card padding={false}>
        <CardHeader className="p-4 border-b border-gray-100">
          <CardTitle>Tableau comparatif des fonctionnalités</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3 px-4 font-semibold text-gray-600 w-48">Fonctionnalité</th>
                {plans.map(({ key, label }) => (
                  <th key={key} className="py-3 px-4 text-center font-semibold text-gray-700">
                    <Badge className={PLAN_COLOR[key]}>{label}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="py-2.5 px-4 text-gray-600 font-medium">{row.label}</td>
                  <td className="py-2.5 px-4 text-center"><FeatureCell value={row.starter} /></td>
                  <td className="py-2.5 px-4 text-center"><FeatureCell value={row.business} /></td>
                  <td className="py-2.5 px-4 text-center"><FeatureCell value={row.entreprise} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Note Genius Pay */}
      <p className="text-xs text-gray-400">
        * Des frais Genius Pay s&apos;appliquent sur les paiements en ligne (carte, mobile money). Les paiements en espèces ne sont pas soumis à des frais.
      </p>
    </div>
  );
}
