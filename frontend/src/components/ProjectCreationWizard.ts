import { projectStore } from '../stores/ProjectStore'

/**
 * ProjectCreationWizard Component
 * Wizard untuk first-time users untuk membuat project pertama
 * Dibutuhkan sebelum bisa menggunakan aplikasi
 */
export class ProjectCreationWizard {
  private wizardOverlay: HTMLElement

  constructor() {
    this.createWizard()
  }

  /**
   * Initialize wizard from existing HTML
   */
  private createWizard(): void {
    const overlay = document.getElementById('projectWizard')

    if (!overlay) {
      console.error('Wizard element not found in HTML')
      return
    }

    this.wizardOverlay = overlay

    // Get the form from existing HTML
    const wizardForm = document.getElementById('wizardProjectForm')
    if (wizardForm) {
      wizardForm.addEventListener('submit', (e) => {
        e.preventDefault()
        this.handleFormSubmit()
      })
    }
  }

  /**
   * Show wizard
   */
  show(): void {
    if (this.wizardOverlay) {
      this.wizardOverlay.style.display = 'flex'
    }
  }

  /**
   * Hide wizard
   */
  hide(): void {
    if (this.wizardOverlay) {
      this.wizardOverlay.style.display = 'none'
    }
  }

  /**
   * Handle form submission
   */
  private async handleFormSubmit(): Promise<void> {
    const nameInput = document.getElementById('wizardProjectName') as HTMLInputElement
    const descInput = document.getElementById('wizardProjectDescription') as HTMLTextAreaElement

    if (!nameInput) {
      console.error('Form inputs not found')
      return
    }

    // Validate form
    const name = nameInput.value.trim()
    if (!name || name.length < 3) {
      alert('Nama project minimal 3 karakter')
      return
    }

    // Create project
    try {
      await projectStore.add({
        name,
        description: descInput?.value.trim() || undefined
      })

      // Hide wizard after successful creation
      this.hide()

      // Clear form
      nameInput.value = ''
      if (descInput) descInput.value = ''

    } catch (error) {
      console.error('Failed to create project:', error)
      alert('Gagal membuat project. Silakan coba lagi.')
    }
  }
}

// Export singleton instance
export const projectCreationWizard = new ProjectCreationWizard()
