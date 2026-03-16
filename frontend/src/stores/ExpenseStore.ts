import { expenseService, type ExpenseSearchParams } from '../services/ExpenseService'
import type { Expense } from '../types'
import { reportStore } from './ReportStore'
import { projectStore } from './ProjectStore'

const PAGE_SIZE = 20

/**
 * Simple reactive store for expenses
 * Uses Observer pattern for state management
 * Supports paginated loading with search and filter
 */
export class ExpenseStore {
  private expenses: Expense[] = []
  private listeners: Array<(expenses: Expense[]) => void> = []
  private loading: boolean = false
  private loadingMore: boolean = false
  private error: string | null = null
  private hasMore: boolean = false
  private total: number = 0
  private currentOffset: number = 0
  private searchQuery: string = ''
  private filterPlanningId: number | 'uncategorized' | undefined = undefined

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
  getState(): {
    expenses: Expense[]
    loading: boolean
    loadingMore: boolean
    error: string | null
    hasMore: boolean
    total: number
    searchQuery: string
    filterPlanningId: number | 'uncategorized' | undefined
  } {
    return {
      expenses: this.expenses,
      loading: this.loading,
      loadingMore: this.loadingMore,
      error: this.error,
      hasMore: this.hasMore,
      total: this.total,
      searchQuery: this.searchQuery,
      filterPlanningId: this.filterPlanningId
    }
  }

  /**
   * Load all expenses from API (legacy, used by summary/reports)
   * Can optionally filter by project_id
   */
  async load(projectId?: number): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      this.expenses = await expenseService.getAll(projectId)
      this.total = this.expenses.length
      this.hasMore = false
      this.currentOffset = this.expenses.length
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
   * Load first page with search/filter (resets list)
   */
  async loadPage(search?: string, planningId?: number | 'uncategorized'): Promise<void> {
    this.searchQuery = search || ''
    this.filterPlanningId = planningId
    this.currentOffset = 0
    this.loading = true
    this.error = null
    this.notify()

    try {
      const params: ExpenseSearchParams = {
        projectId: projectStore.getCurrentProjectId() || undefined,
        search: this.searchQuery || undefined,
        planningId: this.filterPlanningId,
        limit: PAGE_SIZE,
        offset: 0
      }

      const result = await expenseService.search(params)
      this.expenses = result.data
      this.total = result.pagination.total
      this.hasMore = result.pagination.hasMore
      this.currentOffset = PAGE_SIZE
      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to search expenses'
      this.notify()
      throw error
    }
  }

  /**
   * Load next page (append to existing list)
   */
  async loadMore(): Promise<void> {
    if (!this.hasMore || this.loadingMore) return

    this.loadingMore = true
    this.notify()

    try {
      const params: ExpenseSearchParams = {
        projectId: projectStore.getCurrentProjectId() || undefined,
        search: this.searchQuery || undefined,
        planningId: this.filterPlanningId,
        limit: PAGE_SIZE,
        offset: this.currentOffset
      }

      const result = await expenseService.search(params)
      this.expenses = [...this.expenses, ...result.data]
      this.total = result.pagination.total
      this.hasMore = result.pagination.hasMore
      this.currentOffset += PAGE_SIZE
      this.loadingMore = false
      this.notify()
    } catch (error) {
      this.loadingMore = false
      this.error = error instanceof Error ? error.message : 'Failed to load more expenses'
      this.notify()
      throw error
    }
  }

  /**
   * Add new expense
   * Returns the ID of the created expense
   * @param shouldReload - Whether to reload expenses after creating (default: true)
   */
  async add(expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'>, shouldReload: boolean = true): Promise<number> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      const expenseId = await expenseService.create(expenseData)

      if (shouldReload) {
        // Reload expenses from API using pagination to maintain consistency
        const currentProjectId = projectStore.getCurrentProjectId()
        await this.loadPage(this.searchQuery, this.filterPlanningId)

        // Reload reports so summaries update in real-time
        await reportStore.load(currentProjectId || undefined)
      } else {
        this.loading = false
        this.notify()
      }

      return expenseId
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
      this.total = Math.max(0, this.total - 1)
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
    this.hasMore = false
    this.total = 0
    this.currentOffset = 0
    this.searchQuery = ''
    this.filterPlanningId = undefined
    this.notify()
  }
}

// Export singleton instance
export const expenseStore = new ExpenseStore()
