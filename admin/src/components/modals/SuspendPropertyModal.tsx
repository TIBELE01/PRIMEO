'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesService } from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';

interface Props { isOpen: boolean; onClose: () => void; propertyId: string; propertyTitle: string }

const REASONS = [
  'Non-conformité aux règles de la plateforme',
  'Signalement de plusieurs utilisateurs',
  'Informations trompeuses ou incorrectes',
  'Photos non conformes',
  'Litige en cours impliquant cette annonce',
  'Vérification complémentaire requise',
  'Autre',
];

export function SuspendPropertyModal({ isOpen, onClose, propertyId, propertyTitle }: Props) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');
  const qc = useQueryClient();
  const toast = useToast();

  const suspend = useMutation({
    mutationFn: () => propertiesService.suspendWithReason(propertyId, reason === 'Autre' ? custom : reason),
    onSuccess: () => {
      toast.success('Annonce suspendue — le propriétaire sera notifié');
      qc.invalidateQueries({ queryKey: ['property', propertyId] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      setReason('');
      setCustom('');
      onClose();
    },
    onError: () => toast.error('Erreur lors de la suspension'),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Suspendre : ${propertyTitle}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            variant="danger"
            loading={suspend.isPending}
            onClick={() => suspend.mutate()}
            disabled={!reason || (reason === 'Autre' && !custom.trim())}
          >
            Suspendre l&apos;annonce
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-4">
        L&apos;annonce sera masquée immédiatement. Le propriétaire sera notifié par email avec le motif de suspension.
      </p>
      <div className="space-y-2 mb-3">
        {REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="suspend-reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="accent-primary-700"
            />
            <span className="text-sm text-gray-700">{r}</span>
          </label>
        ))}
      </div>
      {reason === 'Autre' && (
        <textarea
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Précisez le motif…"
          className="input w-full h-20 resize-none mt-2"
          maxLength={500}
        />
      )}
    </Modal>
  );
}
