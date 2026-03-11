import type { FullCategoryReport, UncategorizedReport, ApiResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL : '/api'

/**
 * Service untuk category reports
 */
export class ReportService {
  private baseUrl: string

  constructor() {
    this.baseUrl = `${API_BASE_URL}/reports`
  }

  /**
   * Get full categorized report
   * Can optionally filter by project_id
   */
  async getFullReport(projectId?: number): Promise<FullCategoryReport> {
    try {
      const url = projectId ? `${this.baseUrl}/by-category?project_id=${projectId}` : `${this.baseUrl}/by-category`
      const response = await fetch(url)
      const result: ApiResponse<FullCategoryReport> = await response.json()

      if (result.success && result.data) {
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch category report')
    } catch (error) {
      console.error('Error fetching category report:', error)
      throw error
    }
  }

  /**
   * Get uncategorized report only
   */
  async getUncategorizedReport(): Promise<UncategorizedReport> {
    try {
      const response = await fetch(`${this.baseUrl}/uncategorized`)
      const result: ApiResponse<UncategorizedReport> = await response.json()

      if (result.success && result.data) {
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch uncategorized report')
    } catch (error) {
      console.error('Error fetching uncategorized report:', error)
      throw error
    }
  }
}

// Export singleton instance
export const reportService = new ReportService()
