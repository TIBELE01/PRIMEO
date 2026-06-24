'use client';
import { useQuery } from '@tanstack/react-query';
import { supportService } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useRouter } from 'next/navigation';
import { Ticket, MessageSquare, Clock, CheckCircle, AlertTriangle, Bot } from 'lucide-react';

export default function SupportPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery<any>({
    queryKey: ['support-stats'],
    queryFn: supportService.getStats,
    refetchInterval: 60_000,
  });

  const stats = [
    {
      label: 'Tickets ouverts',
      value: data?.byStatus?.open ?? 0,
      icon: <Ticket size={20} className="text-yellow-600" />,
      bg: 'bg-yellow-50',
      href: '/support/tickets?status=open',
    },
    {
      label: 'En cours de traitement',
      value: data?.byStatus?.in_progress ?? 0,
      icon: <Clock size={20} className="text-blue-600" />,
      bg: 'bg-blue-50',
      href: '/support/tickets?status=in_progress',
    },
    {
      label: 'Résolus',
      value: data?.byStatus?.resolved ?? 0,
      icon: <CheckCircle size={20} className="text-green-600" />,
      bg: 'bg-green-50',
      href: '/support/tickets?status=resolved',
    },
    {
      label: 'Délai moyen résolution',
      value: data?.avgResolutionHours !== null && data?.avgResolutionHours !== undefined ? `${data.avgResolutionHours}h` : '—',
      icon: <Clock size={20} className="text-gray-500 dark:text-gray-400" />,
      bg: 'bg-gray-50',
      href: '#',
    },
  ];

  const byCategory: Record<string, string> = {
    technical: 'Technique',
    dispute: 'Litige',
    information: 'Information',
    complaint: 'Réclamation',
  };

  const byPriority: Record<string, string> = {
    urgent: 'Urgente',
    high: 'Haute',
    medium: 'Moyenne',
    low: 'Basse',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Bot size={15} />} onClick={() => router.push('/support/chatbot')}>
            Gestion chatbot
          </Button>
          <Button size="sm" leftIcon={<Ticket size={15} />} onClick={() => router.push('/support/tickets')}>
            Tous les tickets
          </Button>
        </div>
      </div>

      {isLoading ? <PageSpinner /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ label, value, icon, bg, href }) => (
              <div
                key={label}
                onClick={() => href !== '#' && router.push(href)}
                className={href !== '#' ? 'cursor-pointer' : ''}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>{icon}</div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{label}</p>
                </Card>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By category */}
            <Card>
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Tickets par catégorie</h2>
              <div className="space-y-3">
                {Object.entries(byCategory).map(([key, label]) => {
                  const count = data?.byCategory?.[key] ?? 0;
                  const total = data?.total ?? 1;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{label}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-primary-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* By priority */}
            <Card>
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Tickets par priorité</h2>
              <div className="space-y-3">
                {Object.entries(byPriority).map(([key, label]) => {
                  const count = data?.byPriority?.[key] ?? 0;
                  const total = data?.total ?? 1;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const colors: Record<string, string> = {
                    urgent: 'bg-red-500',
                    high: 'bg-orange-500',
                    medium: 'bg-yellow-500',
                    low: 'bg-green-500',
                  };
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{label}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`${colors[key]} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/support/tickets')}>
              <Card className="h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <Ticket size={20} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Gérer les tickets</p>
                    <p className="text-sm text-gray-500">Filtrer, assigner, commenter et résoudre</p>
                  </div>
                </div>
              </Card>
            </div>
            <div className="flex-1 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/support/chatbot')}>
              <Card className="h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Bot size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Interface chatbot</p>
                    <p className="text-sm text-gray-500">Conversations, questions non répondues, FAQ</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
