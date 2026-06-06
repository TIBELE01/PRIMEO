'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { useState } from 'react';
import { KycRejectModal } from '@/components/modals/KycRejectModal';
import { FileCheck, FileX, ExternalLink, ArrowLeft } from 'lucide-react';

const docTypeLabel: Record<string, string> = {
  identity: "Pièce d'identité",
  rccm: 'RCCM',
  tax_number: 'Numéro fiscal',
  operating_license: "Autorisation d'exercice",
};

interface KycEntry {
  userId: string;
  userName: string;
  userEmail: string;
  documents: Array<{ id: string; type: string; fileUrl: string; uploadedAt: string; status: string }>;
  submittedAt: string;
}

export default function KycQueuePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [rejectTarget, setRejectTarget] = useState<{ userId: string; userName: string } | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['kyc-pending'],
    queryFn: usersService.getPendingKyc,
  });

  const approve = useMutation({
    mutationFn: (userId: string) => usersService.approveKyc(userId),
    onSuccess: () => {
      toast.success('KYC approuvé');
      qc.invalidateQueries({ queryKey: ['kyc-pending'] });
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const entries: KycEntry[] = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 p-1">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File d'attente KYC</h1>
          <p className="text-sm text-gray-500 mt-0.5">Documents en attente de validation professionnelle</p>
        </div>
      </div>

      {isLoading ? <PageSpinner /> : (
        entries.length === 0 ? (
          <Card>
            <p className="text-center text-gray-400 py-10">Aucun document en attente de validation.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 font-medium">{entries.length} dossier{entries.length > 1 ? 's' : ''} en attente</p>
            {entries.map((entry) => (
              <Card key={entry.userId}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{entry.userName}</CardTitle>
                      <p className="text-sm text-gray-500 mt-0.5">{entry.userEmail}</p>
                      <p className="text-xs text-gray-400 mt-1">Soumis le {formatDate(entry.submittedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/users/${entry.userId}`)}
                      >
                        Voir profil
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<FileCheck size={14} />}
                        loading={approve.isPending}
                        onClick={() => approve.mutate(entry.userId)}
                      >
                        Approuver tout
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
                </CardHeader>

                {/* Documents list */}
                <div className="divide-y divide-gray-100 -mx-6 -mb-6 rounded-b-xl overflow-hidden">
                  {(entry.documents ?? []).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between px-6 py-3 bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{docTypeLabel[doc.type] ?? doc.type}</p>
                        <p className="text-xs text-gray-500">Déposé le {formatDate(doc.uploadedAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warning'}>
                          {doc.status === 'approved' ? 'Approuvé' : doc.status === 'rejected' ? 'Rejeté' : 'En attente'}
                        </Badge>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary-700 hover:underline"
                        >
                          <ExternalLink size={13} /> Voir
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

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
