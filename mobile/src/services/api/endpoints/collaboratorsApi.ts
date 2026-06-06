// Collaborators API — co-manager management for Premium professionals (§7.11)
import { apiClient } from '../client';

export type CollaboratorRole = 'admin' | 'editor' | 'reader';

export const collaboratorsApi = {
  // Owner: invite a collaborator by email
  invite: (data: { email: string; role: CollaboratorRole }) =>
    apiClient.post('/collaborators/invite', data),

  // Owner: list all co-managers for the current professional
  list: () => apiClient.get('/collaborators/list'),

  // Owner: update a co-manager's role
  updateRole: (guestId: string, role: CollaboratorRole) =>
    apiClient.patch(`/collaborators/${guestId}/role`, { role }),

  // Owner: revoke a co-manager's access
  revoke: (guestId: string) => apiClient.delete(`/collaborators/${guestId}`),

  // Guest: list pending invitations for the current user
  myInvitations: () => apiClient.get('/collaborators/my-invitations'),

  // Guest: accept an invitation by token
  accept: (token: string) => apiClient.post('/collaborators/accept', { token }),
};
