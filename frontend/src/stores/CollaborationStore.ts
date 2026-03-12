import type { Invitation, CollaboratorWithUser } from '../types'

/**
 * Store untuk collaboration state management
 * Menggunakan Observer pattern untuk reactive updates
 */
export class CollaborationStore {
  private invitations: Invitation[] = []
  private collaboratorsMap: Map<number, CollaboratorWithUser[]> = new Map()
  private pendingCount: number = 0
  private listeners: Array<(state: {
    invitations: Invitation[]
    pendingCount: number
  }) => void> = []
  private loading: boolean = false
  private error: string | null = null

  /**
   * Subscribe ke state changes
   */
  subscribe(listener: (state: { invitations: Invitation[]; pendingCount: number }) => void): () => void {
    this.listeners.push(listener)
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  /**
   * Notify semua listeners dari state change
   */
  private notify(): void {
    this.listeners.forEach(listener => listener({
      invitations: this.invitations,
      pendingCount: this.pendingCount
    }))
  }

  /**
   * Get current state
   */
  getState(): {
    invitations: Invitation[]
    collaboratorsMap: Map<number, CollaboratorWithUser[]>
    pendingCount: number
    loading: boolean
    error: string | null
  } {
    return {
      invitations: this.invitations,
      collaboratorsMap: this.collaboratorsMap,
      pendingCount: this.pendingCount,
      loading: this.loading,
      error: this.error
    }
  }

  /**
   * Get all invitations
   */
  getInvitations(): Invitation[] {
    return this.invitations
  }

  /**
   * Get pending invitations only
   */
  getPendingInvitations(): Invitation[] {
    return this.invitations.filter(inv => inv.status === 'pending')
  }

  /**
   * Get pending invitation count
   */
  getPendingCount(): number {
    return this.pendingCount
  }

  /**
   * Get collaborators for a project
   */
  getCollaborators(projectId: number): CollaboratorWithUser[] {
    return this.collaboratorsMap.get(projectId) || []
  }

  /**
   * Load invitations for current user
   */
  async loadInvitations(loadFn: () => Promise<Invitation[]>): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      this.invitations = await loadFn()
      this.pendingCount = this.invitations.filter(inv => inv.status === 'pending').length
      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to load invitations'
      this.notify()
      throw error
    }
  }

  /**
   * Load collaborators for a project
   */
  async loadCollaborators(projectId: number, loadFn: () => Promise<CollaboratorWithUser[]>): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      const collaborators = await loadFn()
      this.collaboratorsMap.set(projectId, collaborators)
      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to load collaborators'
      this.notify()
      throw error
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(invitationId: number, acceptFn: (id: number) => Promise<void>): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      await acceptFn(invitationId)

      // Update local state
      const index = this.invitations.findIndex(inv => inv.id === invitationId)
      if (index !== -1) {
        this.invitations[index].status = 'accepted'
      }

      // Update pending count
      this.pendingCount = this.invitations.filter(inv => inv.status === 'pending').length

      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to accept invitation'
      this.notify()
      throw error
    }
  }

  /**
   * Decline invitation
   */
  async declineInvitation(invitationId: number, declineFn: (id: number) => Promise<void>): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      await declineFn(invitationId)

      // Remove from local state
      this.invitations = this.invitations.filter(inv => inv.id !== invitationId)

      // Update pending count
      this.pendingCount = this.invitations.filter(inv => inv.status === 'pending').length

      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to decline invitation'
      this.notify()
      throw error
    }
  }

  /**
   * Remove collaborator
   */
  async removeCollaborator(projectId: number, userId: number, removeFn: () => Promise<void>): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      await removeFn()

      // Update local state
      const collaborators = this.collaboratorsMap.get(projectId) || []
      this.collaboratorsMap.set(
        projectId,
        collaborators.filter(collab => collab.user_id !== userId)
      )

      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to remove collaborator'
      this.notify()
      throw error
    }
  }

  /**
   * Update collaborator role
   */
  async updateCollaboratorRole(
    projectId: number,
    userId: number,
    role: 'editor' | 'viewer',
    updateFn: () => Promise<void>
  ): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      await updateFn()

      // Update local state
      const collaborators = this.collaboratorsMap.get(projectId) || []
      const index = collaborators.findIndex(collab => collab.user_id === userId)

      if (index !== -1) {
        collaborators[index].role = role
        this.collaboratorsMap.set(projectId, collaborators)
      }

      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to update collaborator role'
      this.notify()
      throw error
    }
  }

  /**
   * Invite collaborator
   */
  async inviteCollaborator(inviteFn: () => Promise<void>): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      await inviteFn()
      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to invite collaborator'
      this.notify()
      throw error
    }
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.loading = loading
    this.notify()
  }

  /**
   * Set error state
   */
  setError(error: string | null): void {
    this.error = error
    this.loading = false
    this.notify()
  }

  /**
   * Clear collaborators for a project
   */
  clearCollaborators(projectId: number): void {
    this.collaboratorsMap.delete(projectId)
    this.notify()
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.invitations = []
    this.collaboratorsMap.clear()
    this.pendingCount = 0
    this.error = null
    this.notify()
  }
}

// Export singleton instance
export const collaborationStore = new CollaborationStore()
