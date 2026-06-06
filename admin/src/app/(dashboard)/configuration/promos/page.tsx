'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatAmount } from '@/lib/utils';
import { PromoCode } from '@/types/config';
import { useState } from 'react';
import { PromoCodeForm } from '@/components/forms/PromoCodeForm';
import { useToast } from '@/hooks/useToast';
import { ToggleLeft, ToggleRight, Trash2, Plus, Filter } from 'lucide-react';
import { ConfirmActionModal } from '@/components/modals/ConfirmActionModal';

type FilterStatus = 'all' | 'active' | 'inactive';

export default function PromosPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['promo-codes'],
    queryFn: () => configService.getPromoCodes(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      configService.togglePromoCode(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('Code promo mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => configService.deletePromoCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('Code promo supprimé');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const promos: PromoCode[] = data ?? [];
  const filtered = promos.filter((p) => {
    if (filterStatus === 'active') return p.isActive;
    if (filterStatus === 'inactive') return !p.isActive;
    return true;
  });

  const now = new Date();
  const isExpired = (promo: PromoCode) => new Date(promo.validUntil) < now;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Codes promotionnels</h1>
          <p className="text-sm text-gray-500">{promos.length} code{promos.length > 1 ? 's' : ''} au total</p>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowForm(true)}>
          Nouveau code
        </Button>
      </div>

      {showForm && (
        <PromoCodeForm
          onSuccess={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['promo-codes'] }); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-gray-400" />
        {(['all', 'active', 'inactive'] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filterStatus === f
                ? 'bg-primary-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'Tous' : f === 'active' ? 'Actifs' : 'Inactifs'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-gray-100">
            {filtered.map((promo) => {
              const expired = isExpired(promo);
              return (
                <div key={promo.id} className="flex items-center gap-4 px-4 py-4">
                  {/* Code + details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-semibold text-gray-900 text-sm">{promo.code}</span>
                      <Badge variant={promo.isActive && !expired ? 'success' : expired ? 'danger' : 'default'}>
                        {expired ? 'Expiré' : promo.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      <span>
                        Réduction :{' '}
                        <strong className="text-gray-700">
                          {promo.discountType === 'percentage'
                            ? `${promo.discountValue}%`
                            : formatAmount(promo.discountValue)}
                        </strong>
                      </span>
                      {(promo as any).minAmount && (
                        <span>Min. : {formatAmount((promo as any).minAmount)}</span>
                      )}
                      <span>
                        Utilisations : <strong className="text-gray-700">{promo.usedCount}</strong>
                        {promo.maxUses !== null && promo.maxUses !== undefined ? ` / ${promo.maxUses}` : ' (illimité)'}
                      </span>
                      <span>
                        Validité : {formatDate(promo.validFrom ?? promo.createdAt)} → {formatDate(promo.validUntil)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate({ id: promo.id, isActive: !promo.isActive })}
                      disabled={toggleMutation.isPending}
                      title={promo.isActive ? 'Désactiver' : 'Activer'}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                    >
                      {promo.isActive
                        ? <ToggleRight size={20} className="text-green-600" />
                        : <ToggleLeft size={20} className="text-gray-400" />}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(promo)}
                      title="Supprimer"
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-center text-gray-400">
                {filterStatus === 'all' ? 'Aucun code promo créé' : `Aucun code ${filterStatus === 'active' ? 'actif' : 'inactif'}`}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <ConfirmActionModal
          isOpen={!!deleteTarget}
          title="Supprimer le code promo"
          message={`Voulez-vous vraiment supprimer le code "${deleteTarget.code}" ? Cette action est irréversible.`}
          confirmLabel="Supprimer"
          variant="danger"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
