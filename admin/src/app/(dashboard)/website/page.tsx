'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Globe, Type, Megaphone, Package, HelpCircle, Star, LayoutList,
  Briefcase, Info, MessageSquare, Rss, LifeBuoy, Handshake, Users,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, CloudUpload, ExternalLink,
} from 'lucide-react';
import { websiteService, analyticsService } from '@/services/api';
import { syncWebsiteDefaults, SyncResult } from '@/services/websiteSync';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// ── Section definitions ───────────────────────────────────────────────────────
const SECTIONS = [
  {
    href: '/website/hero', icon: Type, label: 'Hero',
    desc: "Titre, sous-titre, bouton et image de la section d'en-tête.",
    check: () => websiteService.getHero().then(d => !!(d?.title)),
  },
  {
    href: '/website/mission', icon: Megaphone, label: 'Mission',
    desc: 'Phrase de mission affichée sous le hero.',
    check: () => websiteService.getMission().then(d => !!(d?.text)),
  },
  {
    href: '/website/solutions-preview', icon: Globe, label: 'Solutions (aperçu)',
    desc: "Cartes solutions affichées sur la page d'accueil.",
    check: () => websiteService.listSolutions().then(d => Array.isArray(d) && d.length > 0),
  },
  {
    href: '/website/solutions-blocs', icon: LayoutList, label: 'Nos Solutions',
    desc: 'Blocs accordéon de la page /solutions — 4 profils.',
    check: () => websiteService.listSolutionsBlocs().then(d => Array.isArray(d) && d.length > 0),
  },
  {
    href: '/website/products-page', icon: Package, label: 'Nos Produits',
    desc: 'Abonnements, boosts, publicités et à venir.',
    check: () => websiteService.getProductsPageIntro().then(d => !!(d?.title)),
  },
  {
    href: '/website/products-preview', icon: Package, label: 'Produits phares',
    desc: 'Cartes produits avec image, badge et lien.',
    check: () => websiteService.listProducts().then(d => Array.isArray(d) && d.length > 0),
  },
  {
    href: '/website/why', icon: HelpCircle, label: 'Pourquoi Primeo',
    desc: '4 cartes valeurs (icône, titre, description).',
    check: () => websiteService.listWhy().then(d => Array.isArray(d) && d.length > 0),
  },
  {
    href: '/website/testimonials', icon: Star, label: 'Témoignages',
    desc: 'Carrousel de témoignages clients.',
    check: () => websiteService.listTestimonials().then(d => Array.isArray(d) && d.length > 0),
  },
  {
    href: '/website/about', icon: Info, label: 'À propos',
    desc: "Histoire, mission, valeurs, équipe et partenaires.",
    check: () => websiteService.getAboutHistory().then(d => !!(d?.title || d?.content)),
  },
  {
    href: '/website/careers', icon: Briefcase, label: 'Carrières',
    desc: "Offres d'emploi, valeurs, avantages et candidatures spontanées.",
    check: () => websiteService.listCareersJobs().then(d => Array.isArray(d) && d.length > 0).catch(() => false),
  },
  {
    href: '/website/faq', icon: LifeBuoy, label: "Centre d'aide",
    desc: "FAQ organisée par catégories.",
    check: () => websiteService.listFaq().then(d => Array.isArray(d) && d.length > 0),
  },
  {
    href: '/website/messages', icon: MessageSquare, label: 'Messages Contact',
    desc: "Messages du formulaire — consultation et réponse.",
    check: () => websiteService.listContactMessages(1, 1, 'all').then(() => true).catch(() => false),
  },
  {
    href: '/website/blog', icon: Rss, label: 'Blog',
    desc: "Articles, catégories, newsletter et commentaires.",
    check: () => websiteService.listBlogPosts(1, 1).then(() => true).catch(() => false),
  },
  {
    href: '/website/partnerships', icon: Handshake, label: 'Partenariats',
    desc: "Demandes de partenariat — consultation et gestion.",
    check: () => websiteService.listPartnerships(1, 1).then(() => true).catch(() => false),
  },
  {
    href: '/website/community', icon: Users, label: 'Communauté',
    desc: "Publications, commentaires, signalements et challenges.",
    check: () => websiteService.listCommunityPosts(1, 1).then(() => true).catch(() => false),
  },
] as const;

type SectionStatus = 'loading' | 'ok' | 'empty' | 'error';

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: SectionStatus }) {
  if (status === 'loading') return <Loader2 size={14} className="animate-spin text-gray-400" />;
  if (status === 'ok')      return <CheckCircle2 size={14} className="text-green-500" />;
  if (status === 'empty')   return <AlertCircle size={14} className="text-amber-500" />;
  return <AlertCircle size={14} className="text-red-500" />;
}

// ── Connection health ─────────────────────────────────────────────────────────
function ConnectionBadge({ ok, loading }: { ok: boolean | null; loading: boolean }) {
  if (loading) return <Badge variant="default"><Loader2 size={11} className="animate-spin inline mr-1" />Vérification…</Badge>;
  if (ok === true) return <Badge variant="success">API connectée</Badge>;
  return <Badge variant="danger">API hors ligne</Badge>;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WebsitePage() {
  const [statuses, setStatuses] = useState<Record<string, SectionStatus>>({});
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<SyncResult[]>([]);
  const [showSyncLog, setShowSyncLog] = useState(false);

  // Check API connection
  useEffect(() => {
    analyticsService.getDashboardStats()
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false))
      .finally(() => setApiLoading(false));
  }, []);

  // Load per-section statuses
  const loadStatuses = useCallback(() => {
    setStatuses(Object.fromEntries(SECTIONS.map(s => [s.href, 'loading'])));
    SECTIONS.forEach(s => {
      s.check()
        .then(hasData => setStatuses(prev => ({ ...prev, [s.href]: hasData ? 'ok' : 'empty' })))
        .catch(() => setStatuses(prev => ({ ...prev, [s.href]: 'error' })));
    });
  }, []);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  const emptyCount  = Object.values(statuses).filter(v => v === 'empty').length;
  const okCount     = Object.values(statuses).filter(v => v === 'ok').length;
  const loadingCount = Object.values(statuses).filter(v => v === 'loading').length;

  // Bulk sync
  const handleSync = async () => {
    setSyncing(true);
    setSyncLog([]);
    setShowSyncLog(true);
    await syncWebsiteDefaults(result => setSyncLog(prev => [...prev, result]));
    setSyncing(false);
    loadStatuses();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site vitrine</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gérez tout le contenu du site public <span className="font-medium text-gray-700">primeo.ci</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ConnectionBadge ok={apiOk} loading={apiLoading} />
          <Button variant="ghost" size="sm" onClick={loadStatuses} disabled={loadingCount > 0}>
            <RefreshCw size={14} className={loadingCount > 0 ? 'animate-spin' : ''} />
          </Button>
          <a
            href="https://primeo.ci" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            <ExternalLink size={14} /> Voir le site
          </a>
        </div>
      </div>

      {/* Stats bar */}
      {loadingCount === 0 && (
        <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl text-sm">
          <div className="flex items-center gap-1.5 text-green-700">
            <CheckCircle2 size={15} />
            <span className="font-medium">{okCount}</span> section{okCount !== 1 ? 's' : ''} synchronisée{okCount !== 1 ? 's' : ''}
          </div>
          <div className="h-4 w-px bg-gray-200" />
          {emptyCount > 0 ? (
            <div className="flex items-center gap-1.5 text-amber-700">
              <AlertCircle size={15} />
              <span className="font-medium">{emptyCount}</span> section{emptyCount !== 1 ? 's' : ''} vide{emptyCount !== 1 ? 's' : ''} — données non encore importées
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">Toutes les sections sont renseignées</div>
          )}
          {emptyCount > 0 && (
            <>
              <div className="h-4 w-px bg-gray-200" />
              <Button size="sm" leftIcon={<CloudUpload size={14} />} onClick={handleSync} loading={syncing}>
                Initialiser depuis le site ({emptyCount})
              </Button>
            </>
          )}
        </div>
      )}

      {/* Sync log */}
      {showSyncLog && syncLog.length > 0 && (
        <div className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
          {syncLog.map((r, i) => (
            <div key={i} className={
              r.status === 'seeded' ? 'text-green-400' :
              r.status === 'ok'     ? 'text-gray-400 dark:text-gray-500' : 'text-red-400'
            }>
              {r.status === 'seeded' ? '✓' : r.status === 'ok' ? '·' : '✗'} {r.section}{r.status === 'seeded' ? ' — importé' : r.status === 'error' ? ` — ${r.detail}` : ''}
            </div>
          ))}
          {syncing && <div className="text-yellow-400 animate-pulse">Synchronisation en cours…</div>}
          {!syncing && (
            <div className="text-gray-500 pt-1 border-t border-gray-700 mt-2">
              {syncLog.filter(r => r.status === 'seeded').length} section(s) importée(s) · {syncLog.filter(r => r.status === 'error').length} erreur(s)
            </div>
          )}
        </div>
      )}

      {/* Sections grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(({ href, icon: Icon, label, desc }) => {
          const status = statuses[href] ?? 'loading';
          return (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col gap-3 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Icon size={20} className="text-blue-600" />
                </div>
                <StatusBadge status={status} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{label}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>
              </div>
              {status === 'empty' && (
                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                  Vide — cliquez pour ajouter du contenu
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Help note */}
      <p className="text-xs text-gray-400 pb-2">
        Les modifications apportées ici sont immédiatement répercutées sur le site public via l'API.
        Une icône <span className="inline-flex items-center gap-0.5 text-amber-500"><AlertCircle size={11} /></span> indique une section sans données en base.
      </p>
    </div>
  );
}
