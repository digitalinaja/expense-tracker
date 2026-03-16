import { planningService } from '../services/PlanningService'
import type { Planning } from '../types'
import { projectStore } from './ProjectStore'

/**
 * Simple reactive store for planning
 * Uses Observer pattern for state management
 */
export class PlanningStore {
  private planning: Planning[] = []
  private listeners: Array<(planning: Planning[]) => void> = []
  private loading: boolean = false
  private error: string | null = null

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (planning: Planning[]) => void): () => void {
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
    this.listeners.forEach(listener => listener(this.planning))
  }

  /**
   * Get current state
   */
  getState(): { planning: Planning[]; loading: boolean; error: string | null } {
    return {
      planning: this.planning,
      loading: this.loading,
      error: this.error
    }
  }

  /**
   * Load all planning items from API
   * Can optionally filter by project_id
   */
  async load(projectId?: number): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      this.planning = await planningService.getAll(projectId)
      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to load planning items'
      this.notify()
      throw error
    }
  }

  /**
   * Add new planning item
   */
  async add(planningData: Omit<Planning, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      const id = await planningService.create(planningData)
      const newPlanning: Planning = {
        id,
        ...planningData,
        created_at: new Date().toISOString()
      }
      this.planning.unshift(newPlanning)
      this.loading = false
      this.notify()

      // Refresh project summary to update accurate totals
      await projectStore.refreshSummary()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to add planning item'
      this.notify()
      throw error
    }
  }

  /**
   * Delete planning item
   */
  async delete(id: number): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      await planningService.delete(id)
      this.planning = this.planning.filter(p => p.id !== id)
      this.loading = false
      this.notify()

      // Refresh project summary to update accurate totals
      await projectStore.refreshSummary()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to delete planning item'
      this.notify()
      throw error
    }
  }

  /**
   * Update planning item
   */
  async update(id: number, data: Partial<Planning> & { project_id: number }): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      await planningService.update(id, data)
      const index = this.planning.findIndex(p => p.id === id)
      if (index !== -1) {
        this.planning[index] = { ...this.planning[index], ...data }
      }
      this.loading = false
      this.notify()

      // Refresh project summary to update accurate totals
      await projectStore.refreshSummary()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to update planning item'
      this.notify()
      throw error
    }
  }

  /**
   * Get total planning amount
   */
  getTotal(): number {
    return this.planning.reduce((sum, item) => sum + item.amount, 0)
  }

  /**
   * Clear all planning items
   */
  clear(): void {
    this.planning = []
    this.error = null
    this.notify()
  }
}

// Export singleton instance
export const planningStore = new PlanningStore()
