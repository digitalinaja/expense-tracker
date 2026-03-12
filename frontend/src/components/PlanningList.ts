import { formatCurrency, formatDate } from '../utils/formatters'
import { planningStore } from '../stores/PlanningStore'
import type { Planning } from '../types'

/**
 * Planning List Component
 * Displays list of planning items with delete functionality
 */
export class PlanningList {
  private listElement: HTMLUListElement
  private unsubscribe: (() => void) | null = null

  constructor() {
    this.listElement = document.getElementById('planningList') as HTMLUListElement
  }

  /**
   * Initialize component and subscribe to store updates
   */
  init(): void {
    // Subscribe to planning store changes
    this.unsubscribe = planningStore.subscribe((planning) => {
      this.render(planning)
    })

    // Initial render
    const { planning } = planningStore.getState()
    this.render(planning)
  }

  /**
   * Render planning list
   */
  private render(planning: Planning[]): void {
    // Clear list
    this.listElement.innerHTML = ''

    // Show empty state if no planning items
    if (planning.length === 0) {
      this.showEmptyState(true)
      return
    }

    // Hide empty state and render planning items
    this.showEmptyState(false)
    planning.forEach(item => {
      const listItem = this.createPlanningItem(item)
      this.listElement.appendChild(listItem)
    })
  }

  /**
   * Show or hide empty state
   */
  private showEmptyState(show: boolean): void {
    const emptyState = document.getElementById('planningEmptyState')
    if (emptyState) {
      emptyState.style.display = show ? 'flex' : 'none'
    }
  }

  /**
   * Create planning item element
   */
  private createPlanningItem(planning: Planning): HTMLElement {
    const li = document.createElement('li')
    li.className = 'planning-item'
    li.dataset.id = String(planning.id)

    // Create item content
    const content = document.createElement('div')
    content.className = 'planning-item-content'

    const name = document.createElement('div')
    name.className = 'planning-item-name'
    name.textContent = planning.name

    const details = document.createElement('div')
    details.className = 'planning-item-details'

    const amount = document.createElement('span')
    amount.className = 'planning-item-amount'
    amount.textContent = formatCurrency(planning.amount)

    const date = document.createElement('span')
    date.className = 'planning-item-date'
    date.textContent = formatDate(planning.date)

    details.appendChild(amount)
    details.appendChild(date)

    content.appendChild(name)
    content.appendChild(details)

    // Create delete button
    const deleteButton = document.createElement('button')
    deleteButton.className = 'planning-item-delete icon-btn'
    deleteButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`
    deleteButton.title = 'Hapus'
    deleteButton.type = 'button'
    deleteButton.onclick = () => this.handleDelete(planning.id!)

    li.appendChild(content)
    li.appendChild(deleteButton)

    return li
  }

  /**
   * Handle delete planning item
   */
  private async handleDelete(id: number): Promise<void> {
    // Confirm delete
    const confirmed = confirm('Yakin ingin menghapus perencanaan ini?')
    if (!confirmed) return

    try {
      await planningStore.delete(id)
      // Show success message (optional)
      this.showDeleteSuccess()
    } catch (error) {
      // Show error message
      this.showDeleteError()
    }
  }

  private showDeleteSuccess(): void {
    // Optional: Show success message
    console.log('Planning item deleted successfully')
  }

  private showDeleteError(): void {
    // Optional: Show error message
    console.error('Failed to delete planning item')
  }

  /**
   * Cleanup and unsubscribe
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  }
}
