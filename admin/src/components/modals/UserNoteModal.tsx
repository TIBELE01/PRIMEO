'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';

interface Props { isOpen: boolean; onClose: () => void; userId: string; currentNote?: string }

export function UserNoteModal({ isOpen, onClose, userId, currentNote }: Props) {
  const [note, setNote] = useState(currentNote ?? '');
  const qc = useQueryClient();
  const toast = useToast();

  useEffect(() => { if (isOpen) setNote(currentNote ?? ''); }, [isOpen, currentNote]);

  const save = useMutation({
    mutationFn: () => usersService.addNote(userId, note),
    onSuccess: () => {
      toast.success('Note interne enregistrée');
      qc.invalidateQueries({ queryKey: ['user', userId] });
      onClose();
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Note interne"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>Enregistrer</Button>
        </>
      }
    >
      <p className="text-sm text-gray-500 mb-3">
        Visible uniquement par les administrateurs. Non partagée avec l'utilisateur.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ajouter une note interne sur cet utilisateur…"
        className="input w-full h-32 resize-none"
        maxLength={1000}
      />
      <p className="text-xs text-gray-400 mt-1 text-right">{note.length}/1000</p>
    </Modal>
  );
}
