'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import {
  MessageSquare, Flag, Trophy, Eye, EyeOff, Trash2,
  CheckCircle, Plus, X, Calendar, User, Globe,
} from 'lucide-react';

const POST_STATUS: Record<string, { label: string; color: string }> = {
  published: { label: 'Publié',  color: 'bg-green-100 text-green-700'  },
  hidden:    { label: 'Masqué',  color: 'bg-yellow-100 text-yellow-700' },
  deleted:   { label: 'Supprimé', color: 'bg-red-100 text-red-700'     },
};

type Tab = 'posts' | 'comments' | 'reports' | 'challenges';

/* ── Challenge form ──────────────────────────────────────────────────────── */
function ChallengeForm({ existing, onClose }: {
  existing?: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title:       existing?.title       ?? '',
    description: existing?.description ?? '',
    startDate:   existing?.startDate   ? existing.startDate.slice(0, 10) : '',
    endDate:     existing?.endDate     ? existing.endDate.slice(0, 10)   : '',
    isActive:    existing?.isActive    ?? true,
  });

  const save = useMutation({
    mutationFn: () => existing
      ? websiteService.updateChallenge(existing.id, { ...form, startDate: new Date(form.startDate), endDate: new Date(form.endDate) })
      : websiteService.createChallenge({ ...form, startDate: new Date(form.startDate), endDate: new Date(form.endDate) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community-challenges'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">{existing ? 'Modifier le challenge' : 'Nouveau challenge'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Début *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin *</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="rounded accent-blue-600" />
            <span className="text-sm font-medium text-gray-700">Challenge actif</span>
          </label>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={() => save.mutate()}
            disabled={save.isPending || !form.title || !form.startDate || !form.endDate}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function CommunityPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('posts');
  const [postPage, setPostPage] = useState(1);
  const [postStatus, setPostStatus] = useState('all');
  const [commentPage, setCommentPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  const [reportResolved, setReportResolved] = useState<string>('false');
  const [challengeForm, setChallengeForm] = useState<any>(null);

  /* ── Posts ── */
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['community-posts', postPage, postStatus],
    queryFn: () => websiteService.listCommunityPosts(postPage, 20, postStatus === 'all' ? undefined : postStatus),
    enabled: tab === 'posts',
  });

  /* ── Comments ── */
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['community-comments', commentPage],
    queryFn: () => websiteService.listCommunityComments(commentPage, 20),
    enabled: tab === 'comments',
  });

  /* ── Reports ── */
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['community-reports', reportPage, reportResolved],
    queryFn: () => websiteService.listCommunityReports(reportPage, 20, reportResolved === 'all' ? undefined : reportResolved === 'true'),
    enabled: tab === 'reports',
  });

  /* ── Challenges ── */
  const { data: challenges, isLoading: challengesLoading } = useQuery({
    queryKey: ['community-challenges'],
    queryFn: () => websiteService.listAdminChallenges(),
    enabled: tab === 'challenges',
  });

  /* ── Mutations ── */
  const hidePost = useMutation({
    mutationFn: (id: string) => websiteService.hideCommunityPost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-posts'] }),
  });
  const showPost = useMutation({
    mutationFn: (id: string) => websiteService.showCommunityPost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-posts'] }),
  });
  const deletePost = useMutation({
    mutationFn: (id: string) => websiteService.deleteCommunityPost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-posts'] }),
  });
  const hideComment = useMutation({
    mutationFn: (id: string) => websiteService.hideCommunityComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-comments'] }),
  });
  const deleteComment = useMutation({
    mutationFn: (id: string) => websiteService.deleteCommunityComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-comments'] }),
  });
  const resolveReport = useMutation({
    mutationFn: (id: string) => websiteService.resolveCommunityReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-reports'] }),
  });
  const deleteChallenge = useMutation({
    mutationFn: (id: string) => websiteService.deleteChallenge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-challenges'] }),
  });

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'posts',      label: 'Publications', icon: MessageSquare },
    { id: 'comments',   label: 'Commentaires', icon: MessageSquare },
    { id: 'reports',    label: 'Signalements', icon: Flag          },
    { id: 'challenges', label: 'Challenges',   icon: Trophy        },
  ];

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Communauté — Modération</h1>
        <p className="mt-1 text-gray-500 text-sm">Gérez les publications, commentaires, signalements et challenges de la communauté.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── POSTS TAB ── */}
      {tab === 'posts' && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {[['all','Toutes'],['published','Publiées'],['hidden','Masquées'],['deleted','Supprimées']].map(([v, l]) => (
              <button key={v} onClick={() => { setPostStatus(v); setPostPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  postStatus === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{l}</button>
            ))}
          </div>

          {postsLoading ? (
            <div className="text-center py-12 text-gray-400">Chargement…</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Pseudo</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Message</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">IP</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(postsData?.posts ?? []).map((p: any) => {
                      const st = POST_STATUS[p.status] ?? { label: p.status, color: 'bg-gray-100 text-gray-700' };
                      return (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <User size={13} className="text-gray-400 dark:text-gray-500" />
                              <span className="font-semibold text-gray-900">{p.pseudo}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-gray-700 truncate text-sm">{p.content}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-gray-500">
                              <Calendar size={12} />{fmt(p.createdAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-400 font-mono">{p.ipAddress ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {p.status === 'published' ? (
                                <button onClick={() => hidePost.mutate(p.id)}
                                  className="p-1.5 hover:bg-yellow-50 text-yellow-600 rounded-lg" title="Masquer">
                                  <EyeOff size={14} />
                                </button>
                              ) : (
                                <button onClick={() => showPost.mutate(p.id)}
                                  className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg" title="Restaurer">
                                  <Eye size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => { if (confirm('Supprimer définitivement cette publication ?')) deletePost.mutate(p.id); }}
                                className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Supprimer">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {(postsData?.pages ?? 0) > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <span className="text-sm text-gray-500">Page {postPage} / {postsData?.pages}</span>
                  <div className="flex gap-2">
                    <button disabled={postPage <= 1} onClick={() => setPostPage(p => p - 1)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40">← Préc.</button>
                    <button disabled={postPage >= (postsData?.pages ?? 1)} onClick={() => setPostPage(p => p + 1)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40">Suiv. →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── COMMENTS TAB ── */}
      {tab === 'comments' && (
        <>
          {commentsLoading ? (
            <div className="text-center py-12 text-gray-400">Chargement…</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Pseudo</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Commentaire</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(commentsData?.comments ?? []).map((c: any) => {
                      const st = POST_STATUS[c.status] ?? { label: c.status, color: 'bg-gray-100 text-gray-700' };
                      return (
                        <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-900">{c.pseudo}</td>
                          <td className="px-4 py-3 max-w-sm">
                            <p className="text-gray-700 truncate">{c.content}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{fmt(c.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              {c.status === 'published' && (
                                <button onClick={() => hideComment.mutate(c.id)}
                                  className="p-1.5 hover:bg-yellow-50 text-yellow-600 rounded-lg" title="Masquer">
                                  <EyeOff size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => { if (confirm('Supprimer ce commentaire ?')) deleteComment.mutate(c.id); }}
                                className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {(commentsData?.pages ?? 0) > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <span className="text-sm text-gray-500">Page {commentPage} / {commentsData?.pages}</span>
                  <div className="flex gap-2">
                    <button disabled={commentPage <= 1} onClick={() => setCommentPage(p => p - 1)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40">← Préc.</button>
                    <button disabled={commentPage >= (commentsData?.pages ?? 1)} onClick={() => setCommentPage(p => p + 1)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40">Suiv. →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── REPORTS TAB ── */}
      {tab === 'reports' && (
        <>
          <div className="flex gap-2 mb-4">
            {[['false','Non résolus'],['true','Résolus'],['all','Tous']].map(([v, l]) => (
              <button key={v} onClick={() => { setReportResolved(v); setReportPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  reportResolved === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{l}</button>
            ))}
          </div>

          {reportsLoading ? (
            <div className="text-center py-12 text-gray-400">Chargement…</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Raison</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">IP signalant</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportsData?.reports ?? []).map((r: any) => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            r.targetType === 'post' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                          }`}>{r.targetType === 'post' ? 'Publication' : 'Commentaire'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-xs">
                          <p className="truncate">{r.reason}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-gray-400">{r.reporterIp ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{fmt(r.createdAt)}</td>
                        <td className="px-4 py-3">
                          {r.resolved ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              <CheckCircle size={11} />Résolu
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700">En attente</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!r.resolved && (
                            <button onClick={() => resolveReport.mutate(r.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-700 bg-green-50 rounded-lg hover:bg-green-100">
                              <CheckCircle size={12} />Résoudre
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CHALLENGES TAB ── */}
      {tab === 'challenges' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setChallengeForm({})}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
              <Plus size={15} />Nouveau challenge
            </button>
          </div>

          {challengesLoading ? (
            <div className="text-center py-12 text-gray-400">Chargement…</div>
          ) : (
            <div className="grid gap-4">
              {(Array.isArray(challenges) ? challenges : []).map((ch: any) => (
                <div key={ch.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        ch.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>{ch.isActive ? 'Actif' : 'Inactif'}</span>
                      <h3 className="font-bold text-gray-900">{ch.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{ch.description}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={12} />
                      {fmt(ch.startDate)} → {fmt(ch.endDate)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setChallengeForm(ch)}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Globe size={14} /></button>
                    <button
                      onClick={() => { if (confirm('Supprimer ce challenge ?')) deleteChallenge.mutate(ch.id); }}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {(!challenges || (Array.isArray(challenges) && !challenges.length)) && (
                <div className="text-center py-12 text-gray-400">Aucun challenge. Créez-en un !</div>
              )}
            </div>
          )}
        </>
      )}

      {challengeForm !== null && (
        <ChallengeForm
          existing={challengeForm.id ? challengeForm : undefined}
          onClose={() => setChallengeForm(null)}
        />
      )}
    </div>
  );
}
