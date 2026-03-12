import { projectService } from '../services/ProjectService'
import type { Project, ProjectSummary } from '../types'

/**
 * Store untuk project state management
 * Menggunakan Observer pattern untuk reactive updates
 */
export class ProjectStore {
  private projects: Project[] = []
  private currentProjectId: number | null = null
  private currentProjectSummary: ProjectSummary | null = null
  private listeners: Array<(state: { projects: Project[]; currentProjectId: number | null }) => void> = []
  private loading: boolean = false
  private error: string | null = null
  private readonly STORAGE_KEY = 'last_selected_project_id'

  /**
   * Subscribe ke state changes
   */
  subscribe(listener: (state: { projects: Project[]; currentProjectId: number | null }) => void): () => void {
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
    this.listeners.forEach(listener => listener({
      projects: this.projects,
      currentProjectId: this.currentProjectId
    }))
  }

  /**
   * Get current state
   */
  getState(): {
    projects: Project[]
    currentProjectId: number | null
    currentProjectSummary: ProjectSummary | null
    loading: boolean
    error: string | null
  } {
    return {
      projects: this.projects,
      currentProjectId: this.currentProjectId,
      currentProjectSummary: this.currentProjectSummary,
      loading: this.loading,
      error: this.error
    }
  }

  /**
   * Get all projects
   */
  getAll(): Project[] {
    return this.projects
  }

  /**
   * Get project by ID
   */
  getById(id: number): Project | undefined {
    return this.projects.find(p => p.id === id)
  }

  /**
   * Load all projects dari API
   */
  async load(): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      this.projects = await projectService.getAll()
      this.loading = false

      // Restore last selected project from localStorage
      this.restoreLastProject()

      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to load projects'
      this.notify()
      throw error
    }
  }

  /**
   * Simpan current project ID ke localStorage
   */
  private saveCurrentProject(projectId: number): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, projectId.toString())
    } catch (error) {
      console.warn('Failed to save current project to localStorage:', error)
    }
  }

  /**
   * Restore last selected project dari localStorage
   */
  private restoreLastProject(): void {
    try {
      const savedProjectId = localStorage.getItem(this.STORAGE_KEY)
      if (savedProjectId) {
        const projectId = parseInt(savedProjectId)

        // Validasi: pastikan project masih ada
        const projectExists = this.projects.some(p => p.id === projectId)
        if (projectExists) {
          this.currentProjectId = projectId
        }
      }
    } catch (error) {
      console.warn('Failed to restore last project from localStorage:', error)
    }
  }

  /**
   * Get current project
   */
  getCurrentProject(): Project | null {
    if (!this.currentProjectId) return null
    return this.projects.find(p => p.id === this.currentProjectId) || null
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId(): number | null {
    return this.currentProjectId
  }

  /**
   * Set current project
   */
  async setCurrentProject(projectId: number): Promise<void> {
    this.currentProjectId = projectId
    this.loading = true
    this.notify()

    try {
      // Load project summary
      this.currentProjectSummary = await projectService.getSummary(projectId)
      this.loading = false

      // Simpan ke localStorage untuk persistence
      this.saveCurrentProject(projectId)

      this.notify()
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to load project summary'
      this.notify()
      throw error
    }
  }

  /**
   * Get current project summary
   */
  getCurrentProjectSummary(): ProjectSummary | null {
    return this.currentProjectSummary
  }

  /**
   * Add new project
   */
  async add(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      const id = await projectService.create(projectData)
      const newProject: Project = {
        id,
        ...projectData,
        created_at: new Date().toISOString()
      }
      this.projects.push(newProject)
      this.loading = false
      this.notify()

      // Auto-switch ke new project
      await this.setCurrentProject(id)
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to add project'
      this.notify()
      throw error
    }
  }

  /**
   * Update existing project
   */
  async update(id: number, projectData: Partial<Project>): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      await projectService.update(id, projectData)

      // Update local state
      const index = this.projects.findIndex(p => p.id === id)
      if (index !== -1) {
        this.projects[index] = { ...this.projects[index], ...projectData }
      }

      // Update summary if it's current project
      if (this.currentProjectId === id) {
        await this.setCurrentProject(id)
      } else {
        this.loading = false
        this.notify()
      }
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to update project'
      this.notify()
      throw error
    }
  }

  /**
   * Delete project
   */
  async delete(id: number): Promise<void> {
    this.loading = true
    this.error = null
    this.notify()

    try {
      await projectService.delete(id)

      // Remove dari local state
      this.projects = this.projects.filter(p => p.id !== id)

      // If deleted project was current, switch to first available
      if (this.currentProjectId === id) {
        this.currentProjectId = this.projects.length > 0 ? this.projects[0].id! : null
        this.currentProjectSummary = null

        if (this.currentProjectId) {
          await this.setCurrentProject(this.currentProjectId)
        } else {
          this.loading = false
          this.notify()
        }
      } else {
        this.loading = false
        this.notify()
      }
    } catch (error) {
      this.loading = false
      this.error = error instanceof Error ? error.message : 'Failed to delete project'
      this.notify()
      throw error
    }
  }

  /**
   * Check if ada projects
   */
  hasProjects(): boolean {
    return this.projects.length > 0
  }

  /**
   * Get total projects count
   */
  getProjectCount(): number {
    return this.projects.length
  }

  /**
   * Clear semua state
   */
  clear(): void {
    this.projects = []
    this.currentProjectId = null
    this.currentProjectSummary = null
    this.error = null

    // Clear localStorage
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }

    this.notify()
  }
}

// Export singleton instance
export const projectStore = new ProjectStore()
