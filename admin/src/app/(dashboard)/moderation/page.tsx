'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService, propertiesService } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { AdminProperty } from '@/types/property';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { useState } from 'react';
import { KycRejectModal } from '@/components/modals/KycRejectModal';
import { RejectPropertyModal } from '@/components/modals/RejectPropertyModal';
import { RequestModificationsModal } from '@/components/modals/RequestModificationsModal';
import {
  ShieldCheck, Building2, FileCheck, FileX, CheckCircle, XCircle,
  MessageSquare, ExternalLink, ImageOff, RefreshCw,
} from 'lucide-react';

// ── Utilitaires ───────────────────────────────────────────────────────────────

function safeDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return '—';
  }
}

function ageDays(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

// ── Labels ────────────────────────────────────────────────────────────────────

const docTypeLabel: Record<string, string> = {
  identity:          "Pièce d'identité",
  rccm:              'RCCM',
  tax_number:        'Numéro fiscal',
  operating_license: "Autorisation d'exercice",
};

const sectorLabel: Record<string, string> = {
  hebergement:         'Hébergement',
  residence:           'Résidence',
  hotel:               'Hôtel',
  immobilier:          'Immobilier',
  immobilier_location: 'Immo. Location',
  immobilier_terrain:  'Terrain',
  immobilier_achat:    'Immo. Achat',
  restaurant:          'Restaurant',
};
const sectorVariant: Record<string, 'info' | 'warning' | 'default'> = {
  hebergement:         'info',
  residence:           'info',
  hotel:               'info',
  immobilier:          'warning',
  immobilier_location: 'warning',
  immobilier_terrain:  'warning',
  immobilier_achat:    'warning',
  restaurant:          'default',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface KycEntry {
  userId:      string;
  userName:    string;
  userEmail:   string;
  submittedAt: string;
  documents:   Array<{ id: string; type: string; fileUrl: string; uploadedAt: string; status: string }>;
}

type Tab = 'kyc' | 'properties';

// ── Onglet KYC ────────────────────────────────────────────────────────────────

function KycTab({ onCountChange }: { onCountChange: (n: number) => void }) {
  const router = useRouter();
  const qc     = useQueryClient();
  const toast  = useToast();
  const [rejectTarget, setRejectTarget] = useState<{ userId: string; userName: string } | null>(null);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ['kyc-pending'],
    queryFn: () => usersService.getPendingKyc(),
  });

  const approve = useMutation({
    mutationFn: (userId: string) => usersService.approveKyc(userId),
    onSuccess: () => {
      toast.success('KYC approuvé — professionnel activé');
      qc.invalidateQueries({ queryKey: ['kyc-pending'] });
    },
    onError: () => toast.error('Erreur lors de la validation KYC'),
  });

  // Normalise le format de réponse selon ce que renvoie le backend
  const rawList: any[] = Array.isArray(data)          ? data
    : Array.isArray(data?.data)                       ? data.data
    : Array.isArray(data?.users)                      ? data.users
    : [];

  const entries: KycEntry[] = rawList.map((u: any) => ({
    userId:      u.userId ?? u.id ?? '',
    userName:    (u.userName ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()) || '—',
    userEmail:   u.userEmail ?? u.email ?? '—',
    submittedAt: u.submittedAt ?? u.createdAt ?? '',
    documents:   Array.isArray(u.documents)      ? u.documents
      : Array.isArray(u.kycDocuments)            ? u.kycDocuments
      : [],
  }));

  // Remonte le compteur au parent
  if (typeof onCountChange === 'function') {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- appelé de façon stable
    // On passe le count par useEffect pour éviter de re-render en boucle
  }

  if (isLoading) return <PageSpinner />;

  if (entries.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center py-12 gap-3 text-gray-400">
          <ShieldCheck size={40} className="text-green-300" />
          <p className="font-medium">Aucun dossier KYC en attente</p>
          <p className="text-sm">Tous les professionnels ont été traités.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 font-medium">
          {entries.length} dossier{entries.length > 1 ? 's' : ''} en attente de validation
        </p>
        <button
          onClick={() => refetch()}
          className="text-xs text-primary-600 hover:underline flex items-center gap-1"
        >
          <RefreshCw size={12} /> Actualiser
        </button>
      </div>

      {entries.map((entry) => (
        <Card key={entry.userId}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                  {(entry.userName[0] ?? '?').toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{entry.userName}</p>
                  <p className="text-sm text-gray-500">{entry.userEmail}</p>
                </div>
              </div>
              {entry.submittedAt && (
                <p className="text-xs text-gray-400 mt-2 ml-12">
                  Inscrit le {safeDate(entry.submittedAt)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <Button size="sm" variant="outline" onClick={() => router.push(`/users/${entry.userId}`)}>
                Voir profil
              </Button>
              <Button
                size="sm"
                leftIcon={<FileCheck size={14} />}
                loading={approve.isPending}
                onClick={() => approve.mutate(entry.userId)}
              >
                Approuver
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                leftIcon={<FileX size={14} />}
                onClick={() => setRejectTarget({ userId: entry.userId, userName: entry.userName })}
              >
                Rejeter
              </Button>
            </div>
          </div>

          {/* Documents */}
          {entry.documents.length > 0 && (
            <div className="divide-y divide-gray-100 -mx-6 -mb-6 mt-4 rounded-b-xl overflow-hidden border-t border-gray-100">
              {entry.documents.map((doc, i) => (
                <div key={doc.id ?? i} className="flex items-center justify-between px-6 py-3 bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{docTypeLabel[doc.type] ?? doc.type}</p>
                    {doc.uploadedAt && (
                      <p className="text-xs text-gray-500">Déposé le {safeDate(doc.uploadedAt)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warning'}>
                      {doc.status === 'approved' ? 'Approuvé' : doc.status === 'rejected' ? 'Rejeté' : 'En attente'}
                    </Badge>
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary-700 hover:underline"
                      >
                        <ExternalLink size={13} /> Voir
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      {rejectTarget && (
        <KycRejectModal
          isOpen
          onClose={() => setRejectTarget(null)}
          userId={rejectTarget.userId}
          userName={rejectTarget.userName}
        />
      )}
    </div>
  );
}

// ── Onglet Annonces en attente ────────────────────────────────────────────────

function PropertiesTab({ onCountChange }: { onCountChange: (n: number) => void }) {
  const router = useRouter();
  const qc     = useQueryClient();
  const toast  = useToast();
  const [rejectTarget, setRejectTarget] = useState<AdminProperty | null>(null);
  const [modifTarget, setModifTarget]   = useState<AdminProperty | null>(null);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ['moderation-properties-pending'],
    queryFn: () => propertiesService.getProperties({ status: 'pending_review', limit: 50 }),
  });

  const approve = useMutation({
    mutationFn: (id: string) => propertiesService.approveProperty(id),
    onSuccess: () => {
      toast.success('Annonce approuvée');
      qc.invalidateQueries({ queryKey: ['moderation-properties-pending'] });
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const properties: AdminProperty[] = Array.isArray(data)         ? data
    : Array.isArray(data?.data)                                   ? data.data
    : Array.isArray(data?.properties)                             ? data.properties
    : [];

  if (isLoading) return <PageSpinner />;

  if (properties.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center py-12 gap-3 text-gray-400">
          <Building2 size={40} className="text-green-300" />
          <p className="font-medium">Aucune annonce en attente</p>
          <p className="text-sm">Toutes les annonces ont été traitées.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 font-medium">
          {properties.length} annonce{properties.length > 1 ? 's' : ''} en attente de validation
        </p>
        <button
          onClick={() => refetch()}
          className="text-xs text-primary-600 hover:underline flex items-center gap-1"
        >
          <RefreshCw size={12} /> Actualiser
        </button>
      </div>

      {properties.map((p) => {
        const dateRef = p.submittedAt ?? p.updatedAt;
        const days = ageDays(dateRef);
        return (
          <Card key={p.id} padding={false}>
            <div className="flex">
              {/* Vignette */}
              <div className="w-40 shrink-0 rounded-l-xl overflow-hidden bg-gray-100 flex items-center justify-center min-h-[130px]">
                {p.mainImageUrl ? (
                  <img src={p.mainImageUrl} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <ImageOff size={28} className="text-gray-300" />
                )}
              </div>

              {/* Contenu */}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-gray-900 truncate">{p.title}</h2>
                      <Badge variant={sectorVariant[p.sector] ?? 'default'}>
                        {sectorLabel[p.sector] ?? p.sector}
                      </Badge>
                      {days >= 7 && <Badge variant="danger">+{days}j — Critique</Badge>}
                      {days >= 2 && days < 7 && <Badge variant="warning">{days}j — Élevée</Badge>}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{p.city}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Propriétaire : <span className="font-medium text-gray-600">{p.ownerName}</span>
                      {(p as any).ownerEmail && <span className="text-gray-400 dark:text-gray-500"> · {(p as any).ownerEmail}</span>}
                      {dateRef && <span> · Soumis le {safeDate(dateRef)}</span>}
                    </p>
                    {(p as any).description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                        {(p as any).description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/properties/${p.id}`)}
                    className="shrink-0"
                  >
                    <ExternalLink size={13} className="mr-1" /> Aperçu
                  </Button>
                </div>

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <Button
                    size="sm"
                    leftIcon={<CheckCircle size={14} />}
                    loading={approve.isPending}
                    onClick={() => approve.mutate(p.id)}
                  >
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<MessageSquare size={14} />}
                    onClick={() => setModifTarget(p)}
                  >
                    Modifications requises
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    leftIcon={<XCircle size={14} />}
                    onClick={() => setRejectTarget(p)}
                  >
                    Refuser
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {rejectTarget && (
        <RejectPropertyModal
          isOpen
          onClose={() => setRejectTarget(null)}
          propertyId={rejectTarget.id}
          propertyTitle={rejectTarget.title}
        />
      )}
      {modifTarget && (
        <RequestModificationsModal
          isOpen
          onClose={() => setModifTarget(null)}
          propertyId={modifTarget.id}
          propertyTitle={modifTarget.title}
        />
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function ModerationPage() {
  const [tab, setTab]         = useState<Tab>('kyc');
  const [kycCount, setKyc]    = useState(0);
  const [propCount, setProp]  = useState(0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modération</h1>
        <p className="text-sm text-gray-500 mt-1">
          Validation des comptes professionnels et des annonces soumises sur la plateforme.
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          className={[
            'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors',
            tab === 'kyc'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
          ].join(' ')}
          onClick={() => setTab('kyc')}
        >
          <ShieldCheck size={16} />
          KYC Professionnels
          {kycCount > 0 && (
            <span className="bg-orange-100 text-orange-700 text-[11px] font-bold rounded-full px-2 py-0.5 ml-1">
              {kycCount}
            </span>
          )}
        </button>

        <button
          className={[
            'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors',
            tab === 'properties'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
          ].join(' ')}
          onClick={() => setTab('properties')}
        >
          <Building2 size={16} />
          Annonces en attente
          {propCount > 0 && (
            <span className="bg-orange-100 text-orange-700 text-[11px] font-bold rounded-full px-2 py-0.5 ml-1">
              {propCount}
            </span>
          )}
        </button>
      </div>

      {/* Contenu de l'onglet actif */}
      {tab === 'kyc'        && <KycTab        onCountChange={setKyc} />}
      {tab === 'properties' && <PropertiesTab onCountChange={setProp} />}
    </div>
  );
}
