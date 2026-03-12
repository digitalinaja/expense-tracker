import { collaborationService } from '../services/CollaborationService'
import { collaborationStore } from '../stores/CollaborationStore'
import { projectStore } from '../stores/ProjectStore'
import { inviteCollaboratorModal } from './InviteCollaboratorModal'
import type { CollaboratorWithUser } from '../types'

/**
 * CollaboratorPanel Component
 * Panel untuk menampilkan dan mengelola kolaborator dalam project
 */
export class CollaboratorPanel {
  private modal: HTMLElement | null = null
  private listContainer: HTMLElement | null = null
  private emptyState: HTMLElement | null = null
  private header: HTMLElement | null = null
  private isOpen: boolean = false
  private currentProjectId: number | null = null
  private unsubscribe: (() => void) | null = null
  private isOwner: boolean = false

  constructor() {
    this.createModal()
  }

  /**
   * Create modal HTML structure
   */
  private createModal(): void {
    // Check if modal already exists
    this.modal = document.getElementById('collaboratorPanelModal')
    if (this.modal) return

    // Create modal
    this.modal = document.createElement('div')
    this.modal.id = 'collaboratorPanelModal'
    this.modal.className = 'collaboration-modal'
    this.modal.innerHTML = `
      <div class="collaboration-modal-backdrop" id="collaboratorBackdrop"></div>
      <div class="collaboration-modal-content large">
        <div class="collaboration-modal-header">
          <div class="collaboration-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <h2>Kolaborator Project</h2>
          </div>
          <button class="collaboration-modal-close" id="closeCollaboratorPanelBtn">&times;</button>
        </div>
        <div class="collaboration-modal-body">
          <div id="collaboratorLoading" class="collaboration-loading" style="display: none;">
            <div class="loading-spinner-small"></div>
            <p>Memuat kolaborator...</p>
          </div>
          <div id="collaboratorError" class="collaboration-error" style="display: none;"></div>

          <div id="collaboratorHeader" class="collaborator-header" style="display: none;">
            <div class="collaborator-project-info">
              <h3 id="collaboratorProjectName"></h3>
              <p>Manage collaborators and their permissions</p>
            </div>
            <button id="addCollaboratorBtn" class="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Undang
            </button>
          </div>

          <div id="collaboratorList" class="collaborator-list"></div>
          <div id="collaboratorEmpty" class="collaboration-empty" style="display: none;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <p>Belum ada kolaborator</p>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(this.modal)

    // Cache references
    this.listContainer = this.modal.querySelector('#collaboratorList')
    this.emptyState = this.modal.querySelector('#collaboratorEmpty')
    this.header = this.modal.querySelector('#collaboratorHeader')

    // Setup event listeners
    this.setupEventListeners()
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.modal) return

    // Close button
    const closeBtn = this.modal.querySelector('#closeCollaboratorPanelBtn')
    closeBtn?.addEventListener('click', () => this.close())

    // Add collaborator button
    const addBtn = this.modal.querySelector('#addCollaboratorBtn')
    addBtn?.addEventListener('click', () => {
      inviteCollaboratorModal.show(this.currentProjectId || undefined)
    })

    // Backdrop click
    const backdrop = this.modal.querySelector('#collaboratorBackdrop')
    backdrop?.addEventListener('click', () => this.close())

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close()
      }
    })
  }

  /**
   * Show modal
   */
  async show(projectId?: number): Promise<void> {
    if (!this.modal) return

    // Get current project if not specified
    this.currentProjectId = projectId || projectStore.getCurrentProjectId()

    if (!this.currentProjectId) {
      this.showError('Tidak ada project yang dipilih')
      return
    }

    // Check if user is owner (can manage collaborators)
    const user = this.getCurrentUser()
    this.isOwner = await this.checkIsOwner(user?.id, this.currentProjectId)

    this.isOpen = true
    this.modal.style.display = 'flex'
    document.body.style.overflow = 'hidden'

    // Update header
    this.updateHeader()

    // Load collaborators
    await this.loadCollaborators()
  }

  /**
   * Close modal
   */
  close(): void {
    if (!this.modal) return

    this.isOpen = false
    this.modal.style.display = 'none'
    document.body.style.overflow = ''

    // Unsubscribe from store
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }

    this.currentProjectId = null
  }

  /**
   * Update header based on ownership
   */
  private updateHeader(): void {
    const projectName = projectStore.getById(this.currentProjectId!)?.name

    const projectNameEl = this.modal?.querySelector('#collaboratorProjectName')
    if (projectNameEl) {
      projectNameEl.textContent = projectName || 'Project'
    }

    const addBtn = this.modal?.querySelector('#addCollaboratorBtn')
    if (addBtn) {
      addBtn.style.display = this.isOwner ? 'flex' : 'none'
    }

    if (this.header) {
      this.header.style.display = 'flex'
    }
  }

  /**
   * Load collaborators from API
   */
  private async loadCollaborators(): Promise<void> {
    const loadingEl = this.modal?.querySelector('#collaboratorLoading')
    const errorEl = this.modal?.querySelector('#collaboratorError')

    try {
      // Show loading
      if (loadingEl) loadingEl.style.display = 'flex'
      if (errorEl) errorEl.style.display = 'none'

      // Load collaborators
      await collaborationStore.loadCollaborators(
        this.currentProjectId!,
        () => collaborationService.getProjectCollaborators(this.currentProjectId!)
      )

      // Subscribe to store updates
      this.unsubscribe = collaborationStore.subscribe((state) => {
        const collaborators = state.collaboratorsMap.get(this.currentProjectId!) || []
        this.renderCollaborators(collaborators)
      })

      // Initial render
      const state = collaborationStore.getState()
      const collaborators = state.collaboratorsMap.get(this.currentProjectId!) || []
      this.renderCollaborators(collaborators)

    } catch (error) {
      console.error('Failed to load collaborators:', error)
      if (errorEl) {
        errorEl.textContent = error instanceof Error ? error.message : 'Gagal memuat kolaborator'
        errorEl.style.display = 'block'
      }
    } finally {
      if (loadingEl) loadingEl.style.display = 'none'
    }
  }

  /**
   * Render collaborators list
   */
  private renderCollaborators(collaborators: CollaboratorWithUser[]): void {
    if (!this.listContainer || !this.emptyState) return

    const acceptedCollaborators = collaborators.filter(collab => collab.status === 'accepted')

    if (acceptedCollaborators.length === 0) {
      this.listContainer.style.display = 'none'
      this.emptyState.style.display = 'flex'
      return
    }

    this.emptyState.style.display = 'none'
    this.listContainer.style.display = 'block'

    this.listContainer.innerHTML = acceptedCollaborators.map(collab => `
      <div class="collaborator-card" data-user-id="${collab.user_id}">
        <div class="collaborator-avatar">
          ${collab.user_avatar_url
            ? `<img src="${this.escapeHtml(collab.user_avatar_url)}" alt="${this.escapeHtml(collab.user_name)}">`
            : `<div class="avatar-placeholder">${this.getInitials(collab.user_name)}</div>`
          }
        </div>
        <div class="collaborator-info">
          <h4>${this.escapeHtml(collab.user_name)}</h4>
          <p>${this.escapeHtml(collab.user_email)}</p>
        </div>
        <div class="collaborator-role">
          <span class="badge-role badge-${collab.role}">${collab.role === 'editor' ? 'Editor' : 'Viewer'}</span>
        </div>
        ${this.isOwner ? `
          <div class="collaborator-actions">
            <button class="btn-collaborator-action btn-change-role" data-user-id="${collab.user_id}" data-role="${collab.role}" title="Change role">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <button class="btn-collaborator-action btn-remove" data-user-id="${collab.user_id}" title="Remove collaborator">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        ` : ''}
      </div>
    `).join('')

    // Attach event listeners
    this.attachCollaboratorListeners()
  }

  /**
   * Attach event listeners to collaborator action buttons
   */
  private attachCollaboratorListeners(): void {
    if (!this.isOwner) return

    // Change role buttons
    const changeRoleBtns = this.listContainer?.querySelectorAll('.btn-change-role')
    changeRoleBtns?.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault()
        const userId = parseInt((btn as HTMLElement).dataset.userId || '0')
        const currentRole = (btn as HTMLElement).dataset.role as 'editor' | 'viewer'
        await this.handleChangeRole(userId, currentRole)
      })
    })

    // Remove buttons
    const removeBtns = this.listContainer?.querySelectorAll('.btn-remove')
    removeBtns?.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault()
        const userId = parseInt((btn as HTMLElement).dataset.userId || '0')
        await this.handleRemove(userId)
      })
    })
  }

  /**
   * Handle change role
   */
  private async handleChangeRole(userId: number, currentRole: 'editor' | 'viewer'): Promise<void> {
    const newRole: 'editor' | 'viewer' = currentRole === 'editor' ? 'viewer' : 'editor'
    const card = this.listContainer?.querySelector(`.collaborator-card[data-user-id="${userId}"]`)
    const errorEl = this.modal?.querySelector('#collaboratorError')

    try {
      // Update role
      await collaborationStore.updateCollaboratorRole(
        this.currentProjectId!,
        userId,
        newRole,
        () => collaborationService.updateCollaboratorRole(this.currentProjectId!, userId, newRole)
      )

      // Show success toast
      this.showToast('Role berhasil diupdate')

    } catch (error) {
      console.error('Failed to change role:', error)
      if (errorEl) {
        errorEl.textContent = error instanceof Error ? error.message : 'Gagal mengubah role'
        errorEl.style.display = 'block'

        setTimeout(() => {
          errorEl.style.display = 'none'
        }, 5000)
      }
    }
  }

  /**
   * Handle remove collaborator
   */
  private async handleRemove(userId: number): Promise<void> {
    const confirmed = confirm('Apakah Anda yakin ingin menghapus kolaborator ini dari project?')
    if (!confirmed) return

    const card = this.listContainer?.querySelector(`.collaborator-card[data-user-id="${userId}"]`)
    const errorEl = this.modal?.querySelector('#collaboratorError')

    try {
      // Remove collaborator
      await collaborationStore.removeCollaborator(
        this.currentProjectId!,
        userId,
        () => collaborationService.removeCollaborator(this.currentProjectId!, userId)
      )

      // Remove card with animation
      card?.classList.add('collaborator-removing')
      setTimeout(() => {
        card?.remove()

        // Check if no more collaborators
        const remaining = this.listContainer?.querySelectorAll('.collaborator-card')
        if (!remaining || remaining.length === 0) {
          const emptyEl = this.modal?.querySelector('#collaboratorEmpty')
          if (emptyEl) {
            this.listContainer!.style.display = 'none'
            emptyEl.style.display = 'flex'
          }
        }
      }, 300)

      this.showToast('Kolaborator berhasil dihapus')

    } catch (error) {
      console.error('Failed to remove collaborator:', error)
      if (errorEl) {
        errorEl.textContent = error instanceof Error ? error.message : 'Gagal menghapus kolaborator'
        errorEl.style.display = 'block'

        setTimeout(() => {
          errorEl.style.display = 'none'
        }, 5000)
      }
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const errorEl = this.modal?.querySelector('#collaboratorError')
    if (errorEl) {
      errorEl.textContent = message
      errorEl.style.display = 'block'
    }
  }

  /**
   * Show toast message
   */
  private showToast(message: string): void {
    // Remove existing toast
    const existingToast = document.querySelector('.collaboration-toast')
    if (existingToast) {
      existingToast.remove()
    }

    // Create toast
    const toast = document.createElement('div')
    toast.className = 'collaboration-toast'
    toast.textContent = message

    document.body.appendChild(toast)

    setTimeout(() => {
      toast.remove()
    }, 3000)
  }

  /**
   * Check if current user is owner
   */
  private async checkIsOwner(userId: number | undefined, projectId: number): Promise<boolean> {
    // For now, assume owner. In production, check with backend
    // This would be handled by the access control in the API
    return true
  }

  /**
   * Get current user from auth store
   */
  private getCurrentUser(): { id: number; email: string } | null {
    const authData = localStorage.getItem('auth')
    if (!authData) return null

    try {
      const parsed = JSON.parse(authData)
      return parsed.user || null
    } catch {
      return null
    }
  }

  /**
   * Get initials from name
   */
  private getInitials(name: string): string {
    const parts = name.trim().split(' ')
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase()
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// Export singleton instance
export const collaboratorPanel = new CollaboratorPanel()
