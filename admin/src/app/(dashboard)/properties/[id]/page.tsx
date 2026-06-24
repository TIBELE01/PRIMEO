'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesService } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatAmount } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ImageOff, CheckCircle, XCircle, MessageSquare, PauseCircle, Trash2, PlayCircle, ExternalLink, User } from 'lucide-react';
import { useState } from 'react';
import { RejectPropertyModal } from '@/components/modals/RejectPropertyModal';
import { RequestModificationsModal } from '@/components/modals/RequestModificationsModal';
import { SuspendPropertyModal } from '@/components/modals/SuspendPropertyModal';
import { AdminRole } from '@/types/user';
import { PropertyDetail, OwnerLegalDoc } from '@/types/property';

function can(role: AdminRole | undefined, minRole: AdminRole): boolean {
  const order: AdminRole[] = ['analyste', 'support', 'moderateur', 'super_admin'];
  if (!role) return false;
  return order.indexOf(role) >= order.indexOf(minRole);
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  draft: 'default', pending_review: 'warning', active: 'success',
  suspended: 'danger', rejected: 'danger', archived: 'default',
};
const statusLabel: Record<string, string> = {
  draft: 'Brouillon', pending_review: 'En attente', active: 'Active',
  suspended: 'Suspendue', rejected: 'Rejetée', archived: 'Archivée',
};

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const role = useAuthStore(s => s.admin?.role);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [modifOpen, setModifOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);

  const { data: property, isLoading } = useQuery<PropertyDetail>({
    queryKey: ['property', id],
    queryFn: () => propertiesService.getPropertyById(id) as any,
  });

  const approve = useMutation({
    mutationFn: () => propertiesService.approveProperty(id),
    onSuccess: () => {
      toast.success('Annonce approuvée');
      qc.invalidateQueries({ queryKey: ['property', id] });
      qc.invalidateQueries({ queryKey: ['properties-pending'] });
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const suspend = useMutation({
    mutationFn: () => propertiesService.suspend(id),
    onSuccess: () => { toast.success('Annonce suspendue'); qc.invalidateQueries({ queryKey: ['property', id] }); },
    onError: () => toast.error('Erreur'),
  });

  const reactivate = useMutation({
    mutationFn: () => propertiesService.reactivateProperty(id),
    onSuccess: () => { toast.success('Annonce réactivée'); qc.invalidateQueries({ queryKey: ['property', id] }); },
    onError: () => toast.error('Erreur'),
  });

  const deleteProperty = useMutation({
    mutationFn: () => propertiesService.deleteProperty(id),
    onSuccess: () => { toast.success('Annonce supprimée'); router.push('/properties'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  if (isLoading) return <PageSpinner />;
  if (!property) return <p className="text-gray-500 p-8">Propriété introuvable</p>;

  const images: string[] = (property as any).images ?? [];
  const displayImages = images.length > 0 ? images : (property.mainImageUrl ? [property.mainImageUrl] : []);
  const amenities: string[] = (property as any).amenities ?? [];
  const rules: string[] = (property as any).rules ?? [];
  const description: string = (property as any).description ?? '';
  const bookingsCount: number = (property as any).bookingsCount ?? 0;
  const totalRevenue: number = (property as any).totalRevenue ?? 0;
  const isPending = property.status === 'pending_review';
  const isActive = property.status === 'active';
  const isSuspended = property.status === 'suspended';
  const canDelete = can(role, 'super_admin') && !['archived'].includes(property.status);

  const ownerLegalDocs: OwnerLegalDoc[] = (property as any).ownerLegalDocs ?? [];
  const ownerEmail: string | undefined = (property as any).ownerEmail;
  const ownerPhone: string | undefined = (property as any).ownerPhone;
  const ownerKycStatus: string | undefined = (property as any).ownerKycStatus;
  const ownerSubscriptionPlan: string | undefined = (property as any).ownerSubscriptionPlan;

  const legalDocLabel: Record<string, string> = {
    identity: "Pièce d'identité",
    rccm: 'RCCM',
    tax_number: 'Numéro fiscal',
    operating_license: "Autorisation d'exercice",
  };
  const kycBadge: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    verified: 'success', pending: 'warning', rejected: 'danger', none: 'default',
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
            <Badge variant={statusVariant[property.status]}>{statusLabel[property.status] ?? property.status}</Badge>
            {property.isBoosted && <Badge variant="warning">Boosté</Badge>}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{property.city}, {property.country} · {property.type}</p>
        </div>
      </div>

      {/* Photo gallery */}
      {displayImages.length > 0 ? (
        <Card padding={false}>
          <div className="relative h-64 rounded-t-xl overflow-hidden bg-gray-100">
            <img src={displayImages[selectedImg]} alt="Photo principale" className="w-full h-full object-cover" />
          </div>
          {displayImages.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {displayImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className={`w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                    i === selectedImg ? 'border-primary-600' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-center h-32 text-gray-300">
            <ImageOff size={40} />
            <span className="ml-2 text-sm text-gray-400">Aucune photo disponible</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="md:col-span-2 space-y-4">
          {description && (
            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{description}</p>
              </CardContent>
            </Card>
          )}

          {amenities.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Équipements</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <span key={a} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{a}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <div className="flex justify-between col-span-2 border-b border-gray-50 pb-2">
                  <dt className="text-gray-500 dark:text-gray-400">Propriétaire</dt>
                  <dd className="font-medium text-gray-900">{property.ownerName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Prix / nuit</dt>
                  <dd className="font-medium">{formatAmount(property.pricePerNight)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Ville</dt>
                  <dd>{property.city}, {property.country}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Note</dt>
                  <dd>★ {property.rating} ({property.reviewCount} avis)</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Réservations</dt>
                  <dd>{bookingsCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Revenus totaux</dt>
                  <dd>{formatAmount(totalRevenue)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Soumis le</dt>
                  <dd>{formatDate(property.submittedAt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Modifié le</dt>
                  <dd>{formatDate(property.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {rules.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Règles de la propriété</CardTitle></CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-1.5">
                  {rules.map((r) => (
                    <li key={r} className="flex items-start gap-1.5">
                      <span className="text-primary-600 mt-0.5 shrink-0">•</span>{r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {can(role, 'moderateur') && (
            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {isPending && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<CheckCircle size={14} />}
                        loading={approve.isPending}
                        onClick={() => approve.mutate()}
                        className="w-full"
                      >
                        Approuver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<MessageSquare size={14} />}
                        onClick={() => setModifOpen(true)}
                        className="w-full"
                      >
                        Demander modifications
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<XCircle size={14} />}
                        onClick={() => setRejectOpen(true)}
                        className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Rejeter
                      </Button>
                    </>
                  )}

                  {isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<PauseCircle size={14} />}
                      onClick={() => setSuspendOpen(true)}
                      className="w-full text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                      Suspendre
                    </Button>
                  )}

                  {isSuspended && (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<PlayCircle size={14} />}
                      loading={reactivate.isPending}
                      onClick={() => reactivate.mutate()}
                      className="w-full"
                    >
                      Réactiver
                    </Button>
                  )}

                  {canDelete && (
                    <div className="pt-1">
                      {!deleteConfirm ? (
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Trash2 size={14} />}
                          onClick={() => setDeleteConfirm(true)}
                          className="w-full text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Supprimer définitivement
                        </Button>
                      ) : (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                          <p className="text-xs text-red-700 font-medium">Confirmer la suppression définitive ?</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(false)} className="flex-1 text-xs">
                              Annuler
                            </Button>
                            <Button size="sm" variant="danger" loading={deleteProperty.isPending} onClick={() => deleteProperty.mutate()} className="flex-1 text-xs">
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {property.rejectionReason && (
            <Card>
              <CardHeader><CardTitle className="text-red-600">Motif de rejet</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">{property.rejectionReason}</p>
              </CardContent>
            </Card>
          )}

          {/* Professional legal info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User size={15} className="text-gray-400" />
                <CardTitle>Informations légales du propriétaire</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500 dark:text-gray-400">Nom</dt>
                  <dd className="font-medium text-gray-900">{property.ownerName}</dd>
                </div>
                {ownerEmail && (
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="text-xs text-primary-700 break-all">{ownerEmail}</dd>
                  </div>
                )}
                {ownerPhone && (
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500 dark:text-gray-400">Téléphone</dt>
                    <dd className="text-xs text-gray-700">{ownerPhone}</dd>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500 dark:text-gray-400">Statut KYC</dt>
                  <dd>
                    <Badge variant={kycBadge[ownerKycStatus ?? 'none'] ?? 'default'}>
                      {ownerKycStatus === 'verified' ? 'Vérifié'
                        : ownerKycStatus === 'pending' ? 'En attente'
                        : ownerKycStatus === 'rejected' ? 'Rejeté'
                        : 'Non soumis'}
                    </Badge>
                  </dd>
                </div>
                {ownerSubscriptionPlan && (
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500 dark:text-gray-400">Abonnement</dt>
                    <dd className="capitalize text-xs font-medium text-gray-700">{ownerSubscriptionPlan}</dd>
                  </div>
                )}
              </dl>

              {ownerLegalDocs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Documents légaux</p>
                  <div className="space-y-2">
                    {ownerLegalDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-gray-800">{legalDocLabel[doc.type] ?? doc.type}</p>
                          <Badge
                            variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warning'}
                          >
                            {doc.status === 'approved' ? 'Approuvé' : doc.status === 'rejected' ? 'Rejeté' : 'En attente'}
                          </Badge>
                        </div>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-primary-700 hover:bg-primary-50 rounded transition-colors"
                          title="Voir le document"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ownerLegalDocs.length === 0 && (
                <p className="text-xs text-gray-400 mt-3 italic">Aucun document légal soumis</p>
              )}

              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => router.push(`/users/${property.ownerId}`)}
                  className="text-xs text-primary-700 hover:underline font-medium"
                >
                  Voir le profil complet →
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <RejectPropertyModal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} propertyId={id} propertyTitle={property.title} />
      <RequestModificationsModal isOpen={modifOpen} onClose={() => setModifOpen(false)} propertyId={id} propertyTitle={property.title} />
      <SuspendPropertyModal isOpen={suspendOpen} onClose={() => setSuspendOpen(false)} propertyId={id} propertyTitle={property.title} />
    </div>
  );
}
