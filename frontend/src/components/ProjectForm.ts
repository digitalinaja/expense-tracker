import { validateProjectFormData } from '../utils/validators'
import { projectStore } from '../stores/ProjectStore'
import type { ProjectFormData, Project } from '../types'

/**
 * ProjectForm Component
 * Modal form untuk create/edit projects
 */
export class ProjectForm {
  private modal!: HTMLElement
  private form!: HTMLFormElement
  private nameInput!: HTMLInputElement
  private descriptionInput!: HTMLTextAreaElement
  private startDateInput!: HTMLInputElement
  private endDateInput!: HTMLInputElement
  private submitButton!: HTMLButtonElement
  private isEdit: boolean = false
  private editingId: number | null = null

  constructor() {
    this.createOrUpdateModal()
  }

  /**
   * Initialize modal element (already exists in HTML)
   */
  private createOrUpdateModal(): void {
    const modal = document.getElementById('projectModal')
    if (!modal) {
      console.error('Project modal not found in HTML')
      return
    }

    this.modal = modal
    this.initializeForm()
  }

  /**
   * Initialize form elements dan event listeners
   */
  private initializeForm(): void {
    this.form = this.modal.querySelector('#projectFormInner') as HTMLFormElement
    this.nameInput = document.getElementById('projectName') as HTMLInputElement
    this.descriptionInput = document.getElementById('projectDescription') as HTMLTextAreaElement
    this.startDateInput = document.getElementById('startDate') as HTMLInputElement
    this.endDateInput = document.getElementById('endDate') as HTMLInputElement

    const buttons = this.form.querySelectorAll('button')
    this.submitButton = buttons[1] as HTMLButtonElement

    this.form.addEventListener('submit', this.handleSubmit.bind(this))
  }

  /**
   * Open modal untuk create new project
   */
  openForCreate(): void {
    this.isEdit = false
    this.editingId = null

    // Update title
    const title = document.getElementById('modalTitle')
    if (title) title.textContent = 'Buat Project Baru'

    // Reset form
    this.form.reset()

    // Show modal
    this.modal.style.display = 'flex'
  }

  /**
   * Open modal untuk edit existing project
   */
  openForEdit(project: Project): void {
    this.isEdit = true
    this.editingId = project.id!

    // Update title
    const title = document.getElementById('modalTitle')
    if (title) title.textContent = 'Edit Project'

    // Fill form dengan existing data
    this.nameInput.value = project.name
    this.descriptionInput.value = project.description || ''
    this.startDateInput.value = project.start_date || ''
    this.endDateInput.value = project.end_date || ''

    // Update submit button text
    this.submitButton.textContent = 'Update Project'

    // Show modal
    this.modal.style.display = 'flex'
  }

  /**
   * Close modal
   */
  close(): void {
    this.modal.style.display = 'none'
    this.reset()
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault()

    const formData: ProjectFormData = {
      name: this.nameInput.value.trim(),
      description: this.descriptionInput.value.trim() || undefined,
      start_date: this.startDateInput.value || undefined,
      end_date: this.endDateInput.value || undefined
    }

    // Validate form data
    const validation = validateProjectFormData(formData)

    if (!validation.valid) {
      this.showErrors(validation.errors)
      return
    }

    // Clear previous errors
    this.clearErrors()

    // Disable submit button and show loading state
    this.setLoading(true)

    try {
      if (this.isEdit && this.editingId) {
        // Update existing project
        await projectStore.update(this.editingId, formData)
        this.showSuccess('Project berhasil diupdate!')
      } else {
        // Create new project
        await projectStore.add(formData)
        this.showSuccess('Project berhasil dibuat!')
      }

      // Close modal
      this.close()
    } catch (error) {
      // Show error message
      this.showError('Gagal menyimpan project. Silakan coba lagi.')
    } finally {
      // Re-enable submit button
      this.setLoading(false)
    }
  }

  /**
   * Show errors for form fields
   */
  private showErrors(errors: Record<string, string>): void {
    this.clearErrors()

    // Show error for each field
    if (errors.name) {
      this.showFieldError(this.nameInput, errors.name)
    }
    if (errors.description) {
      this.showFieldError(this.descriptionInput, errors.description)
    }
    if (errors.dates) {
      this.showError(errors.dates)
    }
  }

  private showFieldError(input: HTMLInputElement | HTMLTextAreaElement, message: string): void {
    input.classList.add('error')

    const errorDiv = document.createElement('div')
    errorDiv.className = 'field-error'
    errorDiv.textContent = message

    input.parentElement?.appendChild(errorDiv)
  }

  private clearErrors(): void {
    // Remove error class dari inputs
    this.nameInput.classList.remove('error')
    this.descriptionInput.classList.remove('error')
    this.startDateInput.classList.remove('error')
    this.endDateInput.classList.remove('error')

    // Remove all error messages
    this.form.querySelectorAll('.field-error').forEach(el => el.remove())
  }

  private setLoading(loading: boolean): void {
    this.submitButton.disabled = loading
    this.submitButton.textContent = loading
      ? (this.isEdit ? 'Menyimpan...' : 'Membuat...')
      : (this.isEdit ? 'Update Project' : 'Simpan Project')
  }

  private showSuccess(message: string): void {
    this.showMessage(message, 'success')
  }

  private showError(message: string): void {
    this.showMessage(message, 'error')
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    // Remove existing messages
    const existingMessage = this.form.querySelector('.form-message')
    if (existingMessage) {
      existingMessage.remove()
    }

    // Create message element
    const messageDiv = document.createElement('div')
    messageDiv.className = `form-message ${type}`
    messageDiv.textContent = message

    // Insert at top of form
    this.form.insertBefore(messageDiv, this.form.firstChild)

    // Auto-remove after 3 seconds
    setTimeout(() => {
      messageDiv.remove()
    }, 3000)
  }

  private reset(): void {
    this.form.reset()
    this.isEdit = false
    this.editingId = null
    this.submitButton.textContent = 'Simpan Project'
  }
}

// Export singleton instance
export const projectForm = new ProjectForm()
