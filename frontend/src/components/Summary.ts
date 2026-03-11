import { formatCurrency } from '../utils/formatters'
import { expenseStore } from '../stores/ExpenseStore'
import { planningStore } from '../stores/PlanningStore'

/**
 * Summary Component
 * Displays total expenses, planning, and remaining balance
 */
export class Summary {
  private totalExpenseElement: HTMLElement
  private totalPlanningElement: HTMLElement
  private remainingBalanceElement: HTMLElement
  private unsubscribeExpenses: (() => void) | null = null
  private unsubscribePlanning: (() => void) | null = null

  constructor() {
    this.totalExpenseElement = document.getElementById('totalExpense') as HTMLElement
    this.totalPlanningElement = document.getElementById('totalPlanning') as HTMLElement
    this.remainingBalanceElement = document.getElementById('remainingBalance') as HTMLElement
  }

  /**
   * Initialize component and subscribe to store updates
   */
  init(): void {
    // Subscribe to expense store changes
    this.unsubscribeExpenses = expenseStore.subscribe(() => {
      this.updateSummary()
    })

    // Subscribe to planning store changes
    this.unsubscribePlanning = planningStore.subscribe(() => {
      this.updateSummary()
    })

    // Initial update
    this.updateSummary()
  }

  /**
   * Update summary display
   */
  private updateSummary(): void {
    const totalExpenses = expenseStore.getTotal()
    const totalPlanning = planningStore.getTotal()
    const remainingBalance = totalPlanning - totalExpenses

    // Update DOM elements
    this.totalExpenseElement.textContent = formatCurrency(totalExpenses)
    this.totalPlanningElement.textContent = formatCurrency(totalPlanning)
    this.remainingBalanceElement.textContent = formatCurrency(remainingBalance)

    // Update balance color based on value
    if (remainingBalance < 0) {
      this.remainingBalanceElement.className = 'balance-negative'
    } else if (remainingBalance === 0) {
      this.remainingBalanceElement.className = 'balance-neutral'
    } else {
      this.remainingBalanceElement.className = 'balance-positive'
    }
  }

  /**
   * Cleanup and unsubscribe
   */
  destroy(): void {
    if (this.unsubscribeExpenses) {
      this.unsubscribeExpenses()
    }
    if (this.unsubscribePlanning) {
      this.unsubscribePlanning()
    }
  }
}
