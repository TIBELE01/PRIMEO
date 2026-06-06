'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';

interface Props { isOpen: boolean; onClose: () => void; userId: string; userName: string }

const PRESET_REASONS = [
  'Document illisible ou de mauvaise qualité',
  'Document expiré',
  'Document ne correspond pas à l\'identité déclarée',
  'Document requis manquant',
  'Informations légales incomplètes',
];

export function KycRejectModal({ isOpen, onClose, userId, userName }: Props) {
  const [reason, setReason] = useState('');
  const qc = useQueryClient();
  const toast = useToast();

  const reject = useMutation({
    mutationFn: () => usersService.rejectKyc(userId, reason),
    onSuccess: () => {
      toast.success(`KYC de ${userName} rejeté`);
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['kyc-pending'] });
      setReason('');
      onClose();
    },
    onError: () => toast.error('Erreur lors du rejet KYC'),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rejeter le KYC — ${userName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="danger" loading={reject.isPending} onClick={() => reject.mutate()} disabled={!reason.trim()}>
            Rejeter le KYC
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-4">
        Le motif sera communiqué au professionnel par email pour qu'il soumette de nouveaux documents.
      </p>
      <div className="space-y-2 mb-3">
        {PRESET_REASONS.map(r => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
              reason === r ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ou motif personnalisé *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Précisez le motif du rejet…"
          className="input w-full h-20 resize-none"
        />
      </div>
    </Modal>
  );
}
