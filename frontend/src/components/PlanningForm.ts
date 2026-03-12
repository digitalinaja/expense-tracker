import { getTodayDate } from '../utils/formatters'
import { validateExpenseFormData } from '../utils/validators'
import { planningStore } from '../stores/PlanningStore'
import { projectStore } from '../stores/ProjectStore'
import type { Planning } from '../types'

/**
 * Planning Form Component
 * Handles adding and editing planning items
 */
export class PlanningForm {
  private form: HTMLFormElement
  private nameInput: HTMLInputElement
  private amountInput: HTMLInputElement
  private dateInput: HTMLInputElement
  private submitButton: HTMLButtonElement
  private editingId: number | null = null

  constructor() {
    // Get form element
    this.form = document.getElementById('planningForm') as HTMLFormElement
    this.nameInput = document.getElementById('planningName') as HTMLInputElement
    this.amountInput = document.getElementById('planningAmount') as HTMLInputElement
    this.dateInput = document.getElementById('planningDate') as HTMLInputElement
    this.submitButton = this.form.querySelector('button[type="submit"]') as HTMLButtonElement

    // Set default date to today
    this.dateInput.value = getTodayDate()

    // Attach submit handler
    this.form.addEventListener('submit', this.handleSubmit.bind(this))
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault()

    // Get current project
    const currentProjectId = projectStore.getCurrentProjectId()
    if (!currentProjectId) {
      this.showError('Tidak ada project yang dipilih. Silakan pilih project terlebih dahulu.')
      return
    }

    const name = this.nameInput.value.trim()
    const amount = parseFloat(this.amountInput.value)
    const date = this.dateInput.value

    // Validate form data
    const validation = validateExpenseFormData({ name, amount, date })

    if (!validation.valid) {
      this.showErrors(validation.errors)
      return
    }

    // Clear previous errors
    this.clearErrors()

    // Disable submit button and show loading state
    this.setLoading(true)

    try {
      if (this.editingId) {
        // Update existing planning
        await planningStore.update(this.editingId, {
          name,
          amount,
          date,
          project_id: currentProjectId
        })
        this.showSuccess('Perencanaan berhasil diperbarui!')
      } else {
        // Add new planning through store with current project_id
        await planningStore.add({
          name,
          amount,
          date,
          project_id: currentProjectId
        })
        this.showSuccess('Perencanaan berhasil ditambahkan!')
      }

      // Reset form
      this.reset()
    } catch (error) {
      // Show error message
      this.showError(this.editingId
        ? 'Gagal memperbarui perencanaan. Silakan coba lagi.'
        : 'Gagal menambahkan perencanaan. Silakan coba lagi.')
    } finally {
      // Re-enable submit button
      this.setLoading(false)
    }
  }

  private showErrors(errors: Record<string, string>): void {
    this.clearErrors()

    // Show error for each field
    if (errors.name) {
      this.showFieldError(this.nameInput, errors.name)
    }
    if (errors.amount) {
      this.showFieldError(this.amountInput, errors.amount)
    }
    if (errors.date) {
      this.showFieldError(this.dateInput, errors.date)
    }
  }

  private showFieldError(input: HTMLInputElement, message: string): void {
    input.classList.add('error')

    const errorDiv = document.createElement('div')
    errorDiv.className = 'field-error'
    errorDiv.textContent = message

    input.parentElement?.appendChild(errorDiv)
  }

  private clearErrors(): void {
    // Remove error class from inputs
    this.nameInput.classList.remove('error')
    this.amountInput.classList.remove('error')
    this.dateInput.classList.remove('error')

    // Remove all error messages
    const form = this.form
    form.querySelectorAll('.field-error').forEach(el => el.remove())
  }

  private setLoading(loading: boolean): void {
    this.submitButton.disabled = loading
    this.submitButton.textContent = loading ? 'Menambahkan...' : 'Tambah Perencanaan'
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

    // Insert message before form
    this.form.parentElement?.insertBefore(messageDiv, this.form)

    // Auto-remove message after 3 seconds
    setTimeout(() => {
      messageDiv.remove()
    }, 3000)
  }

  /**
   * Reset form to initial state
   */
  reset(): void {
    this.form.reset()
    this.dateInput.value = getTodayDate()
    this.clearErrors()
    this.editingId = null
    this.setLoading(false)
    this.submitButton.textContent = 'Tambah Perencanaan'
  }

  /**
   * Set form to edit mode with planning data
   */
  edit(planning: Planning): void {
    this.editingId = planning.id || null
    this.nameInput.value = planning.name
    this.amountInput.value = String(planning.amount)
    this.dateInput.value = planning.date
    this.submitButton.textContent = 'Update Perencanaan'
    this.clearErrors()

    // Switch to the add tab if not already active
    const addTab = document.querySelector('[data-tab="planning-add"]') as HTMLElement
    if (addTab) {
      addTab.click()
    }

    // Focus on first input
    this.nameInput.focus()
  }
}
