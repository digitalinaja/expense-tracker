import { expenseService } from '../services/ExpenseService'
import type { Expense } from '../types'
import { reportStore } from './ReportStore'
import { projectStore } from './ProjectStore'

/**
 * Simple reactive store for expenses
 * Uses Observer pattern for state management
 */
export class ExpenseStore {
  private expenses: Expense[] = []
  private listeners: Array<(expenses: Expense[]) => void> = []
  private loading: boolean = false
  private error: string | null = null

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (expenses: Expense[]) => void): () => void {
    this.listeners.push(listener)
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    this.listeners.forEach(listener => listener(this.expenses))
  }

  /**
   * Get current state
   */
  getState(): { expenses: Expense[]; loading: boolean; error: string | null } {
    return {
      expenses: this.expenses,
      loading: this.loading,
      error: this.error
    }
  }

  /**
   * Load all expenses from API
   * Can optionally filter by project_id
   */
  async load(projectId?: number): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      this.expenses = await expenseService.getAll(projectId)
      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to load expenses'
      this.notify()
      throw error
    }
  }

  /**
   * Add new expense
   */
  async add(expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      await expenseService.create(expenseData)
      
      // Reload expenses from API instead of manual push to get planning_names
      const currentProjectId = projectStore.getCurrentProjectId()
      await this.load(currentProjectId || undefined)
      
      // Reload reports so summaries update in real-time
      await reportStore.load(currentProjectId || undefined)
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to add expense'
      this.notify()
      throw error
    }
  }

  /**
   * Delete expense
   */
  async delete(id: number): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      await expenseService.delete(id)
      this.expenses = this.expenses.filter(e => e.id !== id)
      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to delete expense'
      this.notify()
      throw error
    }
  }

  /**
   * Update expense
   */
  async update(id: number, data: Partial<Expense>): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      await expenseService.update(id, data)
      const index = this.expenses.findIndex(e => e.id === id)
      if (index !== -1) {
        this.expenses[index] = { ...this.expenses[index], ...data }
      }
      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to update expense'
      this.notify()
      throw error
    }
  }

  /**
   * Get total expenses amount
   */
  getTotal(): number {
    return this.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  /**
   * Clear all expenses
   */
  clear(): void {
    this.expenses = []
    this.error = null
    this.notify()
  }
}

// Export singleton instance
export const expenseStore = new ExpenseStore()
