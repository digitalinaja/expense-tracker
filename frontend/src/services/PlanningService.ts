import type { Planning, ApiResponse, PlanningFormData } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL : '/api'

/**
 * Service for managing planning via API
 */
export class PlanningService {
  private baseUrl: string

  constructor() {
    this.baseUrl = `${API_BASE_URL}/planning`
  }

  /**
   * Get all planning items
   * Can optionally filter by project_id
   */
  async getAll(projectId?: number): Promise<Planning[]> {
    try {
      const url = projectId ? `${this.baseUrl}?project_id=${projectId}` : this.baseUrl
      const response = await fetch(url)
      const result: ApiResponse<Planning[]> = await response.json()

      if (result.success && result.data) {
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch planning items')
    } catch (error) {
      console.error('Error fetching planning:', error)
      throw error
    }
  }

  /**
   * Get single planning item by ID
   */
  async getById(id: number): Promise<Planning> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`)
      const result: ApiResponse<Planning> = await response.json()

      if (result.success && result.data) {
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch planning item')
    } catch (error) {
      console.error('Error fetching planning item:', error)
      throw error
    }
  }

  /**
   * Create new planning item
   */
  async create(data: PlanningFormData): Promise<number> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result: ApiResponse<{ id: number }> = await response.json()

      if (result.success && result.data) {
        return result.data.id
      }

      throw new Error(result.error || 'Failed to create planning item')
    } catch (error) {
      console.error('Error creating planning item:', error)
      throw error
    }
  }

  /**
   * Update planning item
   */
  async update(id: number, data: Partial<PlanningFormData>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result: ApiResponse<void> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update planning item')
      }
    } catch (error) {
      console.error('Error updating planning item:', error)
      throw error
    }
  }

  /**
   * Delete planning item
   */
  async delete(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE'
      })

      const result: ApiResponse<void> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete planning item')
      }
    } catch (error) {
      console.error('Error deleting planning item:', error)
      throw error
    }
  }
}

// Export singleton instance
export const planningService = new PlanningService()
