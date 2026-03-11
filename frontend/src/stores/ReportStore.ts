import { reportService } from '../services/ReportService'
import type { FullCategoryReport, CategoryReport } from '../types'

/**
 * Store untuk category report state
 * Uses Observer pattern untuk reactive updates
 */
export class ReportStore {
  private report: FullCategoryReport | null = null
  private listeners: Array<(report: FullCategoryReport | null) => void> = []
  private loading: boolean = false
  private error: string | null = null

  /**
   * Subscribe ke state changes
   */
  subscribe(listener: (report: FullCategoryReport | null) => void): () => void {
    this.listeners.push(listener)
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  /**
   * Notify semua listeners dari state change
   */
  private notify(): void {
    this.listeners.forEach(listener => listener(this.report))
  }

  /**
   * Get current state
   */
  getState(): { report: FullCategoryReport | null; loading: boolean; error: string | null } {
    return {
      report: this.report,
      loading: this.loading,
      error: this.error
    }
  }

  /**
   * Load full category report dari API
   */
  async load(): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      this.report = await reportService.getFullReport()
      this.loading = false
      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to load report'
      this.notify()
      throw error
    }
  }

  /**
   * Get categorized reports
   */
  getCategorizedReports(): CategoryReport[] {
    return this.report?.categorized || []
  }

  /**
   * Get uncategorized report
   */
  getUncategorizedReport() {
    return this.report?.uncategorized || { total_amount: 0, count: 0 }
  }

  /**
   * Get report by planning ID
   */
  getReportByPlanningId(planningId: number): CategoryReport | undefined {
    return this.report?.categorized.find(r => r.planning_id === planningId)
  }

  /**
   * Clear report data
   */
  clear(): void {
    this.report = null
    this.error = null
    this.notify()
  }
}

// Export singleton instance
export const reportStore = new ReportStore()
