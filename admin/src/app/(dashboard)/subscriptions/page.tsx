'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usersService } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatAmount } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { AlertTriangle } from 'lucide-react';

export default function PaymentFailuresPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['payment-failures', page],
    queryFn: () => usersService.getPaymentFailures({ page, limit: 20 }),
    refetchInterval: 60_000,
  });

  const recalc = useMutation({
    mutationFn: (userId: string) => usersService.forceRecalculateBenefits(userId),
    onSuccess: (_res, userId) => {
      toast.success('Avantages recalculés');
      qc.invalidateQueries({ queryKey: ['payment-failures'] });
      qc.invalidateQueries({ queryKey: ['sub-history', userId] });
    },
    onError: () => toast.error('Erreur lors du recalcul'),
  });

  const items: any[] = data?.items ?? data?.data?.items ?? [];
  const total: number = data?.total ?? data?.data?.total ?? 0;
  const pages: number = data?.pages ?? data?.data?.pages ?? 1;

  const columns = [
    {
      key: 'user',
      header: 'Professionnel',
      render: (row: any) => (
        <div>
          <p className="font-medium text-gray-900">{row.user?.firstName} {row.user?.lastName}</p>
          <p className="text-xs text-gray-500">{row.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Formule',
      render: (row: any) => (
        <Badge variant={row.planType === 'entreprise' ? 'success' : row.planType === 'business' ? 'info' : 'default'}>
          {row.planType ?? '—'}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Mensualité',
      render: (row: any) => <span className="text-sm font-semibold">{formatAmount(row.monthlyPrice)}</span>,
    },
    {
      key: 'failures',
      header: 'Échecs (7 j)',
      render: (row: any) => (
        <span className={`font-bold text-sm ${row.failedAttempts >= 5 ? 'text-red-600' : row.failedAttempts >= 3 ? 'text-orange-500' : 'text-yellow-600'}`}>
          {row.failedAttempts} / 7
        </span>
      ),
    },
    {
      key: 'suspension',
      header: 'Suspension dans',
      render: (row: any) => (
        <Badge variant={row.daysUntilSuspension <= 1 ? 'danger' : row.daysUntilSuspension <= 3 ? 'warning' : 'default'}>
          {row.daysUntilSuspension === 0 ? 'Imminent' : `${row.daysUntilSuspension} j`}
        </Badge>
      ),
    },
    {
      key: 'lastAttempt',
      header: 'Dernier prélèvement',
      render: (row: any) => <span className="text-xs text-gray-500">{row.lastAttemptAt ? formatDate(row.lastAttemptAt) : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row: any) => (
        <Badge variant={row.status === 'suspended' ? 'danger' : 'warning'}>
          {row.status === 'suspended' ? 'Suspendu' : 'Actif (en grâce)'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: any) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push(`/users/${row.userId}`)}>
            Voir
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={recalc.isPending}
            onClick={() => recalc.mutate(row.userId)}
          >
            Recalc.
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={22} className="text-orange-500" />
            Défauts de paiement
          </h1>
          {total > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {total} professionnel{total > 1 ? 's' : ''} avec des paiements échoués cette semaine
            </p>
          )}
        </div>
      </div>

      <Card padding={false}>
        {isLoading ? (
          <PageSpinner />
        ) : isError ? (
          <p className="text-center text-gray-400 py-10">Impossible de charger les données.</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">Aucun défaut de paiement cette semaine 🎉</p>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={items}
              keyExtractor={(row: any) => row.userId}
              emptyMessage="Aucun défaut de paiement"
            />
            {pages > 1 && (
              <div className="p-4 border-t border-gray-100">
                <Pagination page={page} totalPages={pages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
