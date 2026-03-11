import { projectStore } from '../stores/ProjectStore'
import { projectForm } from './ProjectForm'
import type { Project } from '../types'

/**
 * ProjectManager Component
 * Menangani project selection dengan dropdown dan management
 */
export class ProjectManager {
  private container: HTMLElement | null = null
  private projectDropdown: HTMLSelectElement | null = null
  private addProjectButton: HTMLButtonElement | null = null

  constructor() {
    this.createOrUpdateUI()
  }

  /**
   * Initialize UI elements (already exists in HTML)
   */
  private createOrUpdateUI(): void {
    const container = document.getElementById('projectManager')
    if (!container) {
      console.error('Project manager container not found in HTML')
      return
    }

    this.container = container
    this.render()

    // Subscribe setelah render selesai
    this.subscribeToStore()

    // Initial update
    const state = projectStore.getState()
    this.updateUI(state.projects, state.currentProjectId)
  }

  /**
   * Subscribe ke ProjectStore untuk reactive updates
   */
  private subscribeToStore(): void {
    projectStore.subscribe((state) => {
      this.updateUI(state.projects, state.currentProjectId)
    })
  }

  /**
   * Render initial UI
   */
  private render(): void {
    if (!this.container) return

    // Don't replace innerHTML - use existing HTML structure
    // Cache references from existing HTML
    this.projectDropdown = this.container.querySelector('#projectDropdown') as HTMLSelectElement
    this.addProjectButton = this.container.querySelector('#addProjectBtn') as HTMLButtonElement

    if (!this.projectDropdown || !this.addProjectButton) {
      console.error('Required project manager elements not found in HTML')
      return
    }

    // Attach event listeners
    this.addProjectButton.addEventListener('click', () => this.handleAddProject())
    this.projectDropdown.addEventListener('change', () => this.handleProjectChange())
  }

  /**
   * Update UI dengan projects terbaru
   */
  private updateUI(projects: Project[], currentProjectId: number | null): void {
    this.updateProjectDropdown(projects, currentProjectId)
  }

  /**
   * Update project dropdown dengan list projects
   */
  private updateProjectDropdown(projects: Project[], currentProjectId: number | null): void {
    if (!this.projectDropdown) {
      console.error('projectDropdown is null')
      return
    }

    // Clear existing options
    this.projectDropdown.innerHTML = ''

    if (projects.length === 0) {
      const option = document.createElement('option')
      option.value = ''
      option.textContent = 'No projects yet'
      this.projectDropdown.appendChild(option)
      return
    }

    // Add options for each project
    projects.forEach(project => {
      const option = document.createElement('option')
      option.value = project.id!.toString()
      option.textContent = project.name
      this.projectDropdown.appendChild(option)
    })

    // Set current project
    if (currentProjectId) {
      this.projectDropdown.value = currentProjectId.toString()
    } else if (projects.length > 0) {
      // If no current project but has projects, select first one
      this.projectDropdown.value = projects[0].id!.toString()
    }
  }

  /**
   * Handle project dropdown change
   */
  private async handleProjectChange(): Promise<void> {
    if (!this.projectDropdown) return

    const projectId = parseInt(this.projectDropdown.value)
    if (!isNaN(projectId)) {
      try {
        await projectStore.setCurrentProject(projectId)
      } catch (error) {
        console.error('Failed to switch project:', error)
        this.showError('Gagal mengganti project')
      }
    }
  }

  /**
   * Handle add project
   */
  private handleAddProject(): void {
    projectForm.openForCreate()
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.showMessage(message, 'error')
  }

  /**
   * Show message toast
   */
  private showMessage(message: string, type: 'success' | 'error'): void {
    const existingToast = document.querySelector('.project-manager-toast')
    if (existingToast) {
      existingToast.remove()
    }

    const toast = document.createElement('div')
    toast.className = `project-manager-toast toast-${type}`
    toast.textContent = message

    document.body.appendChild(toast)

    setTimeout(() => {
      toast.remove()
    }, 3000)
  }

  /**
   * Check if ada projects
   */
  hasProjects(): boolean {
    return projectStore.hasProjects()
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId(): number | null {
    return projectStore.getCurrentProjectId()
  }
}

// Export singleton instance
export const projectManager = new ProjectManager()
