'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesService } from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';

interface Props { isOpen: boolean; onClose: () => void; propertyId: string; propertyTitle: string }

const reasons = [
  'Photos insuffisantes ou de mauvaise qualité',
  'Informations incomplètes',
  'Prix non conforme au marché',
  'Documents légaux manquants',
  'Contenu inapproprié',
  'Autre',
];

export function RejectPropertyModal({ isOpen, onClose, propertyId, propertyTitle }: Props) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');
  const qc = useQueryClient();
  const toast = useToast();

  const reject = useMutation({
    mutationFn: () => propertiesService.rejectProperty(propertyId, reason === 'Autre' ? custom : reason),
    onSuccess: () => {
      toast.success('Propriété rejetée');
      qc.invalidateQueries({ queryKey: ['property', propertyId] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      onClose();
    },
    onError: () => toast.error('Erreur lors du rejet'),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rejeter : ${propertyTitle}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="danger" loading={reject.isPending} onClick={() => reject.mutate()} disabled={!reason || (reason === 'Autre' && !custom.trim())}>
            Rejeter la propriété
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-4">Le propriétaire sera notifié par email avec le motif du rejet.</p>
      <div className="space-y-2 mb-3">
        {reasons.map((r) => (
          <label key={r} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-primary-700" />
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
        />
      )}
    </Modal>
  );
}
