import { ExpenseForm } from './components/ExpenseForm'
import { PlanningForm } from './components/PlanningForm'
import { ExpenseList } from './components/ExpenseList'
import { PlanningList } from './components/PlanningList'
import { Summary } from './components/Summary'
import { ReportSection } from './components/ReportSection'
import { TabManager } from './components/TabManager'
import { NavigationManager } from './components/NavigationManager'
import { projectForm } from './components/ProjectForm'
import { projectCreationWizard } from './components/ProjectCreationWizard'
import { expenseStore } from './stores/ExpenseStore'
import { planningStore } from './stores/PlanningStore'
import { projectStore } from './stores/ProjectStore'

// Import ProjectManager for side-effect (auto-initialization)
import './components/ProjectManager'

// Make projectForm globally available for HTML onclick handlers
;(window as any).projectForm = projectForm

/**
 * Main application entry point
 */
class App {
  private expenseList: ExpenseList
  private planningList: PlanningList
  private summary: Summary
  private reportSection: ReportSection
  private navigationManager: NavigationManager
  private planningTabManager: TabManager
  private unsubscribeExpenses: (() => void) | null = null
  private unsubscribePlanning: (() => void) | null = null
  private unsubscribeProjects: (() => void) | null = null
  private isInitialized: boolean = false

  constructor() {
    // Initialize project manager (singleton instance)
    // ProjectManager component auto-initializes itself

    // Initialize components
    new ExpenseForm()
    new PlanningForm()
    this.expenseList = new ExpenseList()
    this.planningList = new PlanningList()
    this.summary = new Summary()
    this.reportSection = new ReportSection()

    // Initialize navigation manager
    this.navigationManager = new NavigationManager()

    // Initialize tab manager for planning page
    this.planningTabManager = new TabManager('.planning-section')
  }

  /**
   * Initialize application
   */
  async init(): Promise<void> {
    try {
      // Show loading state
      this.showLoading()

      // STEP 1: Load projects first
      await projectStore.load()

      // STEP 2: Check if user has any projects
      if (!projectStore.hasProjects()) {
        // First-time user - show wizard
        this.hideLoading()
        projectCreationWizard.show()

        // Subscribe to project store to detect when first project is created
        this.unsubscribeProjects = projectStore.subscribe(async () => {
          if (projectStore.hasProjects() && !this.isInitialized) {
            // First project created, initialize the app
            this.isInitialized = true
            projectCreationWizard.hide()
            await this.initializeWithProject()
          }
        })

        return
      }

      // STEP 3: Has projects - set current project and initialize
      await this.initializeWithProject()

    } catch (error) {
      console.error('Failed to initialize application:', error)
      this.showInitializationError()
      this.hideLoading()
    }
  }

  /**
   * Initialize application with a project context
   */
  private async initializeWithProject(): Promise<void> {
    try {
      // Show loading state
      this.showLoading()

      // Get current project or set first project as current
      let currentProjectId = projectStore.getCurrentProjectId()
      if (!currentProjectId) {
        const projects = projectStore.getAll()
        if (projects.length > 0 && projects[0].id) {
          await projectStore.setCurrentProject(projects[0].id)
          currentProjectId = projects[0].id
        }
      }

      // Load planning and expenses for current project
      await Promise.all([
        planningStore.load(currentProjectId!),
        expenseStore.load(currentProjectId!)
      ])

      // Initialize components
      this.expenseList.init()
      this.planningList.init()
      this.summary.init()
      this.reportSection.init()

      // Hide loading state
      this.hideLoading()

      // Subscribe to store changes for error handling
      this.unsubscribeExpenses = expenseStore.subscribe(() => {
        const { error } = expenseStore.getState()
        if (error) {
          this.showError(error)
        }
      })

      this.unsubscribePlanning = planningStore.subscribe(() => {
        const { error } = planningStore.getState()
        if (error) {
          this.showError(error)
        }
      })

      this.unsubscribeProjects = projectStore.subscribe(async (state) => {
        // Reload data when project changes
        if (state.currentProjectId !== currentProjectId) {
          currentProjectId = state.currentProjectId
          this.showLoading()

          try {
            await Promise.all([
              planningStore.load(currentProjectId!),
              expenseStore.load(currentProjectId!)
            ])
            this.hideLoading()
          } catch (error) {
            console.error('Failed to reload data for project:', error)
            this.showError('Gagal memuat data project')
            this.hideLoading()
          }
        }
      })

      console.log('Application initialized successfully')
    } catch (error) {
      console.error('Failed to initialize with project:', error)
      this.showError('Gagal menginisialisasi aplikasi')
      this.hideLoading()
    }
  }

  private showLoading(): void {
    // Add loading class to body
    document.body.classList.add('loading')

    // Create loading overlay if it doesn't exist
    if (!document.querySelector('.loading-overlay')) {
      const overlay = document.createElement('div')
      overlay.className = 'loading-overlay'
      overlay.innerHTML = '<div class="loading-spinner"></div>'
      document.body.appendChild(overlay)
    }
  }

  private hideLoading(): void {
    // Remove loading class from body
    document.body.classList.remove('loading')

    // Remove loading overlay
    const overlay = document.querySelector('.loading-overlay')
    if (overlay) {
      overlay.remove()
    }
  }

  private showError(message: string): void {
    // Remove existing error messages
    const existingError = document.querySelector('.app-error')
    if (existingError) {
      existingError.remove()
    }

    // Create error message
    const errorDiv = document.createElement('div')
    errorDiv.className = 'app-error'
    errorDiv.textContent = message

    // Insert at the top of container
    const container = document.querySelector('.container')
    if (container) {
      container.insertBefore(errorDiv, container.firstChild)
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      errorDiv.remove()
    }, 5000)
  }

  private showInitializationError(): void {
    this.showError('Gagal memuat data. Silakan refresh halaman.')
  }

  /**
   * Cleanup and destroy application
   */
  destroy(): void {
    this.expenseList.destroy()
    this.planningList.destroy()
    this.summary.destroy()
    this.reportSection.destroy()
    this.navigationManager.destroy()
    this.planningTabManager.destroy()

    if (this.unsubscribeExpenses) {
      this.unsubscribeExpenses()
    }
    if (this.unsubscribePlanning) {
      this.unsubscribePlanning()
    }
    if (this.unsubscribeProjects) {
      this.unsubscribeProjects()
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new App()
    app.init()
  })
} else {
  const app = new App()
  app.init()
}

// Export app for testing purposes
export { App }
