'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { propertiesService } from '@/services/api';
import { useDataTable } from '@/hooks/useDataTable';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import { AdminProperty, PropertyStatus } from '@/types/property';
import { useRouter } from 'next/navigation';

const statusVariant: Record<PropertyStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success', pending_review: 'warning', rejected: 'danger', draft: 'default', suspended: 'danger', archived: 'default',
};

export default function PropertiesPage() {
  const router = useRouter();
  const { queryParams, page, totalPages, handleSearch, handleFilter, handlePageChange, setTotalPages } = useDataTable();

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['properties', queryParams],
    queryFn: () => propertiesService.getProperties(queryParams),
    retry: 1,
  });
  useEffect(() => {
    if (data?.pages) setTotalPages(data.pages);
    else if (data?.total && data?.limit) setTotalPages(Math.ceil(data.total / data.limit));
  }, [data, setTotalPages]);

  const properties: AdminProperty[] = data?.properties ?? data?.data ?? data?.items ?? [];

  const columns = [
    { key: 'title', header: 'Titre', render: (p: AdminProperty) => (
      <div>
        <p className="font-medium text-gray-900">{p.title}</p>
        <p className="text-xs text-gray-500">{p.type} · {p.city}</p>
      </div>
    )},
    { key: 'owner', header: 'Propriétaire', render: (p: AdminProperty) => p.ownerName },
    { key: 'sector', header: 'Secteur', render: (p: AdminProperty) => <Badge variant="info">{p.sector}</Badge> },
    { key: 'status', header: 'Statut', render: (p: AdminProperty) => <Badge variant={statusVariant[p.status]}>{p.status}</Badge> },
    { key: 'boosted', header: 'Boosté', render: (p: AdminProperty) => p.isBoosted ? <Badge variant="success">Oui</Badge> : '—' },
    { key: 'submittedAt', header: 'Soumis le', render: (p: AdminProperty) => formatDate(p.submittedAt) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Propriétés</h1>
        <Button size="sm" onClick={() => router.push('/properties/pending')}>Modération</Button>
      </div>
      <Card padding={false}>
        <div className="p-4 border-b border-gray-100 flex gap-3">
          <input type="search" placeholder="Rechercher…" onChange={(e) => handleSearch(e.target.value)} className="input flex-1" />
          <select onChange={(e) => handleFilter('status', e.target.value)} className="input w-40">
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="pending">En attente</option>
            <option value="rejected">Rejeté</option>
          </select>
          <select onChange={(e) => handleFilter('sector', e.target.value)} className="input w-40">
            <option value="">Tous les secteurs</option>
            <option value="hebergement">Hébergement</option>
            <option value="immobilier">Immobilier</option>
            <option value="restaurant">Restaurant</option>
          </select>
        </div>
        {isLoading ? <PageSpinner /> : isError ? (
          <p className="text-center text-gray-400 py-10">Impossible de charger les propriétés.</p>
        ) : (
          <>
            <Table columns={columns} data={properties} keyExtractor={(p: AdminProperty) => p.id} emptyMessage="Aucune propriété trouvée" onRowClick={(p: AdminProperty) => router.push(`/properties/${p.id}`)} />
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </Card>
    </div>
  );
}
