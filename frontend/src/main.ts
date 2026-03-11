import { ExpenseForm } from './components/ExpenseForm'
import { PlanningForm } from './components/PlanningForm'
import { ExpenseList } from './components/ExpenseList'
import { PlanningList } from './components/PlanningList'
import { Summary } from './components/Summary'
import { ReportSection } from './components/ReportSection'
import { TabManager } from './components/TabManager'
import { NavigationManager } from './components/NavigationManager'
import { expenseStore } from './stores/ExpenseStore'
import { planningStore } from './stores/PlanningStore'

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

  constructor() {
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

      // Load initial data from API
      await Promise.all([
        expenseStore.load(),
        planningStore.load()
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

      console.log('Application initialized successfully')
    } catch (error) {
      console.error('Failed to initialize application:', error)
      this.showInitializationError()
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
