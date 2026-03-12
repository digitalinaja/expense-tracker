import { collaborationService } from '../services/CollaborationService'
import { collaborationStore } from '../stores/CollaborationStore'
import { projectStore } from '../stores/ProjectStore'

/**
 * InviteCollaboratorModal Component
 * Modal untuk mengundang user ke project
 */
export class InviteCollaboratorModal {
  private modal: HTMLElement | null = null
  private form: HTMLFormElement | null = null
  private projectId: number | null = null
  private isOpen: boolean = false

  constructor() {
    this.createModal()
  }

  /**
   * Create modal HTML structure
   */
  private createModal(): void {
    // Check if modal already exists
    this.modal = document.getElementById('inviteCollaboratorModal')
    if (this.modal) return

    // Create modal
    this.modal = document.createElement('div')
    this.modal.id = 'inviteCollaboratorModal'
    this.modal.className = 'collaboration-modal'
    this.modal.innerHTML = `
      <div class="collaboration-modal-backdrop" id="inviteBackdrop"></div>
      <div class="collaboration-modal-content small">
        <div class="collaboration-modal-header">
          <div class="collaboration-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            <h2>Undang Kolaborator</h2>
          </div>
          <button class="collaboration-modal-close" id="closeInviteBtn">&times;</button>
        </div>
        <div class="collaboration-modal-body">
          <form id="inviteCollaboratorForm">
            <div class="form-group">
              <label for="inviteEmail">Email Address *</label>
              <input
                type="email"
                id="inviteEmail"
                placeholder="colleague@example.com"
                required
                autocomplete="email"
              >
              <small class="form-hint">User harus sudah terdaftar di aplikasi</small>
            </div>

            <div class="form-group">
              <label for="inviteRole">Role *</label>
              <select id="inviteRole" required>
                <option value="viewer">Viewer - Hanya lihat</option>
                <option value="editor">Editor - Bisa edit</option>
              </select>
              <small class="form-hint">
                <strong>Editor:</strong> Dapat menambah/edit/menghapus planning dan expenses<br>
                <strong>Viewer:</strong> Hanya dapat melihat data
              </small>
            </div>

            <div id="inviteError" class="collaboration-error" style="display: none;"></div>
            <div id="inviteSuccess" class="collaboration-success" style="display: none;"></div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" id="cancelInviteBtn">Batal</button>
              <button type="submit" class="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                Kirim Undangan
              </button>
            </div>
          </form>
        </div>
      </div>
    `

    document.body.appendChild(this.modal)

    // Cache form reference
    this.form = this.modal.querySelector('#inviteCollaboratorForm') as HTMLFormElement

    // Setup event listeners
    this.setupEventListeners()
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.modal) return

    // Close button
    const closeBtn = this.modal.querySelector('#closeInviteBtn')
    closeBtn?.addEventListener('click', () => this.close())

    // Cancel button
    const cancelBtn = this.modal.querySelector('#cancelInviteBtn')
    cancelBtn?.addEventListener('click', () => this.close())

    // Backdrop click
    const backdrop = this.modal.querySelector('#inviteBackdrop')
    backdrop?.addEventListener('click', () => this.close())

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close()
      }
    })

    // Form submit
    this.form?.addEventListener('submit', (e) => this.handleSubmit(e))
  }

  /**
   * Show modal for specific project
   */
  show(projectId?: number): void {
    if (!this.modal) return

    // Get current project if not specified
    this.projectId = projectId || projectStore.getCurrentProjectId()

    if (!this.projectId) {
      this.showError('Tidak ada project yang dipilih')
      return
    }

    this.isOpen = true
    this.modal.style.display = 'flex'
    document.body.style.overflow = 'hidden'

    // Reset form
    this.form?.reset()
    this.hideMessages()
  }

  /**
   * Close modal
   */
  close(): void {
    if (!this.modal) return

    this.isOpen = false
    this.modal.style.display = 'none'
    document.body.style.overflow = ''

    // Reset form
    this.form?.reset()
    this.hideMessages()
  }

  /**
   * Handle form submit
   */
  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault()

    if (!this.form || !this.projectId) return

    const emailInput = this.form.querySelector('#inviteEmail') as HTMLInputElement
    const roleInput = this.form.querySelector('#inviteRole') as HTMLSelectElement
    const submitBtn = this.form.querySelector('button[type="submit"]') as HTMLButtonElement

    const email = emailInput.value.trim()
    const role = roleInput.value as 'editor' | 'viewer'

    // Validate
    if (!email) {
      this.showError('Email tidak boleh kosong')
      return
    }

    // Disable submit button
    submitBtn.disabled = true
    this.hideMessages()

    try {
      // Send invitation
      await collaborationStore.inviteCollaborator(() =>
        collaborationService.inviteToProject(this.projectId!, email, role)
      )

      // Show success message
      this.showSuccess(`Undangan berhasil dikirim ke ${email}`)

      // Clear form
      emailInput.value = ''

      // Auto close after delay
      setTimeout(() => {
        this.close()
      }, 2000)

    } catch (error) {
      console.error('Failed to invite collaborator:', error)
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengirim undangan'
      this.showError(errorMessage)
    } finally {
      submitBtn.disabled = false
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const errorEl = this.modal?.querySelector('#inviteError')
    if (errorEl) {
      errorEl.textContent = message
      errorEl.style.display = 'block'
    }

    // Hide success message
    const successEl = this.modal?.querySelector('#inviteSuccess')
    if (successEl) {
      successEl.style.display = 'none'
    }
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    const successEl = this.modal?.querySelector('#inviteSuccess')
    if (successEl) {
      successEl.textContent = message
      successEl.style.display = 'block'
    }

    // Hide error message
    const errorEl = this.modal?.querySelector('#inviteError')
    if (errorEl) {
      errorEl.style.display = 'none'
    }
  }

  /**
   * Hide all messages
   */
  private hideMessages(): void {
    const errorEl = this.modal?.querySelector('#inviteError')
    const successEl = this.modal?.querySelector('#inviteSuccess')

    if (errorEl) errorEl.style.display = 'none'
    if (successEl) successEl.style.display = 'none'
  }
}

// Export singleton instance
export const inviteCollaboratorModal = new InviteCollaboratorModal()
