'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';
import { formatRelative } from '@/lib/utils';
import { ArrowLeft, Bot, TrendingUp, HelpCircle, AlertTriangle, BookOpen, Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface FaqEntry {
  id: string;
  keywords: string[];
  response: string;
  intent: string;
  category?: string;
}

function StatsSection() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['chatbot-stats'],
    queryFn: supportService.getChatbotStats,
    refetchInterval: 60_000,
  });

  if (isLoading) return <PageSpinner />;

  const kpis = [
    {
      label: 'Messages total',
      value: data?.total ?? 0,
      icon: <Bot size={18} className="text-purple-600" />,
      bg: 'bg-purple-50',
    },
    {
      label: 'Taux de résolution auto',
      value: `${data?.resolutionRate ?? 0}%`,
      icon: <TrendingUp size={18} className="text-green-600" />,
      bg: 'bg-green-50',
    },
    {
      label: 'Escalades support humain',
      value: data?.escalated ?? 0,
      icon: <AlertTriangle size={18} className="text-orange-600" />,
      bg: 'bg-orange-50',
    },
    {
      label: 'Messages avant escalade (moy.)',
      value: data?.avgMessagesBeforeEscalation ?? '—',
      icon: <HelpCircle size={18} className="text-blue-600" />,
      bg: 'bg-blue-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(({ label, value, icon, bg }) => (
        <Card key={label}>
          <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>{icon}</div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        </Card>
      ))}
      {data?.topIntents?.length > 0 && (
        <Card className="col-span-2 lg:col-span-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top catégories de questions</h3>
          <div className="flex flex-wrap gap-2">
            {data.topIntents.map((item: { intent: string; count: number }, i: number) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                <span className="font-medium text-purple-700">{item.intent}</span>
                <span className="text-gray-400">·</span>
                <span>{item.count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ConversationsTab() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['chatbot-conversations'],
    queryFn: () => supportService.getChatbotConversations(30),
  });

  if (isLoading) return <PageSpinner />;

  const logs: any[] = data ?? [];

  const actionLabel: Record<string, { label: string; color: string }> = {
    'chatbot.message': { label: 'Réponse', color: 'text-green-700 bg-green-50' },
    'chatbot.no_match': { label: 'Sans réponse', color: 'text-orange-700 bg-orange-50' },
    'chatbot.escalation': { label: 'Escalade', color: 'text-red-700 bg-red-50' },
  };

  return (
    <div className="space-y-2">
      {logs.length === 0 && (
        <p className="text-center text-gray-400 py-10">Aucune conversation enregistrée</p>
      )}
      {logs.map((log) => {
        const info = actionLabel[log.action] ?? { label: log.action, color: 'text-gray-700 bg-gray-50' };
        return (
          <div key={log.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap ${info.color}`}>
              {info.label}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 truncate">{log.description}</p>
              {log.user && (
                <p className="text-xs text-gray-400 mt-0.5">{log.user.firstName} {log.user.lastName}</p>
              )}
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{formatRelative(log.createdAt)}</span>
          </div>
        );
      })}
    </div>
  );
}

function UnansweredTab() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['chatbot-unanswered'],
    queryFn: () => supportService.getUnansweredQuestions(50),
  });

  if (isLoading) return <PageSpinner />;

  const questions: any[] = data ?? [];

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-3">
        Ces questions n'ont pas reçu de réponse. Ajoutez-les à la FAQ pour améliorer le chatbot.
      </p>
      {questions.length === 0 && (
        <p className="text-center text-gray-400 py-10">Aucune question sans réponse</p>
      )}
      {questions.map((q) => (
        <div key={q.id} className="flex items-start gap-3 p-3 border border-orange-100 bg-orange-50/40 rounded-lg">
          <HelpCircle size={15} className="text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800">{q.query}</p>
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">{formatRelative(q.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

function FaqEditor() {
  const qc = useQueryClient();
  const toast = useToast();

  const { data: faqData, isLoading } = useQuery<any>({
    queryKey: ['chatbot-faq'],
    queryFn: supportService.getChatbotFaq,
  });

  const [entries, setEntries] = useState<FaqEntry[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentEntries: FaqEntry[] = entries ?? faqData?.faq ?? [];

  const save = useMutation({
    mutationFn: () => supportService.updateChatbotFaq(currentEntries),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chatbot-faq'] });
      toast.success('FAQ mise à jour');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const updateEntry = (id: string, field: keyof FaqEntry, value: string | string[]) => {
    setEntries(
      currentEntries.map((e) => e.id === id ? { ...e, [field]: value } : e),
    );
  };

  const removeEntry = (id: string) => {
    setEntries(currentEntries.filter((e) => e.id !== id));
  };

  const addEntry = () => {
    const newEntry: FaqEntry = {
      id: `custom_${Date.now()}`,
      keywords: [],
      response: '',
      intent: 'general_inquiry',
      category: 'Autre',
    };
    setEntries([...(entries ?? faqData?.faq ?? []), newEntry]);
    setExpandedId(newEntry.id);
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">
          {faqData?.isCustom ? 'FAQ personnalisée' : 'FAQ par défaut (lecture seule si non modifiée)'}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" leftIcon={<Plus size={13} />} onClick={addEntry}>
            Ajouter
          </Button>
          <Button size="sm" leftIcon={<Save size={13} />} loading={save.isPending} onClick={() => save.mutate()}>
            Enregistrer
          </Button>
        </div>
      </div>

      {currentEntries.map((entry) => (
        <div key={entry.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 truncate">
                {entry.keywords[0] ?? '(sans mot-clé)'}
              </span>
              {entry.category && (
                <span className="text-xs text-gray-400">· {entry.category}</span>
              )}
            </div>
            {expandedId === entry.id ? <ChevronUp size={15} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />}
          </button>

          {expandedId === entry.id && (
            <div className="p-4 space-y-3 border-t border-gray-100">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Mots-clés (séparés par des virgules)</label>
                <input
                  value={entry.keywords.join(', ')}
                  onChange={(e) => updateEntry(entry.id, 'keywords', e.target.value.split(',').map((k) => k.trim()).filter(Boolean))}
                  className="input w-full text-sm"
                  placeholder="ex: réserver, faire une réservation, book"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Catégorie</label>
                <input
                  value={entry.category ?? ''}
                  onChange={(e) => updateEntry(entry.id, 'category', e.target.value)}
                  className="input w-full text-sm"
                  placeholder="ex: Réservations"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Réponse du chatbot</label>
                <textarea
                  value={entry.response}
                  onChange={(e) => updateEntry(entry.id, 'response', e.target.value)}
                  rows={4}
                  className="input w-full text-sm resize-none"
                  placeholder="Réponse affichée à l'utilisateur…"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                >
                  <Trash2 size={12} /> Supprimer cette entrée
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { id: 'stats', label: 'Statistiques' },
  { id: 'conversations', label: 'Conversations récentes' },
  { id: 'unanswered', label: 'Questions sans réponse' },
  { id: 'faq', label: 'Modifier la FAQ' },
];

export default function ChatbotAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/support')} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interface chatbot</h1>
          <p className="text-sm text-gray-500 mt-0.5">Conversations, questions non répondues, gestion de la FAQ</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'stats' && <StatsSection />}
        {activeTab === 'conversations' && (
          <Card>
            <ConversationsTab />
          </Card>
        )}
        {activeTab === 'unanswered' && (
          <Card>
            <UnansweredTab />
          </Card>
        )}
        {activeTab === 'faq' && (
          <Card>
            <FaqEditor />
          </Card>
        )}
      </div>
    </div>
  );
}
