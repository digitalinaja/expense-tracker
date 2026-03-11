import { getTodayDate } from '../utils/formatters'
import { validateExpenseFormData } from '../utils/validators'
import { planningStore } from '../stores/PlanningStore'

/**
 * Planning Form Component
 * Handles adding new planning items
 */
export class PlanningForm {
  private form: HTMLFormElement
  private nameInput: HTMLInputElement
  private amountInput: HTMLInputElement
  private dateInput: HTMLInputElement
  private submitButton: HTMLButtonElement

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
      // Add planning through store
      await planningStore.add({
        name,
        amount,
        date
      })

      // Reset form
      this.form.reset()
      this.dateInput.value = getTodayDate()

      // Show success message
      this.showSuccess('Perencanaan berhasil ditambahkan!')
    } catch (error) {
      // Show error message
      this.showError('Gagal menambahkan perencanaan. Silakan coba lagi.')
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
  }
}
