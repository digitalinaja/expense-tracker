import type { Project, ProjectFormData, ProjectSummary, ApiResponse } from '../types'
import { authService } from './AuthService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL : '/api'

/**
 * Service untuk managing projects via API
 */
export class ProjectService {
  private baseUrl: string

  constructor() {
    this.baseUrl = `${API_BASE_URL}/projects`
  }

  /**
   * Get auth headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders()
    }
  }

  /**
   * Get all projects
   */
  async getAll(): Promise<Project[]> {
    try {
      console.log('Fetching projects from:', this.baseUrl)
      console.log('Auth headers:', authService.getAuthHeaders())

      const response = await fetch(this.baseUrl, {
        headers: this.getHeaders()
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      const result: ApiResponse<Project[]> = await response.json()

      console.log('API Result:', result)

      if (result.success && result.data) {
        console.log('Projects fetched:', result.data.length)
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch projects')
    } catch (error) {
      console.error('Error fetching projects:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
      throw error
    }
  }

  /**
   * Get single project by ID
   */
  async getById(id: number): Promise<Project> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        headers: this.getHeaders()
      })
      const result: ApiResponse<Project> = await response.json()

      if (result.success && result.data) {
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch project')
    } catch (error) {
      console.error('Error fetching project:', error)
      throw error
    }
  }

  /**
   * Get project summary
   */
  async getSummary(projectId: number): Promise<ProjectSummary> {
    try {
      const response = await fetch(`${this.baseUrl}/${projectId}/summary`, {
        headers: this.getHeaders()
      })
      const result: ApiResponse<ProjectSummary> = await response.json()

      if (result.success && result.data) {
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch project summary')
    } catch (error) {
      console.error('Error fetching project summary:', error)
      throw error
    }
  }

  /**
   * Create new project
   */
  async create(data: ProjectFormData): Promise<number> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      })

      const result: ApiResponse<{ id: number }> = await response.json()

      if (result.success && result.data) {
        return result.data.id
      }

      throw new Error(result.error || 'Failed to create project')
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    }
  }

  /**
   * Update project
   */
  async update(id: number, data: Partial<ProjectFormData>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      })

      const result: ApiResponse<void> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update project')
      }
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    }
  }

  /**
   * Delete project
   */
  async delete(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      })

      const result: ApiResponse<void> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete project')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      throw error
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService()
