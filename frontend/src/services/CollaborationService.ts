import type { Invitation, CollaboratorWithUser } from '../types'
import { apiHandler } from './ApiHandler'

/**
 * Service untuk collaboration via API
 * Menggunakan centralized ApiHandler untuk automatic token refresh
 */
export class CollaborationService {
  /**
   * Get pending invitations for current user
   */
  async getPendingInvitations(): Promise<Invitation[]> {
    return apiHandler.get<Invitation[]>('/collaborations/invitations')
  }

  /**
   * Get all invitations for current user
   */
  async getAllInvitations(): Promise<Invitation[]> {
    return apiHandler.get<Invitation[]>('/collaborations/invitations/all')
  }

  /**
   * Invite user to project
   */
  async inviteToProject(projectId: number, email: string, role: 'editor' | 'viewer'): Promise<void> {
    return apiHandler.post<void>('/collaborations/invite', { projectId, email, role })
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(invitationId: number): Promise<void> {
    return apiHandler.post<void>(`/collaborations/${invitationId}/accept`)
  }

  /**
   * Decline invitation
   */
  async declineInvitation(invitationId: number): Promise<void> {
    return apiHandler.post<void>(`/collaborations/${invitationId}/decline`)
  }

  /**
   * Get project collaborators
   */
  async getProjectCollaborators(projectId: number): Promise<CollaboratorWithUser[]> {
    return apiHandler.get<CollaboratorWithUser[]>(`/collaborations/project/${projectId}`)
  }

  /**
   * Remove collaborator from project
   */
  async removeCollaborator(projectId: number, userId: number): Promise<void> {
    return apiHandler.delete<void>(`/collaborations/project/${projectId}/user/${userId}`)
  }

  /**
   * Update collaborator role
   */
  async updateCollaboratorRole(
    projectId: number,
    userId: number,
    role: 'editor' | 'viewer'
  ): Promise<void> {
    return apiHandler.put<void>(`/collaborations/project/${projectId}/user/${userId}`, { role })
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService()
