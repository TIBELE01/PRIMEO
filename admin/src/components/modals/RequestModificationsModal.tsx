'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesService } from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';

interface Props { isOpen: boolean; onClose: () => void; propertyId: string; propertyTitle: string }

export function RequestModificationsModal({ isOpen, onClose, propertyId, propertyTitle }: Props) {
  const [comments, setComments] = useState('');
  const qc = useQueryClient();
  const toast = useToast();

  const request = useMutation({
    mutationFn: () => propertiesService.requestModifications(propertyId, comments),
    onSuccess: () => {
      toast.success('Modifications demandées — annonce repassée en brouillon');
      qc.invalidateQueries({ queryKey: ['property', propertyId] });
      qc.invalidateQueries({ queryKey: ['properties-pending'] });
      setComments('');
      onClose();
    },
    onError: () => toast.error('Erreur lors de la demande de modifications'),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Demander des modifications — ${propertyTitle}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button loading={request.isPending} onClick={() => request.mutate()} disabled={!comments.trim()}>
            Envoyer la demande
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-4">
        L'annonce sera repassée en brouillon. Le propriétaire sera notifié par email avec vos commentaires.
      </p>
      <label className="block text-sm font-medium text-gray-700 mb-1">Commentaires *</label>
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Détaillez les modifications requises…"
        className="input w-full h-28 resize-none"
        maxLength={1000}
      />
      <p className="text-xs text-gray-400 mt-1 text-right">{comments.length}/1000</p>
    </Modal>
  );
}
