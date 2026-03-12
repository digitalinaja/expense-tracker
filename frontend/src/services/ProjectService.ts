import type { Project, ProjectFormData, ProjectSummary } from '../types'
import { apiHandler } from './ApiHandler'

/**
 * Service untuk managing projects via API
 * Menggunakan centralized ApiHandler untuk automatic token refresh
 */
export class ProjectService {
  /**
   * Get all projects
   */
  async getAll(): Promise<Project[]> {
    return apiHandler.get<Project[]>('/projects')
  }

  /**
   * Get single project by ID
   */
  async getById(id: number): Promise<Project> {
    return apiHandler.get<Project>(`/projects/${id}`)
  }

  /**
   * Get project summary
   */
  async getSummary(projectId: number): Promise<ProjectSummary> {
    return apiHandler.get<ProjectSummary>(`/projects/${projectId}/summary`)
  }

  /**
   * Create new project
   */
  async create(data: ProjectFormData): Promise<number> {
    return apiHandler.post<{ id: number }>('/projects', data).then(r => r.id)
  }

  /**
   * Update project
   */
  async update(id: number, data: Partial<ProjectFormData>): Promise<void> {
    return apiHandler.put<void>(`/projects/${id}`, data)
  }

  /**
   * Delete project
   */
  async delete(id: number): Promise<void> {
    return apiHandler.delete<void>(`/projects/${id}`)
  }
}

// Export singleton instance
export const projectService = new ProjectService()
