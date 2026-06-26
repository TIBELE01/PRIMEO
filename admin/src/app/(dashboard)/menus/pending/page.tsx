'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuItemsService } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { CheckCircle, XCircle, ArrowLeft, ImageOff } from 'lucide-react';

interface PendingMenuItem {
  id: string;
  name: string;
  section: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  createdAt: string;
  property: { id: string; title: string; owner?: { firstName: string; lastName: string; email: string } };
}

export default function PendingMenuItemsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery<any>({
    queryKey: ['menu-items-pending'],
    queryFn: () => menuItemsService.getPending(),
  });

  const approve = useMutation({
    mutationFn: (id: string) => menuItemsService.approve(id),
    onSuccess: () => {
      toast.success('Plat validé');
      qc.invalidateQueries({ queryKey: ['menu-items-pending'] });
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => menuItemsService.reject(id, reason),
    onSuccess: () => {
      toast.success('Plat refusé');
      qc.invalidateQueries({ queryKey: ['menu-items-pending'] });
    },
    onError: () => toast.error('Erreur lors du rejet'),
  });

  const onReject = (item: PendingMenuItem) => {
    const reason = window.prompt(`Motif du rejet pour « ${item.name} » :`, '');
    if (reason === null) return;
    reject.mutate({ id: item.id, reason: reason.trim() || 'Non conforme' });
  };

  const items: PendingMenuItem[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 p-1">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modération des plats</h1>
          <p className="text-sm text-gray-500 mt-0.5">Plats de restaurant en attente de validation</p>
        </div>
      </div>

      {isLoading ? <PageSpinner /> : (
        items.length === 0 ? (
          <Card>
            <p className="text-center text-gray-400 py-10">Aucun plat en attente de modération.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 font-medium">
              {items.length} plat{items.length > 1 ? 's' : ''} en attente
            </p>
            {items.map((it) => (
              <Card key={it.id} padding={false}>
                <div className="flex">
                  <div className="w-36 shrink-0 rounded-l-xl overflow-hidden bg-gray-100 flex items-center justify-center min-h-[110px]">
                    {it.photoUrl ? (
                      <img src={it.photoUrl} alt={it.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff size={28} className="text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-gray-900">{it.name}</h2>
                      <Badge variant="info">{it.section}</Badge>
                      <Badge variant="warning">{it.price.toLocaleString('fr-CI')} FCFA</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Restaurant : <span className="font-medium text-gray-600">{it.property?.title}</span>
                      {it.property?.owner && <span className="ml-1">· {it.property.owner.firstName} {it.property.owner.lastName}</span>}
                      {' · '}Soumis le {formatDate(it.createdAt)}
                    </p>
                    {it.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{it.description}</p>
                    )}

                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <Button size="sm" leftIcon={<CheckCircle size={14} />} loading={approve.isPending} onClick={() => approve.mutate(it.id)}>
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        leftIcon={<XCircle size={14} />}
                        onClick={() => onReject(it)}
                      >
                        Rejeter
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
