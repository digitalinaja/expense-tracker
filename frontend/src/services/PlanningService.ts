import type { Planning, PlanningFormData } from '../types'
import { apiHandler } from './ApiHandler'

/**
 * Service for managing planning via API
 * Menggunakan centralized ApiHandler untuk automatic token refresh
 */
export class PlanningService {
  /**
   * Get all planning items
   * Can optionally filter by project_id
   */
  async getAll(projectId?: number): Promise<Planning[]> {
    const endpoint = projectId ? `/planning?project_id=${projectId}` : '/planning'
    return apiHandler.get<Planning[]>(endpoint)
  }

  /**
   * Get single planning item by ID
   */
  async getById(id: number): Promise<Planning> {
    return apiHandler.get<Planning>(`/planning/${id}`)
  }

  /**
   * Create new planning item
   */
  async create(data: PlanningFormData): Promise<number> {
    return apiHandler.post<{ id: number }>('/planning', data).then(r => r.id)
  }

  /**
   * Update planning item
   */
  async update(id: number, data: Partial<PlanningFormData>): Promise<void> {
    return apiHandler.put<void>(`/planning/${id}`, data)
  }

  /**
   * Delete planning item
   */
  async delete(id: number): Promise<void> {
    return apiHandler.delete<void>(`/planning/${id}`)
  }
}

// Export singleton instance
export const planningService = new PlanningService()
