'use client';
// Contenu des pages du site vitrine : édition des textes, liens, images et chiffres statiques de chaque page.
import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, RotateCcw, Save, ImagePlus, ExternalLink, Info } from 'lucide-react';
import { websiteContentService, ContentBlock } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';

const VITRINE = (process.env.NEXT_PUBLIC_VITRINE_URL ?? 'https://primeo-vitrine-152o.onrender.com').replace(/\/+$/, '');
const PAGE_PATHS: Record<string, string> = {
  home: '/', solutions: '/solutions/', produits: '/produits/', 'a-propos': '/a-propos/', aide: '/aide/', blog: '/blog/',
  carrieres: '/carrieres/', communaute: '/communaute/', contact: '/contact/', 'contact-merci': '/contact/merci.html',
  'devenir-partenaire': '/devenir-partenaire/', engagement: '/engagement/', 'espace-presse': '/espace-presse/',
  professionnels: '/professionnels/', telechargement: '/telechargement/', documentation: '/documentation/',
  'guide-client': '/documentation/guide-client.html', 'guide-hotel': '/documentation/guide-hotel.html',
  'guide-immobilier': '/documentation/guide-immobilier.html', 'guide-residence': '/documentation/guide-residence.html',
  'guide-restaurant': '/documentation/guide-restaurant.html', 'guide-revenus': '/documentation/guide-revenus.html',
};
const TYPE_LABEL: Record<string, string> = { text: 'Texte', html: 'Texte enrichi', link: 'Lien', image: 'Image', number: 'Chiffre' };
const TAG_LABEL: Record<string, string> = {
  h1: 'Titre principal', h2: 'Titre de section', h3: 'Sous-titre', h4: 'Intertitre', h5: 'Intertitre', h6: 'Intertitre',
  p: 'Paragraphe', li: 'Élément de liste', a: 'Lien / bouton', button: 'Bouton', span: 'Texte', div: 'Texte', title: "Titre de l'onglet",
  img: 'Image', td: 'Cellule', th: 'En-tête de colonne', label: 'Libellé', strong: 'Texte', em: 'Texte', small: 'Mention', time: 'Date',
};

const imageUrl = (v: string) => (/^https?:\/\//i.test(v) ? v : `${VITRINE}/${v.replace(/^(\.\.?\/)+/, '').replace(/^\//, '')}`);

function BlockEditor({ block, onSaved }: { block: ContentBlock; onSaved: () => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const current = block.value ?? block.default;
  const [value, setValue] = useState(current);
  const dirty = value !== current;

  const save = useMutation({
    mutationFn: () => websiteContentService.save(block.key, value),
    onSuccess: () => { toast.success('Contenu enregistré — visible sur le site dans quelques secondes'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e?.response?.data?.message ?? "Erreur lors de l'enregistrement"),
  });
  const reset = useMutation({
    mutationFn: () => websiteContentService.reset(block.key),
    onSuccess: () => { setValue(block.default); toast.success('Texte d\'origine rétabli'); onSaved(); },
    onError: () => toast.error('Erreur lors du rétablissement'),
  });
  const upload = useMutation({
    mutationFn: (f: File) => websiteContentService.uploadImage(f),
    onSuccess: (r) => { setValue(r.url); toast.success('Image envoyée — pensez à enregistrer'); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "Envoi de l'image impossible"),
  });

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${block.isModified ? 'border-primary-300 bg-primary-50/30' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="info">{TYPE_LABEL[block.type]}</Badge>
          <span className="text-gray-500">{block.type === 'link' ? 'Adresse du lien' : TAG_LABEL[block.tag] ?? block.tag}</span>
          {block.isModified && <Badge variant="warning">Modifié</Badge>}
        </div>
        <code className="text-[10px] text-gray-400 break-all">{block.key}</code>
      </div>

      {block.type === 'image' ? (
        <div className="flex items-start gap-4 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(value)} alt={block.alt ?? ''} className="h-24 max-w-[200px] object-contain rounded-lg border border-gray-200 bg-gray-50" />
          <div className="flex-1 min-w-[220px] space-y-2">
            <input value={value} onChange={(e) => setValue(e.target.value)} className="input w-full text-xs" placeholder="https://… ou /chemin/image.png" />
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
            <Button size="sm" variant="outline" leftIcon={<ImagePlus size={14} />} loading={upload.isPending} onClick={() => fileRef.current?.click()}>
              Envoyer une nouvelle image
            </Button>
          </div>
        </div>
      ) : block.type === 'text' || block.type === 'html' ? (
        <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={Math.min(8, Math.max(2, Math.ceil(value.length / 90)))}
          className="input w-full text-sm" />
      ) : (
        <input value={value} onChange={(e) => setValue(e.target.value)} className="input w-full text-sm"
          inputMode={block.type === 'number' ? 'numeric' : undefined} />
      )}

      {block.type === 'html' && (
        <p className="text-[11px] text-gray-400 flex items-center gap-1"><Info size={12} />Balises autorisées : &lt;strong&gt;, &lt;em&gt;, &lt;br&gt;, &lt;a href=&quot;…&quot;&gt;, &lt;span&gt;. Les autres sont retirées.</p>
      )}
      {block.type === 'number' && block.suffix && <p className="text-[11px] text-gray-400">Affiché avec le suffixe « {block.suffix} ».</p>}
      {block.isModified && <p className="text-[11px] text-gray-400">Texte d'origine : <span className="italic">{block.default.slice(0, 160)}</span></p>}

      <div className="flex gap-2 justify-end">
        {block.isModified && (
          <Button size="sm" variant="outline" leftIcon={<RotateCcw size={14} />} loading={reset.isPending} onClick={() => reset.mutate()}>Rétablir l'original</Button>
        )}
        <Button size="sm" leftIcon={<Save size={14} />} loading={save.isPending} disabled={!dirty || !value.trim() && block.type !== 'text'} onClick={() => save.mutate()}>Enregistrer</Button>
      </div>
    </div>
  );
}

export default function WebsiteContentPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState('home');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');

  const pages = useQuery({ queryKey: ['content-pages'], queryFn: () => websiteContentService.pages() });
  const blocks = useQuery({ queryKey: ['content-blocks', page, query], queryFn: () => websiteContentService.list(page, query), staleTime: 0 });

  const grouped = useMemo(() => {
    const m = new Map<string, ContentBlock[]>();
    (blocks.data?.data ?? []).forEach((b) => { m.set(b.section, [...(m.get(b.section) ?? []), b]); });
    return Array.from(m.entries());
  }, [blocks.data]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ['content-blocks'] }); qc.invalidateQueries({ queryKey: ['content-pages'] }); };
  const current = pages.data?.data.find((p) => p.page === page);

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contenu des pages</h1>
        <p className="text-sm text-gray-500">Modifiez tous les textes, liens, images et chiffres affichés sur le site vitrine. Les sections dynamiques (articles, offres d'emploi, témoignages, FAQ…) restent gérées dans leurs écrans dédiés.</p>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={page} onChange={(e) => { setPage(e.target.value); setQ(''); setQuery(''); }} className="input sm:w-80">
            {(pages.data?.data ?? []).map((p) => (
              <option key={p.page} value={p.page}>{p.label} — {p.total} blocs{p.modified ? ` (${p.modified} modifiés)` : ''}</option>
            ))}
          </select>
          <form className="flex-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(q); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un texte dans cette page…" className="input flex-1" />
            <Button type="submit" variant="outline" leftIcon={<Search size={14} />}>Chercher</Button>
          </form>
          {PAGE_PATHS[page] && (
            <a href={`${VITRINE}${PAGE_PATHS[page]}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline whitespace-nowrap self-center">
              <ExternalLink size={14} /> Voir la page
            </a>
          )}
        </div>
        {current && <p className="text-xs text-gray-400 mt-2">{current.total} blocs sur cette page · {current.modified} modifié{current.modified > 1 ? 's' : ''}</p>}
      </Card>

      {blocks.isLoading ? <PageSpinner /> : grouped.length === 0 ? (
        <p className="text-center text-gray-400 py-10">Aucun bloc ne correspond à votre recherche.</p>
      ) : grouped.map(([section, items]) => (
        <section key={section} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 pt-2">Section : {section.replace(/-/g, ' ')}</h2>
          {items.map((b) => <BlockEditor key={`${b.key}:${b.value ?? ''}`} block={b} onSaved={refresh} />)}
        </section>
      ))}
    </div>
  );
}
