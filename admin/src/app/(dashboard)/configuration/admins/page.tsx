'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAccountsService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, UserCheck, UserX, Shield } from 'lucide-react';
import type { AdminRole } from '@/types/user';

const ROLES: { value: AdminRole; label: string; desc: string }[] = [
  { value: 'super_admin', label: 'Super Admin', desc: 'Tous les droits, gestion des comptes admin' },
  { value: 'moderateur',  label: 'Modérateur',  desc: 'Comptes, annonces, litiges' },
  { value: 'support',     label: 'Support',      desc: 'Tickets et consultation' },
  { value: 'analyste',    label: 'Analyste',     desc: 'Statistiques uniquement' },
];

const roleBadge: Record<AdminRole, 'danger' | 'warning' | 'info' | 'default'> = {
  super_admin: 'danger',
  moderateur: 'warning',
  support: 'info',
  analyste: 'default',
};

interface CreateAdminForm {
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  password: string;
}

const EMPTY_FORM: CreateAdminForm = { email: '', firstName: '', lastName: '', role: 'support', password: '' };

export default function AdminAccountsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { admin } = useAuthStore();
  const isSuperAdmin = admin?.role === 'super_admin';

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateAdminForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<CreateAdminForm>>({});

  const { data, isLoading } = useQuery<any>({
    queryKey: ['admin-accounts'],
    queryFn: () => adminAccountsService.list(),
  });

  const create = useMutation({
    mutationFn: () => adminAccountsService.create(form),
    onSuccess: () => {
      toast.success(`Compte admin créé pour ${form.firstName} ${form.lastName}`);
      qc.invalidateQueries({ queryKey: ['admin-accounts'] });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error('Erreur lors de la création du compte'),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => adminAccountsService.deactivate(id),
    onSuccess: () => { toast.success('Compte désactivé'); qc.invalidateQueries({ queryKey: ['admin-accounts'] }); },
    onError: () => toast.error('Erreur lors de la désactivation'),
  });

  const reactivate = useMutation({
    mutationFn: (id: string) => adminAccountsService.reactivate(id),
    onSuccess: () => { toast.success('Compte réactivé'); qc.invalidateQueries({ queryKey: ['admin-accounts'] }); },
    onError: () => toast.error('Erreur lors de la réactivation'),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminRole }) => adminAccountsService.update(id, { role }),
    onSuccess: () => { toast.success('Rôle mis à jour'); qc.invalidateQueries({ queryKey: ['admin-accounts'] }); },
    onError: () => toast.error('Erreur lors de la mise à jour du rôle'),
  });

  const validate = () => {
    const errors: Partial<CreateAdminForm> = {};
    if (!form.email.includes('@')) errors.email = 'Email invalide';
    if (!form.firstName.trim()) errors.firstName = 'Requis';
    if (!form.lastName.trim()) errors.lastName = 'Requis';
    if (form.password.length < 8) errors.password = 'Minimum 8 caractères';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = () => { if (validate()) create.mutate(); };

  const accounts = data?.accounts ?? data ?? [];

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Shield size={40} className="text-gray-300" />
            <p className="text-gray-500 text-sm">Accès réservé au Super Admin.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 p-1">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comptes administrateurs</h1>
            <p className="text-sm text-gray-500 mt-0.5">Créés manuellement par le super-administrateur</p>
          </div>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          Créer un admin
        </Button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ROLES.map(r => (
          <Card key={r.value}>
            <div className="flex flex-col gap-1">
              <Badge variant={roleBadge[r.value]}>{r.label}</Badge>
              <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Accounts table */}
      <Card padding={false}>
        <CardHeader className="p-4 border-b border-gray-100">
          <CardTitle>
            Comptes actifs
            {accounts.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">({accounts.length})</span>
            )}
          </CardTitle>
        </CardHeader>

        {isLoading ? <PageSpinner /> : (
          <Table
            columns={[
              {
                key: 'name', header: 'Administrateur', render: (a: any) => (
                  <div>
                    <p className="font-medium text-gray-900">{a.firstName} {a.lastName}</p>
                    <p className="text-xs text-gray-500">{a.email}</p>
                  </div>
                ),
              },
              {
                key: 'role', header: 'Rôle', render: (a: any) => (
                  isSuperAdmin && a.id !== admin?.id ? (
                    <select
                      value={a.role}
                      className="input text-xs py-1 w-36"
                      onChange={(e) => {
                        if (confirm(`Changer le rôle de ${a.firstName} en "${e.target.value}" ?`)) {
                          changeRole.mutate({ id: a.id, role: e.target.value as AdminRole });
                        }
                      }}
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  ) : (
                    <Badge variant={roleBadge[a.role as AdminRole] ?? 'default'}>
                      {ROLES.find(r => r.value === a.role)?.label ?? a.role}
                    </Badge>
                  )
                ),
              },
              {
                key: 'status', header: 'Statut', render: (a: any) => (
                  <Badge variant={a.isActive !== false ? 'success' : 'danger'}>
                    {a.isActive !== false ? 'Actif' : 'Désactivé'}
                  </Badge>
                ),
              },
              {
                key: 'createdAt', header: 'Créé le', render: (a: any) => (
                  <span className="text-xs text-gray-500">{formatDateTime(a.createdAt)}</span>
                ),
              },
              {
                key: 'lastLogin', header: 'Dernière connexion', render: (a: any) => (
                  <span className="text-xs text-gray-500">{a.lastLoginAt ? formatDateTime(a.lastLoginAt) : '—'}</span>
                ),
              },
              {
                key: 'actions', header: '', render: (a: any) => {
                  if (a.id === admin?.id) return <span className="text-xs text-gray-400 italic">Vous</span>;
                  return a.isActive !== false ? (
                    <button
                      onClick={() => { if (confirm(`Désactiver le compte de ${a.firstName} ?`)) deactivate.mutate(a.id); }}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      <UserX size={13} /> Désactiver
                    </button>
                  ) : (
                    <button
                      onClick={() => reactivate.mutate(a.id)}
                      className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium"
                    >
                      <UserCheck size={13} /> Réactiver
                    </button>
                  );
                },
              },
            ]}
            data={Array.isArray(accounts) ? accounts : []}
            keyExtractor={(a: any) => a.id}
            emptyMessage="Aucun compte administrateur trouvé"
          />
        )}
      </Card>

      {/* Create admin modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setForm(EMPTY_FORM); setFormErrors({}); }}
        title="Créer un compte administrateur"
        footer={
          <>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); setFormErrors({}); }}>
              Annuler
            </Button>
            <Button loading={create.isPending} onClick={handleCreate}>
              Créer le compte
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input
                className={`input w-full ${formErrors.firstName ? 'border-red-400' : ''}`}
                value={form.firstName}
                onChange={e => { setForm(f => ({ ...f, firstName: e.target.value })); setFormErrors(fe => ({ ...fe, firstName: undefined })); }}
                placeholder="Jean"
              />
              {formErrors.firstName && <p className="text-xs text-red-500 mt-0.5">{formErrors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                className={`input w-full ${formErrors.lastName ? 'border-red-400' : ''}`}
                value={form.lastName}
                onChange={e => { setForm(f => ({ ...f, lastName: e.target.value })); setFormErrors(fe => ({ ...fe, lastName: undefined })); }}
                placeholder="Dupont"
              />
              {formErrors.lastName && <p className="text-xs text-red-500 mt-0.5">{formErrors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              className={`input w-full ${formErrors.email ? 'border-red-400' : ''}`}
              value={form.email}
              onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFormErrors(fe => ({ ...fe, email: undefined })); }}
              placeholder="admin@primeo.com"
            />
            {formErrors.email && <p className="text-xs text-red-500 mt-0.5">{formErrors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
            <select
              className="input w-full"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as AdminRole }))}
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe temporaire *</label>
            <input
              type="password"
              className={`input w-full ${formErrors.password ? 'border-red-400' : ''}`}
              value={form.password}
              onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setFormErrors(fe => ({ ...fe, password: undefined })); }}
              placeholder="Minimum 8 caractères"
            />
            {formErrors.password && <p className="text-xs text-red-500 mt-0.5">{formErrors.password}</p>}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            L'administrateur devra activer le double facteur (2FA) lors de sa première connexion. Communiquez le mot de passe temporaire par un canal sécurisé.
          </div>
        </div>
      </Modal>
    </div>
  );
}
