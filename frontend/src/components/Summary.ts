import { formatCurrency } from '../utils/formatters'
import { projectStore } from '../stores/ProjectStore'
import { reportStore } from '../stores/ReportStore'

/**
 * Summary Component
 * Displays total expenses, planning, and remaining balance
 * Uses accurate data from database via ProjectStore
 */
export class Summary {
  private totalExpenseElement: HTMLElement
  private totalPlanningElement: HTMLElement
  private remainingBalanceElement: HTMLElement
  private unsubscribeProject: (() => void) | null = null
  private unsubscribeReport: (() => void) | null = null
  private loading: boolean = false

  constructor() {
    this.totalExpenseElement = document.getElementById('totalExpense') as HTMLElement
    this.totalPlanningElement = document.getElementById('totalPlanning') as HTMLElement
    this.remainingBalanceElement = document.getElementById('remainingBalance') as HTMLElement
  }

  /**
   * Initialize component and subscribe to store updates
   */
  init(): void {
    // Subscribe to project store changes (for project summary)
    this.unsubscribeProject = projectStore.subscribe(async () => {
      await this.refreshSummary()
    })

    // Subscribe to report store changes (for realtime updates when expenses change)
    this.unsubscribeReport = reportStore.subscribe(async () => {
      await this.refreshSummary()
    })

    // Initial load
    this.refreshSummary()
  }

  /**
   * Refresh summary from database
   */
  private async refreshSummary(): Promise<void> {
    if (this.loading) return // Prevent concurrent refreshes

    const currentProjectId = projectStore.getCurrentProjectId()
    if (!currentProjectId) {
      // No project selected, show zeros
      this.updateDisplay(0, 0, 0)
      return
    }

    this.loading = true

    try {
      // Refresh summary from database
      await projectStore.setCurrentProject(currentProjectId)

      const summary = projectStore.getCurrentProjectSummary()
      if (summary) {
        this.updateDisplay(summary.total_expenses, summary.total_planning, summary.remaining)
      }
    } catch (error) {
      console.error('Failed to refresh summary:', error)
    } finally {
      this.loading = false
    }
  }

  /**
   * Update display with values
   */
  private updateDisplay(totalExpenses: number, totalPlanning: number, remainingBalance: number): void {
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
    if (this.unsubscribeProject) {
      this.unsubscribeProject()
    }
    if (this.unsubscribeReport) {
      this.unsubscribeReport()
    }
  }
}
