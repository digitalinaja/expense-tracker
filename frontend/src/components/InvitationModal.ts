import { collaborationService } from '../services/CollaborationService'
import { collaborationStore } from '../stores/CollaborationStore'
import type { Invitation } from '../types'

/**
 * InvitationModal Component
 * Modal untuk menampilkan dan mengelola undangan kolaborasi
 */
export class InvitationModal {
  private modal: HTMLElement | null = null
  private listContainer: HTMLElement | null = null
  private emptyState: HTMLElement | null = null
  private isOpen: boolean = false
  private unsubscribe: (() => void) | null = null

  constructor() {
    this.createModal()
  }

  /**
   * Create modal HTML structure
   */
  private createModal(): void {
    // Check if modal already exists
    this.modal = document.getElementById('invitationModal')
    if (this.modal) return

    // Create modal
    this.modal = document.createElement('div')
    this.modal.id = 'invitationModal'
    this.modal.className = 'collaboration-modal'
    this.modal.innerHTML = `
      <div class="collaboration-modal-backdrop" id="invitationBackdrop"></div>
      <div class="collaboration-modal-content">
        <div class="collaboration-modal-header">
          <div class="collaboration-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <h2>Undangan Kolaborasi</h2>
          </div>
          <button class="collaboration-modal-close" id="closeInvitationBtn">&times;</button>
        </div>
        <div class="collaboration-modal-body">
          <div id="invitationLoading" class="collaboration-loading" style="display: none;">
            <div class="loading-spinner-small"></div>
            <p>Memuat undangan...</p>
          </div>
          <div id="invitationError" class="collaboration-error" style="display: none;"></div>
          <div id="invitationList" class="invitation-list"></div>
          <div id="invitationEmpty" class="collaboration-empty" style="display: none;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <p>Tidak ada undangan</p>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(this.modal)

    // Cache references
    this.listContainer = this.modal.querySelector('#invitationList')
    this.emptyState = this.modal.querySelector('#invitationEmpty')

    // Setup event listeners
    this.setupEventListeners()
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.modal) return

    // Close button
    const closeBtn = this.modal.querySelector('#closeInvitationBtn')
    closeBtn?.addEventListener('click', () => this.close())

    // Backdrop click
    const backdrop = this.modal.querySelector('#invitationBackdrop')
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
  async show(): Promise<void> {
    if (!this.modal) return

    this.isOpen = true
    this.modal.style.display = 'flex'
    document.body.style.overflow = 'hidden'

    // Load invitations
    await this.loadInvitations()
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
  }

  /**
   * Load invitations from API
   */
  private async loadInvitations(): Promise<void> {
    const loadingEl = this.modal?.querySelector('#invitationLoading')
    const errorEl = this.modal?.querySelector('#invitationError')
    const listEl = this.modal?.querySelector('#invitationList')
    const emptyEl = this.modal?.querySelector('#invitationEmpty')

    try {
      // Show loading
      if (loadingEl) loadingEl.style.display = 'flex'
      if (errorEl) errorEl.style.display = 'none'
      if (listEl) listEl.style.display = 'none'
      if (emptyEl) emptyEl.style.display = 'none'

      // Load invitations
      await collaborationStore.loadInvitations(() =>
        collaborationService.getAllInvitations()
      )

      // Subscribe to store updates
      this.unsubscribe = collaborationStore.subscribe((state) => {
        this.renderInvitations(state.invitations)
      })

      // Initial render
      const state = collaborationStore.getState()
      this.renderInvitations(state.invitations)

    } catch (error) {
      console.error('Failed to load invitations:', error)
      if (errorEl) {
        errorEl.textContent = error instanceof Error ? error.message : 'Gagal memuat undangan'
        errorEl.style.display = 'block'
      }
    } finally {
      if (loadingEl) loadingEl.style.display = 'none'
    }
  }

  /**
   * Render invitations list
   */
  private renderInvitations(invitations: Invitation[]): void {
    if (!this.listContainer || !this.emptyState) return

    const pendingInvitations = invitations.filter(inv => inv.status === 'pending')

    if (pendingInvitations.length === 0) {
      this.listContainer.style.display = 'none'
      this.emptyState.style.display = 'flex'
      return
    }

    this.emptyState.style.display = 'none'
    this.listContainer.style.display = 'block'

    this.listContainer.innerHTML = pendingInvitations.map(invitation => `
      <div class="invitation-card" data-id="${invitation.id}">
        <div class="invitation-header">
          <div class="invitation-project">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <div>
              <h3>${this.escapeHtml(invitation.project_name)}</h3>
              ${invitation.project_description ? `<p>${this.escapeHtml(invitation.project_description)}</p>` : ''}
            </div>
          </div>
          <span class="invitation-role badge-${invitation.role}">${invitation.role === 'editor' ? 'Editor' : 'Viewer'}</span>
        </div>
        <div class="invitation-meta">
          <span class="invitation-inviter">
            Diundang oleh <strong>${this.escapeHtml(invitation.inviter_name)}</strong>
          </span>
          <span class="invitation-date">${this.formatDate(invitation.created_at)}</span>
        </div>
        <div class="invitation-actions">
          <button class="btn-invitation btn-decline" data-id="${invitation.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Tolak
          </button>
          <button class="btn-invitation btn-accept" data-id="${invitation.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Terima
          </button>
        </div>
      </div>
    `).join('')

    // Attach event listeners to buttons
    this.attachInvitationListeners()
  }

  /**
   * Attach event listeners to invitation action buttons
   */
  private attachInvitationListeners(): void {
    // Accept buttons
    const acceptBtns = this.listContainer?.querySelectorAll('.btn-accept')
    acceptBtns?.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault()
        const id = parseInt((btn as HTMLElement).dataset.id || '0')
        await this.handleAccept(id)
      })
    })

    // Decline buttons
    const declineBtns = this.listContainer?.querySelectorAll('.btn-decline')
    declineBtns?.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault()
        const id = parseInt((btn as HTMLElement).dataset.id || '0')
        await this.handleDecline(id)
      })
    })
  }

  /**
   * Handle accept invitation
   */
  private async handleAccept(invitationId: number): Promise<void> {
    const card = this.listContainer?.querySelector(`.invitation-card[data-id="${invitationId}"]`)
    const errorEl = this.modal?.querySelector('#invitationError')

    try {
      // Disable buttons on the card
      const buttons = card?.querySelectorAll('.btn-invitation')
      buttons?.forEach(btn => {
        (btn as HTMLButtonElement).disabled = true
      })

      // Accept invitation
      await collaborationStore.acceptInvitation(invitationId, (id) =>
        collaborationService.acceptInvitation(id)
      )

      // Remove card with animation
      card?.classList.add('invitation-removing')
      setTimeout(() => {
        card?.remove()

        // Check if no more invitations
        const remaining = this.listContainer?.querySelectorAll('.invitation-card')
        if (!remaining || remaining.length === 0) {
          const emptyEl = this.modal?.querySelector('#invitationEmpty')
          if (emptyEl) {
            this.listContainer!.style.display = 'none'
            emptyEl.style.display = 'flex'
          }
        }
      }, 300)

    } catch (error) {
      console.error('Failed to accept invitation:', error)

      // Re-enable buttons
      const buttons = card?.querySelectorAll('.btn-invitation')
      buttons?.forEach(btn => {
        (btn as HTMLButtonElement).disabled = false
      })

      // Show error
      if (errorEl) {
        errorEl.textContent = error instanceof Error ? error.message : 'Gagal menerima undangan'
        errorEl.style.display = 'block'

        setTimeout(() => {
          errorEl.style.display = 'none'
        }, 5000)
      }
    }
  }

  /**
   * Handle decline invitation
   */
  private async handleDecline(invitationId: number): Promise<void> {
    const card = this.listContainer?.querySelector(`.invitation-card[data-id="${invitationId}"]`)
    const errorEl = this.modal?.querySelector('#invitationError')

    try {
      // Disable buttons on the card
      const buttons = card?.querySelectorAll('.btn-invitation')
      buttons?.forEach(btn => {
        (btn as HTMLButtonElement).disabled = true
      })

      // Decline invitation
      await collaborationStore.declineInvitation(invitationId, (id) =>
        collaborationService.declineInvitation(id)
      )

      // Remove card with animation
      card?.classList.add('invitation-removing')
      setTimeout(() => {
        card?.remove()

        // Check if no more invitations
        const remaining = this.listContainer?.querySelectorAll('.invitation-card')
        if (!remaining || remaining.length === 0) {
          const emptyEl = this.modal?.querySelector('#invitationEmpty')
          if (emptyEl) {
            this.listContainer!.style.display = 'none'
            emptyEl.style.display = 'flex'
          }
        }
      }, 300)

    } catch (error) {
      console.error('Failed to decline invitation:', error)

      // Re-enable buttons
      const buttons = card?.querySelectorAll('.btn-invitation')
      buttons?.forEach(btn => {
        (btn as HTMLButtonElement).disabled = false
      })

      // Show error
      if (errorEl) {
        errorEl.textContent = error instanceof Error ? error.message : 'Gagal menolak undangan'
        errorEl.style.display = 'block'

        setTimeout(() => {
          errorEl.style.display = 'none'
        }, 5000)
      }
    }
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Hari ini'
    } else if (diffDays === 1) {
      return 'Kemarin'
    } else if (diffDays < 7) {
      return `${diffDays} hari lalu`
    } else {
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }
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
export const invitationModal = new InvitationModal()
