'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, Save } from 'lucide-react';
import Link from 'next/link';

type Tab = 'intro' | 'subscriptions' | 'boost' | 'ads' | 'upcoming';

/* ── Shared helpers ─────────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const ta  = inp + ' resize-none';

/* ══════════════════════════════════════════════════════════════════════════
   Tab 1 — Introduction
══════════════════════════════════════════════════════════════════════════ */

function IntroTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['prod-intro'], queryFn: () => websiteService.getProductsPageIntro() });
  const [form, setForm] = useState<{ title: string; paragraph: string } | null>(null);

  const mut = useMutation({
    mutationFn: (payload: { title: string; paragraph: string }) => websiteService.updateProductsPageIntro(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prod-intro'] }); setForm(null); },
  });

  if (isLoading) return <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>;
  const cur = form ?? { title: data?.title || '', paragraph: data?.paragraph || '' };

  return (
    <div className="space-y-4 max-w-2xl">
      <Field label="Titre de la section">
        <input className={inp} value={cur.title} onChange={e => setForm({ ...cur, title: e.target.value })} />
      </Field>
      <Field label="Paragraphe d'introduction">
        <textarea className={ta} rows={4} value={cur.paragraph} onChange={e => setForm({ ...cur, paragraph: e.target.value })} />
      </Field>
      <button onClick={() => mut.mutate(cur)} disabled={mut.isPending || !cur.title}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
        <Save size={14} /> {mut.isPending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Tab 2 — Abonnements (plans + rows)
══════════════════════════════════════════════════════════════════════════ */

interface SubPlan { id: string; slug: string; name: string; price: string; badge: string | null; highlighted: boolean; ctaLabel: string; ctaUrl: string; active: boolean; }
interface SubRow  { id: string; feature: string; highlight: boolean; essential: string; prestige: string; premium: string; active: boolean; }

function PlanCard({ plan, onSave }: { plan: SubPlan; onSave: (id: string, d: SubPlan) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<SubPlan>(plan);

  return (
    <div className={`border rounded-xl p-4 ${plan.highlighted ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      {isEditing ? (
        <div className="space-y-2">
          <input className={inp} value={draft.name} onChange={e => setDraft(p => ({...p, name: e.target.value}))} placeholder="Nom" />
          <input className={inp} value={draft.price} onChange={e => setDraft(p => ({...p, price: e.target.value}))} placeholder="Prix (ex: 19 900)" />
          <input className={inp} value={draft.badge || ''} onChange={e => setDraft(p => ({...p, badge: e.target.value || null}))} placeholder="Badge (optionnel)" />
          <input className={inp} value={draft.ctaLabel} onChange={e => setDraft(p => ({...p, ctaLabel: e.target.value}))} placeholder="Label CTA" />
          <input className={inp} value={draft.ctaUrl} onChange={e => setDraft(p => ({...p, ctaUrl: e.target.value}))} placeholder="URL CTA" />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={draft.highlighted} onChange={e => setDraft(p => ({...p, highlighted: e.target.checked}))} />
            Formule mise en avant (bleue)
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { onSave(plan.id, draft); setIsEditing(false); }}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700">
              <Check size={12} /> OK
            </button>
            <button onClick={() => setIsEditing(false)} className="px-3 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              {plan.badge && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">{plan.badge}</span>}
              <div className="font-bold text-sm mt-1">{plan.name}</div>
              <div className="text-xl font-black text-blue-700 mt-0.5">{plan.price} <span className="text-xs font-normal text-gray-500">FCFA/mois</span></div>
            </div>
            <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-600 p-1">
              <Edit2 size={14} />
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-2">{plan.ctaLabel}</div>
        </>
      )}
    </div>
  );
}

function SubRowItem({ row, onSave, onDelete }: { row: SubRow; onSave: (id: string, d: SubRow) => void; onDelete: (id: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<SubRow>(row);
  const rowCls = `border-b border-gray-100 ${!row.active ? 'opacity-40' : ''} ${row.highlight ? 'font-semibold bg-blue-50/40' : ''}`;

  if (isEditing) {
    return (
      <tr className={rowCls}>
        <td className="px-3 py-1.5">
          <input className={inp} value={draft.feature} onChange={e => setDraft(p => ({...p, feature: e.target.value}))} />
        </td>
        {(['essential', 'prestige', 'premium'] as const).map(k => (
          <td key={k} className="px-3 py-1.5">
            <input className={inp + ' text-center'} value={draft[k]} onChange={e => setDraft(p => ({...p, [k]: e.target.value}))} />
          </td>
        ))}
        <td className="px-3 py-1.5">
          <div className="flex gap-1">
            <button onClick={() => { onSave(row.id, draft); setIsEditing(false); }} className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"><Check size={13}/></button>
            <button onClick={() => setIsEditing(false)} className="p-1 border border-gray-300 rounded text-gray-500 hover:bg-gray-100"><X size={13}/></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={rowCls}>
      <td className="px-3 py-2 text-sm">{row.feature}</td>
      <td className="px-3 py-2 text-center text-sm">{row.essential || '—'}</td>
      <td className="px-3 py-2 text-center text-sm">{row.prestige  || '—'}</td>
      <td className="px-3 py-2 text-center text-sm font-semibold text-blue-700">{row.premium || '—'}</td>
      <td className="px-3 py-2">
        <div className="flex gap-1 justify-end">
          <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={13}/></button>
          <button onClick={() => { if (confirm('Supprimer ?')) onDelete(row.id); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={13}/></button>
        </div>
      </td>
    </tr>
  );
}

function SubscriptionsTab() {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery<SubPlan[]>({ queryKey: ['prod-plans'], queryFn: () => websiteService.listSubPlans() });
  const { data: rows  = [] } = useQuery<SubRow[]> ({ queryKey: ['prod-rows'],  queryFn: () => websiteService.listSubRows()  });

  const [addingRow, setAddingRow] = useState(false);
  const [newRow, setNewRow] = useState({ feature: '', essential: '', prestige: '', premium: '', highlight: false });

  const updatePlan = useMutation({
    mutationFn: ({ id, d }: { id: string; d: object }) => websiteService.updateSubPlan(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prod-plans'] }),
  });
  const createRow = useMutation({
    mutationFn: (d: object) => websiteService.createSubRow(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prod-rows'] }); setAddingRow(false); setNewRow({ feature: '', essential: '', prestige: '', premium: '', highlight: false }); },
  });
  const updateRow = useMutation({
    mutationFn: ({ id, d }: { id: string; d: object }) => websiteService.updateSubRow(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prod-rows'] }),
  });
  const deleteRow = useMutation({
    mutationFn: (id: string) => websiteService.deleteSubRow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prod-rows'] }),
  });

  return (
    <div className="space-y-8">
      {/* Plans */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Formules</h3>
        <div className="grid grid-cols-3 gap-3">
          {plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} onSave={(id, d) => updatePlan.mutate({ id, d })} />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Lignes du tableau</h3>
          {!addingRow && (
            <button onClick={() => setAddingRow(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
              <Plus size={12} /> Ajouter une ligne
            </button>
          )}
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Fonctionnalité</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Essentiel</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Prestige</th>
                <th className="px-3 py-2 text-xs font-semibold text-blue-600 uppercase">Premium</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {addingRow && (
                <tr className="bg-blue-50 border-b border-blue-100">
                  <td className="px-3 py-2">
                    <input className={inp} value={newRow.feature} onChange={e => setNewRow(p => ({...p, feature: e.target.value}))} placeholder="Nom de la fonctionnalité" />
                  </td>
                  {(['essential', 'prestige', 'premium'] as const).map(k => (
                    <td key={k} className="px-3 py-2">
                      <input className={inp + ' text-center'} value={newRow[k]} onChange={e => setNewRow(p => ({...p, [k]: e.target.value}))} placeholder="—" />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => createRow.mutate(newRow)} disabled={!newRow.feature}
                        className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"><Check size={13} /></button>
                      <button onClick={() => setAddingRow(false)} className="p-1 border border-gray-300 rounded text-gray-500 hover:bg-gray-100"><X size={13} /></button>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map(row => (
                <SubRowItem key={row.id} row={row}
                  onSave={(id, d) => updateRow.mutate({ id, d })}
                  onDelete={id => deleteRow.mutate(id)}
                />
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !addingRow && (
            <div className="text-center text-gray-400 text-sm py-6">Aucune ligne. Les valeurs par défaut sont affichées.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Tab 3 — Boost
══════════════════════════════════════════════════════════════════════════ */

function BoostTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['prod-boost'], queryFn: () => websiteService.getProductsBoostSection() });
  const [form, setForm] = useState<any>(null);

  const mut = useMutation({
    mutationFn: (payload: any) => websiteService.updateProductsBoostSection(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prod-boost'] }); setForm(null); },
  });

  if (isLoading) return <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>;
  const cur = form ?? { title: data?.title || '', description: data?.description || '', price: data?.price ?? 2000, duration: data?.duration ?? 72, ctaLabel: data?.ctaLabel || '', ctaUrl: data?.ctaUrl || '' };
  const set = (k: string, v: any) => setForm({ ...cur, [k]: v });

  return (
    <div className="space-y-4 max-w-2xl">
      <Field label="Titre"><input className={inp} value={cur.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label="Description"><textarea className={ta} rows={3} value={cur.description} onChange={e => set('description', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix (FCFA)"><input type="number" className={inp} value={cur.price} onChange={e => set('price', Number(e.target.value))} /></Field>
        <Field label="Durée (heures)"><input type="number" className={inp} value={cur.duration} onChange={e => set('duration', Number(e.target.value))} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Label bouton"><input className={inp} value={cur.ctaLabel} onChange={e => set('ctaLabel', e.target.value)} /></Field>
        <Field label="URL bouton"><input className={inp} value={cur.ctaUrl} onChange={e => set('ctaUrl', e.target.value)} /></Field>
      </div>
      <button onClick={() => mut.mutate(cur)} disabled={mut.isPending || !cur.title}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
        <Save size={14} /> {mut.isPending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Tab 4 — Publicités
══════════════════════════════════════════════════════════════════════════ */

function AdsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['prod-ads'], queryFn: () => websiteService.getProductsAdsSection() });
  const [form, setForm] = useState<any>(null);

  const mut = useMutation({
    mutationFn: (payload: any) => websiteService.updateProductsAdsSection(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prod-ads'] }); setForm(null); },
  });

  if (isLoading) return <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>;

  const rawFormats = data ? (Array.isArray(data.formats) ? data.formats.join('\n') : data.formats || '') : '';
  const cur = form ?? { title: data?.title || '', description: data?.description || '', formatsText: rawFormats, ctaLabel: data?.ctaLabel || '', ctaUrl: data?.ctaUrl || '' };
  const set = (k: string, v: string) => setForm({ ...cur, [k]: v });

  const handleSave = () => mut.mutate({
    title: cur.title,
    description: cur.description,
    formats: JSON.stringify(cur.formatsText.split('\n').map((s: string) => s.trim()).filter(Boolean)),
    ctaLabel: cur.ctaLabel,
    ctaUrl: cur.ctaUrl,
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <Field label="Titre"><input className={inp} value={cur.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label="Description"><textarea className={ta} rows={3} value={cur.description} onChange={e => set('description', e.target.value)} /></Field>
      <Field label="Formats disponibles (un par ligne)">
        <textarea className={ta} rows={5} value={cur.formatsText} onChange={e => set('formatsText', e.target.value)}
          placeholder={'Bannières in-app\nNotifications sponsorisées\nNewsletter mensuelle'} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Label bouton"><input className={inp} value={cur.ctaLabel} onChange={e => set('ctaLabel', e.target.value)} /></Field>
        <Field label="URL bouton"><input className={inp} value={cur.ctaUrl} onChange={e => set('ctaUrl', e.target.value)} /></Field>
      </div>
      <button onClick={handleSave} disabled={mut.isPending || !cur.title}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
        <Save size={14} /> {mut.isPending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Tab 5 — Data Packs
══════════════════════════════════════════════════════════════════════════ */

interface DataPack { id: string; icon: string; title: string; description: string; price: number; ctaLabel: string; ctaUrl: string; active: boolean; }

const EMPTY_PACK = { icon: '📊', title: '', description: '', price: 25000, ctaLabel: 'Acheter ce rapport', ctaUrl: '/contact/' };

function DataPackForm({ initial, onSave, onCancel }: { initial?: Partial<DataPack>; onSave: (d: any) => void; onCancel: () => void }) {
  const [d, setD] = useState({ ...EMPTY_PACK, ...initial });
  const set = (k: string, v: any) => setD(p => ({ ...p, [k]: v }));
  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Titre"><input className={inp} value={d.title} onChange={e => set('title', e.target.value)} placeholder="Pack Market Trends" /></Field>
        <Field label="Icône"><input className={inp} value={d.icon} onChange={e => set('icon', e.target.value)} placeholder="📈" /></Field>
      </div>
      <Field label="Description"><textarea className={ta} rows={2} value={d.description} onChange={e => set('description', e.target.value)} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Prix (FCFA)"><input type="number" className={inp} value={d.price} onChange={e => set('price', Number(e.target.value))} /></Field>
        <Field label="Label CTA"><input className={inp} value={d.ctaLabel} onChange={e => set('ctaLabel', e.target.value)} /></Field>
        <Field label="URL CTA"><input className={inp} value={d.ctaUrl} onChange={e => set('ctaUrl', e.target.value)} /></Field>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(d)} disabled={!d.title} className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"><Check size={13}/> Valider</button>
        <button onClick={onCancel} className="flex items-center gap-1 px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><X size={13}/> Annuler</button>
      </div>
    </div>
  );
}

function DataPacksTab() {
  const qc = useQueryClient();
  const { data: packs = [] } = useQuery<DataPack[]>({ queryKey: ['prod-data-packs'], queryFn: () => websiteService.listDataPacks() });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const createMut = useMutation({ mutationFn: (d: any) => websiteService.createDataPack(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['prod-data-packs'] }); setAdding(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: any) => websiteService.updateDataPack(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['prod-data-packs'] }); setEditId(null); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => websiteService.deleteDataPack(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['prod-data-packs'] }) });
  const toggleMut = useMutation({ mutationFn: ({ id, active }: any) => websiteService.updateDataPack(id, { active }), onSuccess: () => qc.invalidateQueries({ queryKey: ['prod-data-packs'] }) });

  return (
    <div className="space-y-3 max-w-2xl">
      {!adding && (
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
          <Plus size={15} /> Ajouter un pack
        </button>
      )}
      {adding && <DataPackForm onSave={d => createMut.mutate(d)} onCancel={() => setAdding(false)} />}
      {packs.map(pack => (
        <div key={pack.id} className={`bg-white border rounded-xl p-4 ${!pack.active ? 'opacity-50' : ''}`}>
          {editId === pack.id ? (
            <DataPackForm initial={pack} onSave={d => updateMut.mutate({ id: pack.id, d })} onCancel={() => setEditId(null)} />
          ) : (
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{pack.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{pack.title}</div>
                <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{pack.description}</div>
                <div className="text-sm font-bold text-blue-700 mt-1">{pack.price.toLocaleString('fr-CI')} FCFA</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => toggleMut.mutate({ id: pack.id, active: !pack.active })}
                  className={`px-2 py-1 rounded text-xs font-semibold ${pack.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {pack.active ? 'Actif' : 'Masqué'}
                </button>
                <button onClick={() => setEditId(pack.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit2 size={13}/></button>
                <button onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(pack.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={13}/></button>
              </div>
            </div>
          )}
        </div>
      ))}
      {packs.length === 0 && !adding && <div className="text-center text-gray-400 text-sm py-8 border border-dashed border-gray-200 rounded-xl">Aucun pack. Les valeurs par défaut sont affichées.</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Tab 6 — Upcoming
══════════════════════════════════════════════════════════════════════════ */

interface UpcomingItem { id: string; icon: string; title: string; description: string; active: boolean; }

interface InlineFormProps { init: { icon: string; title: string; description: string }; onSave: (d: any) => void; onCancel: () => void; }

function InlineForm({ init, onSave, onCancel }: InlineFormProps) {
  const [d, setD] = useState(init);
  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-2">
      <div className="grid grid-cols-4 gap-2">
        <Field label="Icône"><input className={inp} value={d.icon} onChange={e => setD((p: any) => ({...p, icon: e.target.value}))} /></Field>
        <div className="col-span-3"><Field label="Titre"><input className={inp} value={d.title} onChange={e => setD((p: any) => ({...p, title: e.target.value}))} /></Field></div>
      </div>
      <Field label="Description"><textarea className={ta} rows={2} value={d.description} onChange={e => setD((p: any) => ({...p, description: e.target.value}))} /></Field>
      <div className="flex gap-2">
        <button onClick={() => onSave(d)} disabled={!d.title} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"><Check size={13}/> OK</button>
        <button onClick={onCancel} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
      </div>
    </div>
  );
}

function UpcomingTab() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery<UpcomingItem[]>({ queryKey: ['prod-upcoming'], queryFn: () => websiteService.listUpcoming() });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const emptyDraft = { icon: '🚀', title: '', description: '' };

  const createMut = useMutation({ mutationFn: (d: any) => websiteService.createUpcoming(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['prod-upcoming'] }); setAdding(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: any) => websiteService.updateUpcoming(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['prod-upcoming'] }); setEditId(null); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => websiteService.deleteUpcoming(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['prod-upcoming'] }) });

  return (
    <div className="space-y-3 max-w-2xl">
      {!adding && (
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
          <Plus size={15} /> Ajouter un élément
        </button>
      )}
      {adding && <InlineForm init={emptyDraft} onSave={d => createMut.mutate(d)} onCancel={() => setAdding(false)} />}
      {items.map(item => (
        <div key={item.id} className={`bg-white border rounded-xl p-4 ${!item.active ? 'opacity-50' : ''}`}>
          {editId === item.id ? (
            <InlineForm init={item} onSave={d => updateMut.mutate({ id: item.id, d })} onCancel={() => setEditId(null)} />
          ) : (
            <div className="flex items-start gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm">{item.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setEditId(item.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit2 size={13}/></button>
                <button onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(item.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={13}/></button>
              </div>
            </div>
          )}
        </div>
      ))}
      {items.length === 0 && !adding && <div className="text-center text-gray-400 text-sm py-8 border border-dashed border-gray-200 rounded-xl">Aucun élément. Les valeurs par défaut sont affichées.</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Root page
══════════════════════════════════════════════════════════════════════════ */

const TABS: { id: Tab; label: string }[] = [
  { id: 'intro',         label: 'Introduction'  },
  { id: 'subscriptions', label: 'Abonnements'   },
  { id: 'boost',         label: 'Boosts'        },
  { id: 'ads',           label: 'Publicités'    },
  { id: 'upcoming',      label: 'À venir'       },
];

export default function ProductsPageAdmin() {
  const [tab, setTab] = useState<Tab>('intro');
  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/website" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Produits — Administration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Contenu de la page /produits</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${tab === t.id ? 'text-blue-600 border-b-2 border-blue-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'intro'         && <IntroTab />}
      {tab === 'subscriptions' && <SubscriptionsTab />}
      {tab === 'boost'         && <BoostTab />}
      {tab === 'ads'           && <AdsTab />}
      {tab === 'upcoming'      && <UpcomingTab />}
    </div>
  );
}
