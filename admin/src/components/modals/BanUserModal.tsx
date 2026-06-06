'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';

interface Props { isOpen: boolean; onClose: () => void; userId: string; userName: string }

export function BanUserModal({ isOpen, onClose, userId, userName }: Props) {
  const [reason, setReason] = useState('');
  const qc = useQueryClient();
  const toast = useToast();

  const ban = useMutation({
    mutationFn: () => usersService.banUser(userId, reason),
    onSuccess: () => {
      toast.success(`${userName} a été banni`);
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: () => toast.error('Erreur lors du bannissement'),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bannir ${userName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="danger" loading={ban.isPending} onClick={() => ban.mutate()} disabled={!reason.trim()}>
            Confirmer le bannissement
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-4">
        Cette action est irréversible. L'utilisateur perdra l'accès à la plateforme.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motif du bannissement *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Décrivez la raison du bannissement…"
          className="input w-full h-24 resize-none"
          required
        />
      </div>
    </Modal>
  );
}
