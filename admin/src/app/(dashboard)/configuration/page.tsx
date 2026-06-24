'use client';
import { useConfigStore } from '@/stores/configStore';
import { configService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Settings2, Tag, Zap, Palette, Mail, Clock, ToggleLeft, ToggleRight, ShieldCheck, Flag, CreditCard,
} from 'lucide-react';

const FEATURE_LABELS: Record<string, string> = {
  virtualTourEnabled: 'Visites virtuelles 3D',
  referralEnabled: 'Programme de parrainage',
  restaurantEnabled: 'Module restauration',
  currencyConverterEnabled: 'Convertisseur de devises',
};

export default function ConfigurationPage() {
  const { config, updateConfigKey } = useConfigStore();
  const toast = useToast();
  const [savingGrace, setSavingGrace] = useState(false);
  const [savingFeatures, setSavingFeatures] = useState(false);

  // Frais Genius Pay (clé plate platform_config, lue par le service payouts)
  const [geniusFee, setGeniusFee] = useState<number>(0);
  const [savingFee, setSavingFee] = useState(false);
  useEffect(() => {
    configService.getConfig()
      .then((raw: Record<string, unknown>) => {
        const v = raw?.genius_pay_fee_percent;
        setGeniusFee(typeof v === 'number' ? v : 0);
      })
      .catch(() => {});
  }, []);
  const saveGeniusFee = async () => {
    setSavingFee(true);
    try {
      await configService.updateConfigKey('genius_pay_fee_percent', geniusFee);
      toast.success('Frais Genius Pay sauvegardés');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSavingFee(false);
    }
  };

  const subPages = [
    { href: '/configuration/subscriptions', icon: Settings2, label: 'Abonnements', desc: 'Tarifs Starter / Business / Entreprise' },
    { href: '/configuration/boosts', icon: Zap, label: 'Boosts', desc: 'Prix et crédits gratuits par formule' },
    { href: '/configuration/promos', icon: Tag, label: 'Codes promo', desc: 'Créer et gérer les réductions' },
    { href: '/configuration/emails', icon: Mail, label: 'Templates emails', desc: 'Modifier les emails transactionnels' },
    { href: '/configuration/appearance', icon: Palette, label: 'Apparence', desc: 'Couleurs et logo de la plateforme' },
    { href: '/configuration/admins', icon: ShieldCheck, label: 'Comptes admin', desc: 'Créer et gérer les comptes administrateurs' },
    { href: '/configuration/flags', icon: Flag, label: 'Feature Flags', desc: 'Activer / désactiver des fonctionnalités en temps réel' },
  ];

  const save = async (section: string, data: object, setSaving: (v: boolean) => void, label: string) => {
    setSaving(true);
    try {
      await configService.updateConfigKey(section, data);
      toast.success(`${label} sauvegardé`);
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (!config) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuration de la plateforme</h1>

      {/* Sub-pages grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subPages.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-50 rounded-lg shrink-0">
                  <Icon size={22} className="text-primary-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Délai de grâce */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            <CardTitle>Délai de grâce abonnements</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Nombre de jours accordés après un échec de paiement avant la suspension du compte professionnel.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={30}
                value={config.grace.subscriptionGraceDays}
                onChange={(e) =>
                  updateConfigKey('grace', { subscriptionGraceDays: Number(e.target.value) })
                }
                className="input w-24"
              />
              <span className="text-sm text-gray-600">jours</span>
            </div>
            <Button
              size="sm"
              loading={savingGrace}
              onClick={() => save('grace', config.grace, setSavingGrace, 'Délai de grâce')}
            >
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Frais Genius Pay */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-gray-400" />
            <CardTitle>Frais Genius Pay</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Pourcentage de frais appliqué par Genius Pay sur les paiements en ligne, utilisé pour le
            calcul des versements aux professionnels (montant net). Mettre 0 pour aucun frais.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={geniusFee}
                onChange={(e) => setGeniusFee(Number(e.target.value))}
                className="input w-28"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
            <Button size="sm" loading={savingFee} onClick={saveGeniusFee}>
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Fonctionnalités</CardTitle>
          <span className="text-xs text-gray-400">Activation / désactivation globale</span>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-100">
            {Object.entries(config.features).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{FEATURE_LABELS[key] ?? key}</p>
                </div>
                <button
                  onClick={() => updateConfigKey('features', { ...config.features, [key]: !enabled })}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    enabled ? 'text-green-700' : 'text-gray-400'
                  }`}
                >
                  {enabled
                    ? <ToggleRight size={24} className="text-green-600" />
                    : <ToggleLeft size={24} className="text-gray-300" />
                  }
                  {enabled ? 'Activé' : 'Désactivé'}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <Button
              size="sm"
              loading={savingFeatures}
              onClick={() => save('features', config.features, setSavingFeatures, 'Fonctionnalités')}
            >
              Sauvegarder les fonctionnalités
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
