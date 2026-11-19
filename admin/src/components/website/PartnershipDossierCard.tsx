'use client';
// Gestion du dossier de partenariat (PDF) proposé en téléchargement sur la page « Devenir partenaire ».
import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload, Download, RotateCcw } from 'lucide-react';
import { websiteService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/utils';

export function PartnershipDossierCard() {
  const qc = useQueryClient();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useQuery({ queryKey: ['partnership-dossier'], queryFn: () => websiteService.getPartnershipDossier() });

  const upload = useMutation({
    mutationFn: (file: File) => websiteService.uploadPartnershipDossier(file),
    onSuccess: () => { toast.success('Dossier de partenariat mis à jour'); qc.invalidateQueries({ queryKey: ['partnership-dossier'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? e?.response?.data?.message ?? 'Envoi impossible'),
  });
  const reset = useMutation({
    mutationFn: () => websiteService.resetPartnershipDossier(),
    onSuccess: () => { toast.success('Dossier d’origine rétabli'); qc.invalidateQueries({ queryKey: ['partnership-dossier'] }); },
    onError: () => toast.error('Impossible de rétablir le dossier d’origine'),
  });

  const onFile = (f?: File | null) => {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name)) { toast.error('Sélectionnez un fichier PDF'); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error('Le fichier dépasse 10 Mo'); return; }
    upload.mutate(f);
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600"><FileText size={20} /></span>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Dossier de partenariat (PDF)</h2>
            <p className="text-sm text-gray-500">Téléchargé par les visiteurs de la page « Devenir partenaire ».</p>
            {!isLoading && data && (
              <p className="mt-1 text-xs text-gray-500">
                {data.custom
                  ? <>Version téléversée : <strong>{data.filename}</strong>{data.size ? ` · ${Math.round(data.size / 1024)} Ko` : ''}{data.uploadedAt ? ` · ${formatDateTime(data.uploadedAt)}` : ''}</>
                  : <>Version d’origine du site (primeo-dossier-partenariat.pdf)</>}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={websiteService.partnershipDossierPublicUrl()} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" leftIcon={<Download size={14} />}>Télécharger</Button>
          </a>
          <Button size="sm" leftIcon={<Upload size={14} />} loading={upload.isPending} onClick={() => input.current?.click()}>Remplacer le PDF</Button>
          {data?.custom && (
            <Button variant="outline" size="sm" leftIcon={<RotateCcw size={14} />} loading={reset.isPending}
              onClick={() => { if (window.confirm('Rétablir le dossier d’origine du site ? La version téléversée sera supprimée.')) reset.mutate(); }}>
              Rétablir l’original
            </Button>
          )}
          <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>
    </div>
  );
}
