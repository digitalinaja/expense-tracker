import type { FullCategoryReport, UncategorizedReport } from '../types'
import { apiHandler } from './ApiHandler'

/**
 * Service untuk category reports
 * Menggunakan centralized ApiHandler untuk automatic token refresh
 */
export class ReportService {
  /**
   * Get full categorized report
   * Can optionally filter by project_id
   */
  async getFullReport(projectId?: number): Promise<FullCategoryReport> {
    const endpoint = projectId
      ? `/reports/by-category?project_id=${projectId}`
      : '/reports/by-category'
    return apiHandler.get<FullCategoryReport>(endpoint)
  }

  /**
   * Get uncategorized report only
   */
  async getUncategorizedReport(): Promise<UncategorizedReport> {
    return apiHandler.get<UncategorizedReport>('/reports/uncategorized')
  }
}

// Export singleton instance
export const reportService = new ReportService()
