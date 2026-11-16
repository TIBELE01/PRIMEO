'use client';
// Configuration des cartes de l'accueil — active ou désactive un secteur entier
// (Résidence, Hôtel, Immobilier, Restaurant). Chaque bascule est enregistrée
// aussitôt en base et appliquée immédiatement par l'API et l'application.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { sectorCardsService, type SectorFlags } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { Home, Building2, KeyRound, UtensilsCrossed, ArrowLeft, AlertTriangle } from 'lucide-react';

type FlagKey = keyof SectorFlags;

const CARDS: Array<{
  key: FlagKey;
  label: string;
  accountType: string;
  description: string;
  icon: typeof Home;
}> = [
  {
    key: 'residence_enabled',
    label: 'Résidence',
    accountType: 'Professionnel hébergement',
    description: 'Villas et appartements meublés',
    icon: Home,
  },
  {
    key: 'hotel_enabled',
    label: 'Hôtel',
    accountType: 'Professionnel hôtelier',
    description: 'Chambres et suites',
    icon: Building2,
  },
  {
    key: 'immobilier_enabled',
    label: 'Immobilier',
    accountType: 'Professionnel immobilier',
    description: 'Location, achat de maison et de terrain',
    icon: KeyRound,
  },
  {
    key: 'restaurant_enabled',
    label: 'Restaurant',
    accountType: 'Restaurateur',
    description: 'Réservation de table et commandes',
    icon: UtensilsCrossed,
  },
];

const QUERY_KEY = ['sector-cards'];

export default function SectorCardsPage() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data: flags, isLoading, isError } = useQuery<SectorFlags>({
    queryKey: QUERY_KEY,
    queryFn: () => sectorCardsService.get(),
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<SectorFlags>) => sectorCardsService.update(patch),
    // Bascule optimiste : l'interrupteur réagit tout de suite, puis s'aligne sur
    // la réponse du serveur (ou revient en arrière en cas d'échec).
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<SectorFlags>(QUERY_KEY);
      if (previous) qc.setQueryData<SectorFlags>(QUERY_KEY, { ...previous, ...patch });
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) qc.setQueryData(QUERY_KEY, context.previous);
      toast.error('La modification n\'a pas pu être enregistrée');
    },
    onSuccess: (saved, patch) => {
      qc.setQueryData(QUERY_KEY, saved);
      const key = Object.keys(patch)[0] as FlagKey;
      const card = CARDS.find((c) => c.key === key);
      if (card) toast.success(`${card.label} ${saved[key] ? 'activé' : 'désactivé'}`);
    },
  });

  if (isLoading) return <PageSpinner />;

  const disabledCount = flags ? CARDS.filter((c) => !flags[c.key]).length : 0;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/configuration" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2">
          <ArrowLeft size={12} /> Configuration
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Configuration des cartes</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Activez ou désactivez chaque carte de la page d&apos;accueil de l&apos;application et toute l&apos;activité qui en dépend.
        </p>
      </div>

      {isError || !flags ? (
        <Card>
          <p className="text-sm text-red-600">Impossible de charger l&apos;état des cartes. Rechargez la page.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CARDS.map(({ key, label, accountType, description, icon: Icon }) => {
              const enabled = flags[key];
              const pending = mutation.isPending && mutation.variables && key in mutation.variables;
              return (
                <Card key={key}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`shrink-0 rounded-lg p-2 ${enabled ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-semibold text-gray-900">{label}</h2>
                          <Badge variant={enabled ? 'success' : 'default'}>{enabled ? 'Activé' : 'Désactivé'}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{description}</p>
                        <p className="text-xs text-gray-400 mt-1">Type de compte : {accountType}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`${enabled ? 'Désactiver' : 'Activer'} la carte ${label}`}
                      data-testid={`toggle-${key}`}
                      disabled={!!pending}
                      onClick={() => mutation.mutate({ [key]: !enabled } as Partial<SectorFlags>)}
                      className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-60 ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className={`shrink-0 mt-0.5 ${disabledCount > 0 ? 'text-amber-500' : 'text-gray-300'}`} />
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-800">Quand une carte est désactivée :</p>
                <ul className="list-disc pl-5 space-y-0.5 text-gray-500">
                  <li>elle disparaît de l&apos;accueil et de la navigation de l&apos;application ;</li>
                  <li>le type de compte correspondant n&apos;est plus proposé à l&apos;inscription ;</li>
                  <li>ses annonces n&apos;apparaissent plus dans la recherche et leur fiche affiche « Service temporairement indisponible » ;</li>
                  <li>les nouvelles annonces, réservations et commandes de ce type sont refusées.</li>
                </ul>
                <p className="text-gray-500">
                  Rien n&apos;est supprimé : les réservations en cours et les messages restent accessibles, et tout redevient
                  disponible dès la réactivation.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
