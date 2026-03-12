import type { Invitation, CollaboratorWithUser, ApiResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL : '/api'
import { authService } from './AuthService'

/**
 * Service untuk collaboration via API
 */
export class CollaborationService {
  private baseUrl: string

  constructor() {
    this.baseUrl = `${API_BASE_URL}/collaborations`
  }

  /**
   * Get pending invitations for current user
   */
  async getPendingInvitations(): Promise<Invitation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/invitations`, {
        headers: authService.getAuthHeaders()
      })

      const result: ApiResponse<Invitation[]> = await response.json()

      if (result.success && result.data) {
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch invitations')
    } catch (error) {
      console.error('Error fetching invitations:', error)
      throw error
    }
  }

  /**
   * Get all invitations for current user
   */
  async getAllInvitations(): Promise<Invitation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/invitations/all`, {
        headers: authService.getAuthHeaders()
      })

      const result: ApiResponse<Invitation[]> = await response.json()

      if (result.success && result.data) {
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch invitations')
    } catch (error) {
      console.error('Error fetching invitations:', error)
      throw error
    }
  }

  /**
   * Invite user to project
   */
  async inviteToProject(projectId: number, email: string, role: 'editor' | 'viewer'): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        body: JSON.stringify({ projectId, email, role })
      })

      const result: ApiResponse<{ id: number }> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Error inviting user:', error)
      throw error
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(invitationId: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${invitationId}/accept`, {
        method: 'POST',
        headers: authService.getAuthHeaders()
      })

      const result: ApiResponse<void> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to accept invitation')
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      throw error
    }
  }

  /**
   * Decline invitation
   */
  async declineInvitation(invitationId: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${invitationId}/decline`, {
        method: 'POST',
        headers: authService.getAuthHeaders()
      })

      const result: ApiResponse<void> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to decline invitation')
      }
    } catch (error) {
      console.error('Error declining invitation:', error)
      throw error
    }
  }

  /**
   * Get project collaborators
   */
  async getProjectCollaborators(projectId: number): Promise<CollaboratorWithUser[]> {
    try {
      const response = await fetch(`${this.baseUrl}/project/${projectId}`, {
        headers: authService.getAuthHeaders()
      })

      const result: ApiResponse<CollaboratorWithUser[]> = await response.json()

      if (result.success && result.data) {
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch collaborators')
    } catch (error) {
      console.error('Error fetching collaborators:', error)
      throw error
    }
  }

  /**
   * Remove collaborator from project
   */
  async removeCollaborator(projectId: number, userId: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/project/${projectId}/user/${userId}`, {
        method: 'DELETE',
        headers: authService.getAuthHeaders()
      })

      const result: ApiResponse<void> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to remove collaborator')
      }
    } catch (error) {
      console.error('Error removing collaborator:', error)
      throw error
    }
  }

  /**
   * Update collaborator role
   */
  async updateCollaboratorRole(
    projectId: number,
    userId: number,
    role: 'editor' | 'viewer'
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/project/${projectId}/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        body: JSON.stringify({ role })
      })

      const result: ApiResponse<void> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update collaborator role')
      }
    } catch (error) {
      console.error('Error updating collaborator role:', error)
      throw error
    }
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService()
