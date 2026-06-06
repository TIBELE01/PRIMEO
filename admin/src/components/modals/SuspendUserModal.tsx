'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';

interface Props { isOpen: boolean; onClose: () => void; userId: string; userName: string }

export function SuspendUserModal({ isOpen, onClose, userId, userName }: Props) {
  const [reason, setReason] = useState('');
  const qc = useQueryClient();
  const toast = useToast();

  const suspend = useMutation({
    mutationFn: () => usersService.suspend(userId, reason),
    onSuccess: () => {
      toast.success(`${userName} a été suspendu`);
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
      setReason('');
      onClose();
    },
    onError: () => toast.error('Erreur lors de la suspension'),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Suspendre ${userName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="danger" loading={suspend.isPending} onClick={() => suspend.mutate()} disabled={!reason.trim()}>
            Suspendre le compte
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-4">
        Le compte sera temporairement désactivé. L'utilisateur pourra être réactivé ultérieurement.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motif de suspension *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Décrivez la raison de la suspension…"
          className="input w-full h-24 resize-none"
          required
        />
      </div>
    </Modal>
  );
}
