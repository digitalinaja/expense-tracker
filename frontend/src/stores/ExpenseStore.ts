import { expenseService } from '../services/ExpenseService'
import type { Expense } from '../types'

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
   */
  async load(): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      this.expenses = await expenseService.getAll()
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
      const id = await expenseService.create(expenseData)
      const newExpense: Expense = {
        id,
        ...expenseData,
        created_at: new Date().toISOString()
      }
      this.expenses.unshift(newExpense)
      this.loading = false
      this.notify()
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
