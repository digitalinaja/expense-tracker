import { formatCurrency, formatDate } from '../utils/formatters'
import { expenseStore } from '../stores/ExpenseStore'
import type { Expense } from '../types'

/**
 * Expense List Component
 * Displays list of expenses with delete functionality
 */
export class ExpenseList {
  private listElement: HTMLUListElement
  private unsubscribe: (() => void) | null = null

  constructor() {
    this.listElement = document.getElementById('expenseList') as HTMLUListElement
  }

  /**
   * Initialize component and subscribe to store updates
   */
  init(): void {
    // Subscribe to expense store changes
    this.unsubscribe = expenseStore.subscribe((expenses) => {
      this.render(expenses)
    })

    // Initial render
    const { expenses } = expenseStore.getState()
    this.render(expenses)
  }

  /**
   * Render expense list
   */
  private render(expenses: Expense[]): void {
    // Clear list
    this.listElement.innerHTML = ''

    // Show empty state if no expenses
    if (expenses.length === 0) {
      this.showEmptyState(true)
      return
    }

    // Hide empty state and render expenses
    this.showEmptyState(false)
    expenses.forEach(expense => {
      const listItem = this.createExpenseItem(expense)
      this.listElement.appendChild(listItem)
    })
  }

  /**
   * Show or hide empty state
   */
  private showEmptyState(show: boolean): void {
    const emptyState = document.getElementById('expenseEmptyState')
    if (emptyState) {
      emptyState.style.display = show ? 'flex' : 'none'
    }
  }

  /**
   * Create expense item element
   */
  private createExpenseItem(expense: Expense): HTMLElement {
    const li = document.createElement('li')
    li.className = 'expense-item'
    li.dataset.id = String(expense.id)

    // Create item content
    const content = document.createElement('div')
    content.className = 'expense-item-content'

    const name = document.createElement('div')
    name.className = 'expense-item-name'

    // Add expense name
    const nameText = document.createElement('span')
    nameText.textContent = expense.name
    name.appendChild(nameText)

    // Add category badge if categorized
    if (expense.planning_name) {
      const categoryBadge = document.createElement('span')
      categoryBadge.className = 'category-badge'
      categoryBadge.textContent = expense.planning_name
      categoryBadge.title = `Kategori: ${expense.planning_name}`
      name.appendChild(categoryBadge)
    } else {
      // Show uncategorized badge
      const uncategorizedBadge = document.createElement('span')
      uncategorizedBadge.className = 'category-badge uncategorized'
      uncategorizedBadge.textContent = 'Uncategorized'
      name.appendChild(uncategorizedBadge)
    }

    const details = document.createElement('div')
    details.className = 'expense-item-details'

    const amount = document.createElement('span')
    amount.className = 'expense-item-amount'
    amount.textContent = formatCurrency(expense.amount)

    const date = document.createElement('span')
    date.className = 'expense-item-date'
    date.textContent = formatDate(expense.date)

    details.appendChild(amount)
    details.appendChild(date)

    content.appendChild(name)
    content.appendChild(details)

    // Create delete button
    const deleteButton = document.createElement('button')
    deleteButton.className = 'expense-item-delete'
    deleteButton.textContent = 'Hapus'
    deleteButton.type = 'button'
    deleteButton.onclick = () => this.handleDelete(expense.id!)

    li.appendChild(content)
    li.appendChild(deleteButton)

    return li
  }

  /**
   * Handle delete expense
   */
  private async handleDelete(id: number): Promise<void> {
    // Confirm delete
    const confirmed = confirm('Yakin ingin menghapus pengeluaran ini?')
    if (!confirmed) return

    try {
      await expenseStore.delete(id)
      // Show success message (optional)
      this.showDeleteSuccess()
    } catch (error) {
      // Show error message
      this.showDeleteError()
    }
  }

  private showDeleteSuccess(): void {
    // Optional: Show success message
    console.log('Expense deleted successfully')
  }

  private showDeleteError(): void {
    // Optional: Show error message
    console.error('Failed to delete expense')
  }

  /**
   * Cleanup and unsubscribe
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  }
}
