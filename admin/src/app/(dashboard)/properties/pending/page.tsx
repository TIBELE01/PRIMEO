'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesService } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import { AdminProperty } from '@/types/property';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { useState } from 'react';
import { RejectPropertyModal } from '@/components/modals/RejectPropertyModal';
import { RequestModificationsModal } from '@/components/modals/RequestModificationsModal';
import { CheckCircle, XCircle, MessageSquare, ExternalLink, ArrowLeft, ImageOff } from 'lucide-react';

const sectorLabel: Record<string, string> = {
  hebergement: 'Hébergement',
  residence: 'Résidence',
  hotel: 'Hôtel',
  immobilier: 'Immobilier',
  immobilier_location: 'Immo. Location',
  immobilier_terrain: 'Terrain',
  immobilier_achat: 'Immo. Achat',
  restaurant: 'Restaurant',
};
const sectorVariant: Record<string, 'info' | 'warning' | 'default'> = {
  hebergement: 'info',
  residence: 'info',
  hotel: 'info',
  immobilier: 'warning',
  immobilier_location: 'warning',
  immobilier_terrain: 'warning',
  immobilier_achat: 'warning',
  restaurant: 'default',
};

function ageDays(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function PendingPropertiesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [rejectTarget, setRejectTarget] = useState<AdminProperty | null>(null);
  const [modifTarget, setModifTarget] = useState<AdminProperty | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['properties-pending'],
    queryFn: () => propertiesService.getProperties({ status: 'pending_review', limit: 50 }),
  });

  const approve = useMutation({
    mutationFn: (id: string) => propertiesService.approveProperty(id),
    onSuccess: () => {
      toast.success('Annonce approuvée');
      qc.invalidateQueries({ queryKey: ['properties-pending'] });
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const properties: AdminProperty[] = data?.data ?? data?.properties ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 p-1">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File de modération</h1>
          <p className="text-sm text-gray-500 mt-0.5">Annonces en attente de validation</p>
        </div>
      </div>

      {isLoading ? <PageSpinner /> : (
        properties.length === 0 ? (
          <Card>
            <p className="text-center text-gray-400 py-10">Aucune annonce en attente de modération.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 font-medium">
              {properties.length} annonce{properties.length > 1 ? 's' : ''} en attente
            </p>
            {properties.map((p) => {
              const days = ageDays(p.submittedAt);
              return (
                <Card key={p.id} padding={false}>
                  <div className="flex">
                    {/* Thumbnail */}
                    <div className="w-44 shrink-0 rounded-l-xl overflow-hidden bg-gray-100 flex items-center justify-center min-h-[120px]">
                      {p.mainImageUrl ? (
                        <img src={p.mainImageUrl} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <ImageOff size={32} className="text-gray-300" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-semibold text-gray-900">{p.title}</h2>
                            <Badge variant={sectorVariant[p.sector] ?? 'default'}>
                              {sectorLabel[p.sector] ?? p.sector}
                            </Badge>
                            {days >= 7 && <Badge variant="danger">+{days}j — Critique</Badge>}
                            {days >= 2 && days < 7 && <Badge variant="warning">{days}j — Élevée</Badge>}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{p.city} · {p.type}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Propriétaire : <span className="font-medium text-gray-600">{p.ownerName}</span>
                            {(p as any).ownerEmail && (
                              <span className="ml-1 text-gray-400">· {(p as any).ownerEmail}</span>
                            )}
                            {' · '}Soumis le {formatDate(p.submittedAt)}
                          </p>
                          {/* Description excerpt */}
                          {(p as any).description && (
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                              {(p as any).description}
                            </p>
                          )}
                          {/* Owner KYC badge */}
                          {(p as any).ownerKycStatus && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="text-xs text-gray-400">KYC propriétaire :</span>
                              <Badge
                                variant={(p as any).ownerKycStatus === 'verified' ? 'success' : (p as any).ownerKycStatus === 'rejected' ? 'danger' : 'warning'}
                              >
                                {(p as any).ownerKycStatus === 'verified' ? 'Vérifié'
                                  : (p as any).ownerKycStatus === 'rejected' ? 'Rejeté'
                                  : 'En attente'}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/properties/${p.id}`)}
                          className="shrink-0"
                        >
                          <ExternalLink size={13} className="mr-1" /> Aperçu complet
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
                          Demander modifications
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          leftIcon={<XCircle size={14} />}
                          onClick={() => setRejectTarget(p)}
                        >
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

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
