import { formatCurrency } from '../utils/formatters'
import { reportStore } from '../stores/ReportStore'
import { projectStore } from '../stores/ProjectStore'
import type { CategoryReport } from '../types'

/**
 * ReportSection Component
 * Displays categorized expense reports dengan budget tracking
 */
export class ReportSection {
  private container: HTMLElement | null = null
  private unsubscribe: (() => void) | null = null
  private unsubscribeProject: (() => void) | null = null

  constructor() {
    // Find or create report section container
    this.container = this.getOrCreateContainer()
  }

  /**
   * Get or create report section container in DOM
   */
  private getOrCreateContainer(): HTMLElement | null {
    let container = document.getElementById('categoryReportSection')

    if (!container) {
      // Try to insert after summary section
      const summarySection = document.querySelector('.summary-section')
      if (summarySection && summarySection.parentElement) {
        container = document.createElement('div')
        container.id = 'categoryReportSection'
        container.className = 'report-section'

        // Insert after summary section
        summarySection.parentElement.insertBefore(
          container,
          summarySection.nextSibling
        )
      }
    }

    return container
  }

  /**
   * Initialize component and subscribe to report store
   */
  init(): void {
    if (!this.container) return

    // Subscribe to report store changes
    this.unsubscribe = reportStore.subscribe((report) => {
      if (report) {
        this.render(report)
      }
    })

    // Subscribe to project store changes to reload report when project changes
    this.unsubscribeProject = projectStore.subscribe(async () => {
      // Reload report when project changes
      await this.loadReport()
    })

    // Initial load
    this.loadReport()
  }

  /**
   * Load report data for current project
   */
  async loadReport(): Promise<void> {
    try {
      const currentProjectId = projectStore.getCurrentProjectId()
      await reportStore.load(currentProjectId ?? undefined)
    } catch (error) {
      console.error('Failed to load report:', error)
      this.renderError()
    }
  }

  /**
   * Render full report
   */
  private render(report: { categorized: CategoryReport[]; uncategorized: { total_amount: number; count: number } }): void {
    if (!this.container) return

    this.container.innerHTML = ''

    // Create section header
    const header = document.createElement('h2')
    header.textContent = 'Laporan Per Kategori'
    this.container.appendChild(header)

    // Render categorized reports
    if (report.categorized.length > 0) {
      report.categorized.forEach(categoryReport => {
        const card = this.createCategoryCard(categoryReport)
        this.container?.appendChild(card)
      })
    } else {
      this.renderNoCategoriesMessage()
    }

    // Render uncategorized section
    if (report.uncategorized.count > 0) {
      const uncategorizedCard = this.createUncategorizedCard(report.uncategorized)
      this.container?.appendChild(uncategorizedCard)
    }
  }

  /**
   * Create category report card
   */
  private createCategoryCard(report: CategoryReport): HTMLElement {
    const card = document.createElement('div')
    card.className = 'category-card'

    // Determine color based on percentage
    const colorClass = this.getColorClass(report.percentage_used)

    // Header
    const header = document.createElement('div')
    header.className = 'category-card-header'

    const name = document.createElement('h3')
    name.className = 'category-name'
    name.textContent = report.planning_name

    const percentage = document.createElement('span')
    percentage.className = `category-percentage ${colorClass}`
    percentage.textContent = `${report.percentage_used.toFixed(1)}%`

    header.appendChild(name)
    header.appendChild(percentage)

    // Details
    const details = document.createElement('div')
    details.className = 'category-card-details'

    const budgetInfo = this.createDetailRow('Budget', formatCurrency(report.budget_amount))
    const actualInfo = this.createDetailRow('Actual', formatCurrency(report.actual_amount))
    const remainingInfo = this.createDetailRow(
      'Sisa',
      formatCurrency(Math.abs(report.remaining)),
      report.remaining < 0 ? 'negative' : 'positive'
    )

    details.appendChild(budgetInfo)
    details.appendChild(actualInfo)
    details.appendChild(remainingInfo)

    // Progress bar
    const progressBar = this.createProgressBar(report.percentage_used, colorClass)

    card.appendChild(header)
    card.appendChild(details)
    card.appendChild(progressBar)

    return card
  }

  /**
   * Create detail row
   */
  private createDetailRow(label: string, value: string, type: 'positive' | 'negative' | 'neutral' = 'neutral'): HTMLElement {
    const row = document.createElement('div')
    row.className = 'detail-row'

    const labelSpan = document.createElement('span')
    labelSpan.className = 'detail-label'
    labelSpan.textContent = label

    const valueSpan = document.createElement('span')
    valueSpan.className = `detail-value ${type}`
    valueSpan.textContent = value

    row.appendChild(labelSpan)
    row.appendChild(valueSpan)

    return row
  }

  /**
   * Create progress bar
   */
  private createProgressBar(percentage: number, colorClass: string): HTMLElement {
    const container = document.createElement('div')
    container.className = 'progress-container'

    const bar = document.createElement('div')
    bar.className = `progress-bar ${colorClass}`
    bar.style.width = `${Math.min(percentage, 100)}%`

    if (percentage > 100) {
      bar.style.width = '100%'
      bar.classList.add('over-budget')
    }

    container.appendChild(bar)
    return container
  }

  /**
   * Create uncategorized card
   */
  private createUncategorizedCard(uncategorized: { total_amount: number; count: number }): HTMLElement {
    const card = document.createElement('div')
    card.className = 'category-card uncategorized'

    const header = document.createElement('div')
    header.className = 'category-card-header'

    const title = document.createElement('h3')
    title.className = 'category-name'
    title.textContent = 'Uncategorized'

    const count = document.createElement('span')
    count.className = 'category-count'
    count.textContent = `${uncategorized.count} item${uncategorized.count > 1 ? 's' : ''}`

    header.appendChild(title)
    header.appendChild(count)

    const details = document.createElement('div')
    details.className = 'category-card-details'

    const totalInfo = this.createDetailRow(
      'Total Pengeluaran',
      formatCurrency(uncategorized.total_amount)
    )

    details.appendChild(totalInfo)

    card.appendChild(header)
    card.appendChild(details)

    return card
  }

  /**
   * Get color class based on percentage
   */
  private getColorClass(percentage: number): string {
    if (percentage < 50) return 'good'
    if (percentage < 80) return 'warning'
    return 'danger'
  }

  /**
   * Render no categories message
   */
  private renderNoCategoriesMessage(): void {
    if (!this.container) return

    const message = document.createElement('div')
    message.className = 'no-categories-message'
    message.textContent = 'Belum ada kategori perencanaan'

    this.container.appendChild(message)
  }

  /**
   * Render error message
   */
  private renderError(): void {
    if (!this.container) return

    this.container.innerHTML = ''

    const errorMessage = document.createElement('div')
    errorMessage.className = 'report-error'
    errorMessage.textContent = 'Gagal memuat laporan. Silakan coba lagi.'

    this.container.appendChild(errorMessage)

    // Add retry button
    const retryButton = document.createElement('button')
    retryButton.textContent = 'Coba Lagi'
    retryButton.onclick = () => this.loadReport()

    this.container.appendChild(retryButton)
  }

  /**
   * Refresh report data
   */
  refresh(): void {
    this.loadReport()
  }

  /**
   * Cleanup and unsubscribe
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    if (this.unsubscribeProject) {
      this.unsubscribeProject()
    }
  }
}
