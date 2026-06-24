'use client';
import { useQuery } from '@tanstack/react-query';
import { logsService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function LogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: log, isLoading } = useQuery<any>({ queryKey: ['log', id], queryFn: () => logsService.getLogById(id) });

  if (isLoading) return <PageSpinner />;
  if (!log) return <p className="text-gray-500 dark:text-gray-400">Entrée introuvable</p>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}><ArrowLeft size={20} className="text-gray-400 hover:text-gray-700" /></button>
        <h1 className="text-2xl font-bold text-gray-900">Entrée de journal</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>{log.action}</CardTitle><Badge variant="info">{log.level}</Badge></CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Admin</dt><dd>{log.adminName}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Cible</dt><dd>{log.targetType}:{log.targetId}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Date</dt><dd>{formatDateTime(log.createdAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">IP</dt><dd>{log.ip ?? '—'}</dd></div>
          </dl>
          {log.metadata && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Métadonnées</p>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto">{JSON.stringify(log.metadata, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
