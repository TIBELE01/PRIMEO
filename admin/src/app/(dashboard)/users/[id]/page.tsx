'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService, propertiesService, bookingsService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatDateTime, formatAmount, initials, cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { BanUserModal } from '@/components/modals/BanUserModal';
import { SuspendUserModal } from '@/components/modals/SuspendUserModal';
import { UserNoteModal } from '@/components/modals/UserNoteModal';
import { KycRejectModal } from '@/components/modals/KycRejectModal';
import { useAuthStore } from '@/stores/authStore';
import type { AdminRole, UserStatus, KycDocument } from '@/types/user';
import {
  ArrowLeft, UserX, UserCheck, Shield, Key, StickyNote,
  FileCheck, FileX, ShieldOff, ExternalLink, CreditCard,
} from 'lucide-react';

// ─── Role-based permission helpers ────────────────────────────────────────────

function can(role: AdminRole | undefined, minRole: AdminRole): boolean {
  const order: AdminRole[] = ['analyste', 'support', 'moderateur', 'super_admin'];
  if (!role) return false;
  return order.indexOf(role) >= order.indexOf(minRole);
}

// ─── Status helpers ────────────────────────────────────────────────────────────

const statusBadgeVariant: Record<UserStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success', pending_kyc: 'warning', pending_email: 'warning', banned: 'danger', suspended: 'danger',
};
const statusLabel: Record<UserStatus, string> = {
  active: 'Actif', pending_kyc: 'KYC en attente', pending_email: 'Email en attente', banned: 'Banni', suspended: 'Suspendu',
};
const roleLabel: Record<string, string> = {
  client: 'Client', professional_hebergement: 'Hébergement Pro',
  professional_immobilier: 'Immobilier Pro', restaurateur: 'Restaurateur', admin: 'Admin',
};
const kycDocTypes: Record<string, string> = {
  identity: "Pièce d'identité", rccm: 'RCCM', tax_number: 'Numéro fiscal',
  operating_license: "Autorisation d'exercice",
};

type Tab = 'info' | 'properties' | 'bookings' | 'transactions' | 'logs';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { admin } = useAuthStore();
  const role = admin?.role as AdminRole | undefined;

  const [tab, setTab] = useState<Tab>('info');
  const [banOpen, setBanOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [kycRejectOpen, setKycRejectOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: user, isLoading } = useQuery<any>({
    queryKey: ['user', id],
    queryFn: () => usersService.getUserById(id),
  });

  const { data: propertiesData } = useQuery<any>({
    queryKey: ['user-properties', id],
    queryFn: () => propertiesService.list({ userId: id, limit: 50 }),
    enabled: tab === 'properties',
  });

  const { data: bookingsData } = useQuery<any>({
    queryKey: ['user-bookings', id],
    queryFn: () => bookingsService.list({ userId: id, limit: 50 }),
    enabled: tab === 'bookings',
  });

  const { data: transactionsData } = useQuery<any>({
    queryKey: ['user-transactions', id],
    queryFn: () => usersService.getTransactions(id),
    enabled: tab === 'transactions',
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const reactivate = useMutation({
    mutationFn: () => usersService.reactivate(id),
    onSuccess: () => { toast.success('Compte réactivé'); qc.invalidateQueries({ queryKey: ['user', id] }); },
    onError: () => toast.error('Erreur lors de la réactivation'),
  });

  const forceReset = useMutation({
    mutationFn: () => usersService.forcePasswordReset(id),
    onSuccess: () => toast.success('Email de réinitialisation envoyé'),
    onError: () => toast.error('Erreur lors de l\'envoi'),
  });

  const approveKyc = useMutation({
    mutationFn: () => usersService.approveKyc(id),
    onSuccess: () => { toast.success('KYC approuvé'); qc.invalidateQueries({ queryKey: ['user', id] }); },
    onError: () => toast.error('Erreur lors de la validation KYC'),
  });

  const revoke2fa = useMutation({
    mutationFn: () => usersService.revoke2fa(id),
    onSuccess: () => { toast.success('2FA révoqué'); qc.invalidateQueries({ queryKey: ['user', id] }); },
    onError: () => toast.error('Erreur lors de la révocation du 2FA'),
  });

  const changePlan = useMutation({
    mutationFn: (plan: string) => usersService.changeUserPlan(id, plan),
    onSuccess: () => {
      toast.success('Formule mise à jour');
      setSelectedPlan('');
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['sub-history', id] });
    },
    onError: () => toast.error('Erreur lors du changement de formule'),
  });

  const recalculate = useMutation({
    mutationFn: () => usersService.forceRecalculateBenefits(id),
    onSuccess: (res: any) => {
      const data = res?.data ?? res;
      const suspended = data?.suspendedProperties?.length ?? 0;
      toast.success(`Avantages recalculés${suspended > 0 ? ` — ${suspended} annonce(s) suspendues` : ''}`);
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['sub-history', id] });
    },
    onError: () => toast.error('Erreur lors du recalcul'),
  });

  const { data: subHistory } = useQuery<any>({
    queryKey: ['sub-history', id],
    queryFn: () => usersService.getSubscriptionHistory(id),
    enabled: !!user?.subscription,
  });

  if (isLoading) return <PageSpinner />;
  if (!user) return <p className="text-gray-500 p-6">Utilisateur introuvable.</p>;

  const userName = `${user.firstName} ${user.lastName}`;
  const status: UserStatus = user.status;
  const kycVerified: boolean = user.kycVerified;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'info',         label: 'Profil' },
    { id: 'properties',   label: `Propriétés${user.propertiesCount ? ` (${user.propertiesCount})` : ''}` },
    { id: 'bookings',     label: `Réservations${user.bookingsCount ? ` (${user.bookingsCount})` : ''}` },
    { id: 'transactions', label: 'Transactions' },
    { id: 'logs',         label: 'Logs connexion' },
  ];

  const properties   = propertiesData?.properties ?? propertiesData ?? [];
  const bookings     = bookingsData?.bookings   ?? bookingsData   ?? [];
  const transactions = transactionsData?.transactions ?? transactionsData ?? [];
  const loginLogs    = user.loginLogs ?? [];

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
          {initials(userName)}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{userName}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <Badge variant={statusBadgeVariant[status]}>{statusLabel[status]}</Badge>
        {kycVerified && <Badge variant="success">KYC vérifié</Badge>}
        {user.twoFactorEnabled && <Badge variant="info">2FA actif</Badge>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-0">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                    tab === t.id
                      ? 'border-primary-700 text-primary-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Profil tab ── */}
          {tab === 'info' && (
            <Card>
              <CardHeader><CardTitle>Informations personnelles</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <FieldRow label="Email" value={user.email} />
                  <FieldRow label="Téléphone" value={user.phone ?? '—'} />
                  <FieldRow label="Rôle" value={roleLabel[user.role] ?? user.role} />
                  <FieldRow label="Statut" value={statusLabel[status]} />
                  <FieldRow label="KYC" value={kycVerified ? 'Vérifié' : 'Non vérifié'} />
                  <FieldRow label="2FA" value={user.twoFactorEnabled ? 'Activé' : 'Désactivé'} />
                  <FieldRow label="Inscription" value={formatDate(user.createdAt)} />
                  <FieldRow label="Dernière connexion" value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'} />
                  <FieldRow label="Code parrainage" value={user.referralCode ?? '—'} />
                  {typeof user.walletBalance === 'number' && (
                    <FieldRow label="Portefeuille" value={formatAmount(user.walletBalance)} />
                  )}
                </dl>

                {/* KYC Documents */}
                {can(role, 'support') && user.kycDocuments?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Documents KYC</h4>
                    <div className="space-y-2">
                      {(user.kycDocuments as KycDocument[]).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{kycDocTypes[doc.type] ?? doc.type}</p>
                            <p className="text-xs text-gray-500">Soumis le {formatDate(doc.uploadedAt)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warning'}>
                              {doc.status === 'approved' ? 'Approuvé' : doc.status === 'rejected' ? 'Rejeté' : 'En attente'}
                            </Badge>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-primary-700 hover:bg-primary-50 rounded"
                              title="Ouvrir le document"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Internal note */}
                {user.internalNote && (
                  <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Note interne</p>
                    <p className="text-sm text-amber-900">{user.internalNote}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Propriétés tab ── */}
          {tab === 'properties' && (
            <Card padding={false}>
              <CardHeader className="p-4 border-b border-gray-100">
                <CardTitle>Propriétés ({Array.isArray(properties) ? properties.length : 0})</CardTitle>
              </CardHeader>
              <Table
                columns={[
                  { key: 'title', header: 'Titre', render: (p: any) => <span className="font-medium">{p.title}</span> },
                  { key: 'type', header: 'Type', render: (p: any) => <Badge variant="info">{p.type}</Badge> },
                  { key: 'status', header: 'Statut', render: (p: any) => <Badge variant={p.status === 'active' ? 'success' : 'warning'}>{p.status}</Badge> },
                  { key: 'city', header: 'Ville', render: (p: any) => p.city ?? '—' },
                  { key: 'actions', header: '', render: (p: any) => (
                    <button onClick={() => router.push(`/properties/${p.id}`)} className="text-primary-600 hover:underline text-xs">
                      Voir
                    </button>
                  )},
                ]}
                data={Array.isArray(properties) ? properties : []}
                keyExtractor={(p: any) => p.id}
                emptyMessage="Aucune propriété"
              />
            </Card>
          )}

          {/* ── Réservations tab ── */}
          {tab === 'bookings' && (
            <Card padding={false}>
              <CardHeader className="p-4 border-b border-gray-100">
                <CardTitle>Réservations ({Array.isArray(bookings) ? bookings.length : 0})</CardTitle>
              </CardHeader>
              <Table
                columns={[
                  { key: 'id', header: 'ID', render: (b: any) => <span className="font-mono text-xs text-gray-500">{b.id.slice(0, 8)}…</span> },
                  { key: 'property', header: 'Propriété', render: (b: any) => b.property?.name ?? b.propertyTitle ?? '—' },
                  { key: 'status', header: 'Statut', render: (b: any) => <Badge variant={b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'warning'}>{b.status}</Badge> },
                  { key: 'amount', header: 'Montant', render: (b: any) => formatAmount(b.totalAmount ?? 0) },
                  { key: 'date', header: 'Date', render: (b: any) => formatDate(b.createdAt) },
                  { key: 'actions', header: '', render: (b: any) => (
                    <button onClick={() => router.push(`/bookings/${b.id}`)} className="text-primary-600 hover:underline text-xs">
                      Voir
                    </button>
                  )},
                ]}
                data={Array.isArray(bookings) ? bookings : []}
                keyExtractor={(b: any) => b.id}
                emptyMessage="Aucune réservation"
              />
            </Card>
          )}

          {/* ── Transactions tab ── */}
          {tab === 'transactions' && (
            <Card padding={false}>
              <CardHeader className="p-4 border-b border-gray-100">
                <CardTitle>Transactions ({Array.isArray(transactions) ? transactions.length : 0})</CardTitle>
              </CardHeader>
              <Table
                columns={[
                  { key: 'date', header: 'Date', render: (t: any) => formatDateTime(t.createdAt) },
                  { key: 'type', header: 'Type', render: (t: any) => <Badge variant="info">{t.type ?? '—'}</Badge> },
                  { key: 'amount', header: 'Montant', render: (t: any) => (
                    <span className={t.amount < 0 ? 'text-red-600 font-medium' : 'text-green-700 font-medium'}>
                      {formatAmount(t.amount ?? 0)}
                    </span>
                  )},
                  { key: 'status', header: 'Statut', render: (t: any) => (
                    <Badge variant={t.status === 'completed' ? 'success' : t.status === 'failed' ? 'danger' : 'warning'}>
                      {t.status ?? '—'}
                    </Badge>
                  )},
                  { key: 'ref', header: 'Référence', render: (t: any) => (
                    <span className="font-mono text-xs text-gray-500">{t.reference ?? t.id?.slice(0, 8) ?? '—'}</span>
                  )},
                ]}
                data={Array.isArray(transactions) ? transactions : []}
                keyExtractor={(t: any) => t.id}
                emptyMessage="Aucune transaction"
              />
            </Card>
          )}

          {/* ── Logs tab ── */}
          {tab === 'logs' && (
            <Card padding={false}>
              <CardHeader className="p-4 border-b border-gray-100">
                <CardTitle>Logs de connexion ({loginLogs.length})</CardTitle>
              </CardHeader>
              <Table
                columns={[
                  { key: 'date', header: 'Date', render: (l: any) => formatDateTime(l.createdAt) },
                  { key: 'ip', header: 'IP', render: (l: any) => <span className="font-mono text-xs">{l.ip ?? '—'}</span> },
                  { key: 'success', header: 'Résultat', render: (l: any) => (
                    <Badge variant={l.success ? 'success' : 'danger'}>{l.success ? 'Succès' : 'Échec'}</Badge>
                  )},
                  { key: 'ua', header: 'Navigateur', render: (l: any) => (
                    <span className="text-xs text-gray-500 max-w-48 truncate block" title={l.userAgent}>{l.userAgent ?? '—'}</span>
                  )},
                ]}
                data={loginLogs}
                keyExtractor={(l: any) => l.id}
                emptyMessage="Aucun log disponible"
              />
            </Card>
          )}
        </div>

        {/* Actions panel */}
        <div className="space-y-4">
          {/* Account actions */}
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Suspend / Reactivate */}
                {can(role, 'moderateur') && status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    leftIcon={<UserX size={15} />}
                    onClick={() => setSuspendOpen(true)}
                  >
                    Suspendre le compte
                  </Button>
                )}
                {can(role, 'moderateur') && status === 'suspended' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    leftIcon={<UserCheck size={15} />}
                    loading={reactivate.isPending}
                    onClick={() => reactivate.mutate()}
                  >
                    Réactiver le compte
                  </Button>
                )}

                {/* Ban */}
                {can(role, 'super_admin') && status !== 'banned' && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full justify-start"
                    leftIcon={<Shield size={15} />}
                    onClick={() => setBanOpen(true)}
                  >
                    Bannir définitivement
                  </Button>
                )}

                {/* Force password reset */}
                {can(role, 'moderateur') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    leftIcon={<Key size={15} />}
                    loading={forceReset.isPending}
                    onClick={() => forceReset.mutate()}
                  >
                    Forcer réinitialisation MDP
                  </Button>
                )}

                {/* Internal note */}
                {can(role, 'support') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    leftIcon={<StickyNote size={15} />}
                    onClick={() => setNoteOpen(true)}
                  >
                    {user.internalNote ? 'Modifier la note' : 'Ajouter une note'}
                  </Button>
                )}

                {/* Revoke 2FA */}
                {can(role, 'super_admin') && user.twoFactorEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-orange-600 hover:bg-orange-50"
                    leftIcon={<ShieldOff size={15} />}
                    loading={revoke2fa.isPending}
                    onClick={() => {
                      if (confirm('Révoquer le 2FA de cet utilisateur ?')) {
                        revoke2fa.mutate();
                      }
                    }}
                  >
                    Révoquer le 2FA
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KYC actions */}
          {can(role, 'moderateur') && !kycVerified && (
            <Card>
              <CardHeader><CardTitle>Validation KYC</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    size="sm"
                    className="w-full justify-start"
                    leftIcon={<FileCheck size={15} />}
                    loading={approveKyc.isPending}
                    onClick={() => approveKyc.mutate()}
                  >
                    Approuver le KYC
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    leftIcon={<FileX size={15} />}
                    onClick={() => setKycRejectOpen(true)}
                  >
                    Rejeter avec motif
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Abonnement (professionnels uniquement) */}
          {user.subscription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard size={16} />
                  Abonnement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Formule</dt>
                    <dd className="font-semibold capitalize">{user.subscription.planType ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Statut</dt>
                    <dd>
                      <Badge variant={user.subscription.status === 'active' ? 'success' : 'warning'}>
                        {user.subscription.status ?? '—'}
                      </Badge>
                    </dd>
                  </div>
                  {user.subscription.monthlyPrice > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Mensualité</dt>
                      <dd className="font-semibold">{formatAmount(user.subscription.monthlyPrice)}</dd>
                    </div>
                  )}
                  {user.subscription.nextBillingDate && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Prochain renouvellement</dt>
                      <dd className="font-semibold">{formatDate(user.subscription.nextBillingDate)}</dd>
                    </div>
                  )}
                  {typeof user.subscription.includedPropertiesLimit === 'number' && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Limite annonces</dt>
                      <dd className="font-semibold">
                        {user.subscription.includedPropertiesLimit >= 9999 ? '∞' : user.subscription.includedPropertiesLimit}
                      </dd>
                    </div>
                  )}
                </dl>

                {can(role, 'moderateur') && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mb-3"
                      loading={recalculate.isPending}
                      onClick={() => {
                        if (confirm('Forcer le recalcul des avantages ? (Les annonces excédentaires seront suspendues.)')) {
                          recalculate.mutate();
                        }
                      }}
                    >
                      ⟳ Forcer le recalcul des avantages
                    </Button>
                  </div>
                )}

                {can(role, 'super_admin') && (
                  <div className="mt-1 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Changer la formule</p>
                    <select
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="input w-full text-sm mb-2"
                    >
                      <option value="">Sélectionner…</option>
                      <option value="starter">Starter (Gratuit)</option>
                      <option value="business">Business (9 000 FCFA/mois)</option>
                      <option value="entreprise">Entreprise (24 000 FCFA/mois)</option>
                    </select>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!selectedPlan || selectedPlan === user.subscription.planType}
                      loading={changePlan.isPending}
                      onClick={() => {
                        if (selectedPlan && confirm(`Changer la formule vers ${selectedPlan} ?`)) {
                          changePlan.mutate(selectedPlan);
                        }
                      }}
                    >
                      Appliquer
                    </Button>
                  </div>
                )}

                {/* Historique des changements de formule */}
                {subHistory?.transactions?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Historique paiements</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {subHistory.transactions.slice(0, 10).map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between text-xs">
                          <span className={tx.status === 'success' ? 'text-green-700' : tx.status === 'failed' ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}>
                            {tx.status === 'success' ? '✓' : tx.status === 'failed' ? '✗' : '○'} {tx.notes?.slice(0, 30) ?? '—'}
                          </span>
                          <span className="text-gray-400 shrink-0 ml-2">
                            {tx.initiatedAt ? new Date(tx.initiatedAt).toLocaleDateString('fr-FR') : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {subHistory?.auditLogs?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Historique admin</p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {subHistory.auditLogs.slice(0, 5).map((log: any) => (
                        <div key={log.id} className="text-xs">
                          <span className="text-gray-700 dark:text-gray-300">{log.description?.slice(0, 60) ?? log.action}</span>
                          <span className="block text-gray-400">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString('fr-FR') : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick stats */}
          <Card>
            <CardHeader><CardTitle>Statistiques</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Propriétés</dt>
                  <dd className="font-semibold">{user.propertiesCount ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Réservations</dt>
                  <dd className="font-semibold">{user.bookingsCount ?? 0}</dd>
                </div>
                {typeof user.totalRevenue === 'number' && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Revenus générés</dt>
                    <dd className="font-semibold">{formatAmount(user.totalRevenue)}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <BanUserModal    isOpen={banOpen}     onClose={() => setBanOpen(false)}     userId={id} userName={userName} />
      <SuspendUserModal isOpen={suspendOpen} onClose={() => setSuspendOpen(false)} userId={id} userName={userName} />
      <UserNoteModal   isOpen={noteOpen}    onClose={() => setNoteOpen(false)}    userId={id} currentNote={user.internalNote} />
      <KycRejectModal  isOpen={kycRejectOpen} onClose={() => setKycRejectOpen(false)} userId={id} userName={userName} />
    </div>
  );
}

// ─── Sub-component ─────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="font-medium text-gray-900 text-right">{value}</dd>
    </div>
  );
}
