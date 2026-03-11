import { getTodayDate } from '../utils/formatters'
import { validateExpenseFormData } from '../utils/validators'
import { expenseStore } from '../stores/ExpenseStore'
import { planningStore } from '../stores/PlanningStore'

/**
 * Expense Form Component
 * Handles adding new expenses dengan planning categorization
 */
export class ExpenseForm {
  private form: HTMLFormElement
  private nameInput: HTMLInputElement
  private amountInput: HTMLInputElement
  private dateInput: HTMLInputElement
  private planningSelect: HTMLSelectElement
  private submitButton: HTMLButtonElement

  constructor() {
    // Get form element
    this.form = document.getElementById('expenseForm') as HTMLFormElement
    this.nameInput = document.getElementById('expenseName') as HTMLInputElement
    this.amountInput = document.getElementById('expenseAmount') as HTMLInputElement
    this.dateInput = document.getElementById('expenseDate') as HTMLInputElement
    this.submitButton = this.form.querySelector('button[type="submit"]') as HTMLButtonElement

    // Get or create planning select dropdown
    this.planningSelect = this.getOrCreatePlanningSelect()

    // Set default date to today
    this.dateInput.value = getTodayDate()

    // Populate planning options
    this.populatePlanningOptions()

    // Attach submit handler
    this.form.addEventListener('submit', this.handleSubmit.bind(this))

    // Subscribe to planning changes untuk update dropdown
    planningStore.subscribe(() => {
      this.populatePlanningOptions()
    })
  }

  /**
   * Get or create planning select dropdown
   */
  private getOrCreatePlanningSelect(): HTMLSelectElement {
    let select = document.getElementById('expensePlanning') as HTMLSelectElement

    if (!select) {
      // Create select element
      select = document.createElement('select')
      select.id = 'expensePlanning'
      select.name = 'planning_id'

      // Create label
      const label = document.createElement('label')
      label.textContent = 'Kategori (Opsional)'
      label.setAttribute('for', 'expensePlanning')

      // Insert before submit button
      this.submitButton.parentElement?.insertBefore(label, this.submitButton)
      this.submitButton.parentElement?.insertBefore(select, this.submitButton)
    }

    return select
  }

  /**
   * Populate planning dropdown dengan options
   */
  private populatePlanningOptions(): void {
    // Clear existing options
    this.planningSelect.innerHTML = ''

    // Add default "Uncategorized" option
    const defaultOption = document.createElement('option')
    defaultOption.value = ''
    defaultOption.textContent = 'Tanpa Kategori (Uncategorized)'
    this.planningSelect.appendChild(defaultOption)

    // Get all planning items
    const { planning } = planningStore.getState()

    // Add planning options
    planning.forEach(item => {
      const option = document.createElement('option')
      option.value = String(item.id!)
      option.textContent = `${item.name} - ${this.formatCurrency(item.amount)}`
      this.planningSelect.appendChild(option)
    })
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault()

    const name = this.nameInput.value.trim()
    const amount = parseFloat(this.amountInput.value)
    const date = this.dateInput.value

    // Get planning_id (empty string means null/uncategorized)
    const planningValue = this.planningSelect.value
    const planning_id = planningValue === '' ? null : parseInt(planningValue)

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
      // Add expense through store dengan planning_id
      await expenseStore.add({
        name,
        amount,
        date,
        planning_id
      })

      // Reset form (but keep date)
      const currentDate = this.dateInput.value
      this.form.reset()
      this.dateInput.value = currentDate
      this.planningSelect.value = '' // Reset to Uncategorized

      // Show success message
      this.showSuccess('Pengeluaran berhasil ditambahkan!')
    } catch (error) {
      // Show error message
      this.showError('Gagal menambahkan pengeluaran. Silakan coba lagi.')
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
    this.planningSelect.classList.remove('error')

    // Remove all error messages
    const form = this.form
    form.querySelectorAll('.field-error').forEach(el => el.remove())
  }

  private setLoading(loading: boolean): void {
    this.submitButton.disabled = loading
    this.submitButton.textContent = loading ? 'Menambahkan...' : 'Tambah Pengeluaran'
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
    this.planningSelect.value = ''
    this.clearErrors()
  }
}
