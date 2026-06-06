'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { featureFlagsService } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

interface FlagFormState {
  key: string;
  enabled: boolean;
  description: string;
}

const DEFAULT_FORM: FlagFormState = { key: '', enabled: false, description: '' };

export default function FeatureFlagsPage() {
  const toast = useToast();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FlagFormState>(DEFAULT_FORM);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: flags = [], isLoading } = useQuery<FeatureFlag[]>({
    queryKey: ['feature-flags'],
    queryFn: () => featureFlagsService.getAll(),
  });

  const upsertMutation = useMutation({
    mutationFn: ({ key, enabled, description }: FlagFormState) =>
      featureFlagsService.upsert(key, enabled, description || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success(editingKey ? 'Flag mis à jour' : 'Flag créé');
      setShowForm(false);
      setEditingKey(null);
      setForm(DEFAULT_FORM);
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled, description }: { key: string; enabled: boolean; description: string | null }) =>
      featureFlagsService.upsert(key, enabled, description ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature-flags'] }),
    onError: () => toast.error('Erreur lors du changement de statut'),
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => featureFlagsService.delete(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success('Flag supprimé');
      setConfirmDelete(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const openEdit = (flag: FeatureFlag) => {
    setEditingKey(flag.key);
    setForm({ key: flag.key, enabled: flag.enabled, description: flag.description ?? '' });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingKey(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingKey(null);
    setForm(DEFAULT_FORM);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Activez ou désactivez des fonctionnalités en temps réel sans redéploiement
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>
          Nouveau flag
        </Button>
      </div>

      {showForm && (
        <Card>
          <h2 className="text-base font-semibold mb-4">
            {editingKey ? `Modifier "${editingKey}"` : 'Créer un flag'}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="label">Clé <span className="text-red-500">*</span></label>
              <input
                className="input"
                placeholder="ex: new_3d_viewer"
                value={form.key}
                disabled={!!editingKey}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              />
            </div>
            <div>
              <label className="label">Description</label>
              <input
                className="input"
                placeholder="Brève description de la fonctionnalité…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="label mb-0">Activé par défaut</label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
                className="text-2xl"
              >
                {form.enabled
                  ? <ToggleRight size={28} className="text-green-500" />
                  : <ToggleLeft size={28} className="text-gray-400" />}
              </button>
              <span className="text-sm text-gray-500">{form.enabled ? 'Activé' : 'Désactivé'}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              loading={upsertMutation.isPending}
              disabled={!form.key.trim()}
              onClick={() => upsertMutation.mutate(form)}
            >
              {editingKey ? 'Enregistrer' : 'Créer'}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelForm}>Annuler</Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <PageSpinner />
      ) : (
        <Card padding={false}>
          {flags.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Aucun feature flag configuré</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left p-4">Clé</th>
                  <th className="text-left p-4">Description</th>
                  <th className="text-left p-4">Statut</th>
                  <th className="text-left p-4">Modifié le</th>
                  <th className="text-left p-4">Par</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => (
                  <tr key={flag.key} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-mono font-semibold text-gray-800">{flag.key}</td>
                    <td className="p-4 text-gray-500 max-w-xs truncate">{flag.description ?? <span className="italic text-gray-300">—</span>}</td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleMutation.mutate({ key: flag.key, enabled: !flag.enabled, description: flag.description })}
                        disabled={toggleMutation.isPending}
                        className="flex items-center gap-1.5 group"
                        title={flag.enabled ? 'Cliquer pour désactiver' : 'Cliquer pour activer'}
                      >
                        {flag.enabled
                          ? <ToggleRight size={22} className="text-green-500 group-hover:text-green-600" />
                          : <ToggleLeft size={22} className="text-gray-300 group-hover:text-gray-500" />}
                        <Badge variant={flag.enabled ? 'success' : 'default'}>
                          {flag.enabled ? 'Activé' : 'Désactivé'}
                        </Badge>
                      </button>
                    </td>
                    <td className="p-4 text-xs text-gray-400 whitespace-nowrap">
                      {formatDateTime(flag.updatedAt)}
                    </td>
                    <td className="p-4 text-xs text-gray-400 font-mono truncate max-w-[120px]">
                      {flag.updatedBy ?? <span className="italic">—</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(flag)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        {confirmDelete === flag.key ? (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="danger" loading={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(flag.key)}>
                              Confirmer
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(flag.key)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
