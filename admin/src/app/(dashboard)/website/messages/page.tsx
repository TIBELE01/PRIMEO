'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { ArrowLeft, Mail, MailOpen, Download, Send, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type Status = 'all' | 'read' | 'unread';

const SUBJECTS: Record<string, string> = {
  'Question générale': 'bg-gray-100 text-gray-700',
  'Support technique': 'bg-blue-100 text-blue-700',
  'Litige':           'bg-red-100 text-red-700',
  'Partenariat':      'bg-purple-100 text-purple-700',
  'Devenir professionnel': 'bg-green-100 text-green-700',
};

export default function MessagesPage() {
  const qc = useQueryClient();
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState<Status>('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['contact-messages', page, status],
    queryFn: () => websiteService.listContactMessages(page, LIMIT, status),
  });

  const markReadMut = useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) =>
      websiteService.markMessageRead(id, isRead),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-messages'] }),
  });

  const replyMut = useMutation({
    mutationFn: ({ id, replyText }: { id: string; replyText: string }) =>
      websiteService.replyMessage(id, replyText),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-messages'] });
      setShowReply(false);
      setReplyText('');
      if (selected) setSelected((prev: any) => ({ ...prev, isReplied: true, isRead: true }));
    },
  });

  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  function openMessage(m: any) {
    setSelected(m);
    setShowReply(false);
    setReplyText('');
    if (!m.isRead) markReadMut.mutate({ id: m.id, isRead: true });
  }

  function handleExport() {
    const url = websiteService.exportMessagesUrl();
    const a   = document.createElement('a');
    a.href    = url;
    a.download = `messages-contact-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/website" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft size={14} /> Retour Site vitrine
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Messages de contact</h1>
        </div>
        <button onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">
          <Download size={15} /> Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'unread', 'read'] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'Tous' : s === 'unread' ? 'Non lus' : 'Lus'}
          </button>
        ))}
        {total > 0 && <span className="ml-auto text-sm text-gray-400 self-center">{total} message{total > 1 ? 's' : ''}</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-gray-500 p-4">Chargement…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Aucun message.</p>
          ) : (
            messages.map((m: any) => (
              <div
                key={m.id}
                onClick={() => openMessage(m)}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm ${
                  selected?.id === m.id ? 'border-blue-400 ring-2 ring-blue-100' :
                  !m.isRead ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {m.isRead
                      ? <MailOpen size={14} className="text-gray-400 flex-shrink-0" />
                      : <Mail size={14} className="text-blue-500 flex-shrink-0" />
                    }
                    <p className={`text-sm font-semibold truncate ${!m.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>{m.name}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                    {new Date(m.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mb-1.5">{m.email}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SUBJECTS[m.subject] ?? 'bg-gray-100 text-gray-600'}`}>
                    {m.subject}
                  </span>
                  {m.isReplied && <span className="text-xs text-green-600 font-medium">Répondu</span>}
                </div>
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{m.message}</p>
              </div>
            ))
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft size={15} />
              </button>
              <span className="text-sm text-gray-500">Page {page} / {pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900">{selected.name}</p>
                <a href={`mailto:${selected.email}`} className="text-xs text-blue-500 hover:underline">{selected.email}</a>
                {selected.phone && <p className="text-xs text-gray-500 mt-0.5">{selected.phone}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => markReadMut.mutate({ id: selected.id, isRead: !selected.isRead })}
                  className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                >
                  {selected.isRead ? <Mail size={12} /> : <MailOpen size={12} />}
                  {selected.isRead ? 'Marquer non lu' : 'Marquer lu'}
                </button>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SUBJECTS[selected.subject] ?? 'bg-gray-100 text-gray-600'}`}>
                {selected.subject}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(selected.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              {selected.isReplied && (
                <span className="text-xs text-green-600 font-medium">
                  Répondu le {selected.repliedAt ? new Date(selected.repliedAt).toLocaleDateString('fr-FR') : ''}
                </span>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
              {selected.message}
            </div>

            {/* Reply */}
            {!showReply ? (
              <button
                onClick={() => setShowReply(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <Send size={14} /> Répondre
              </button>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Votre réponse</label>
                <textarea
                  rows={5}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Bonjour ${selected.name},\n\n`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => replyMut.mutate({ id: selected.id, replyText })}
                    disabled={replyMut.isPending || !replyText.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send size={13} /> {replyMut.isPending ? 'Envoi…' : 'Envoyer'}
                  </button>
                  <button onClick={() => setShowReply(false)} className="px-3 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">
                    Annuler
                  </button>
                </div>
                {replyMut.isSuccess && <p className="text-xs text-green-600">Réponse envoyée ✓</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl flex items-center justify-center min-h-40">
            <p className="text-sm text-gray-400">Sélectionnez un message pour le lire</p>
          </div>
        )}
      </div>
    </div>
  );
}
