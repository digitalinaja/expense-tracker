import { formatCurrency, formatDate } from '../utils/formatters'
import { expenseStore } from '../stores/ExpenseStore'
import { attachmentService } from '../services/AttachmentService'
import type { Expense, Attachment } from '../types'

/**
 * Expense List Component
 * Displays list of expenses with delete functionality
 */
export class ExpenseList {
  private listElement: HTMLUListElement
  private unsubscribe: (() => void) | null = null
  private expenseAttachments: Map<number, Attachment[]> = new Map()

  constructor() {
    this.listElement = document.getElementById('expenseList') as HTMLUListElement
  }

  /**
   * Initialize component and subscribe to store updates
   */
  init(): void {
    // Subscribe to expense store changes
    this.unsubscribe = expenseStore.subscribe((expenses) => {
      this.render(expenses)
    })

    // Initial render
    const { expenses } = expenseStore.getState()
    this.render(expenses)
  }

  /**
   * Render expense list
   */
  private render(expenses: Expense[]): void {
    // Clear list
    this.listElement.innerHTML = ''

    // Show empty state if no expenses
    if (expenses.length === 0) {
      this.showEmptyState(true)
      return
    }

    // Hide empty state and render expenses
    this.showEmptyState(false)
    expenses.forEach(expense => {
      const listItem = this.createExpenseItem(expense)
      this.listElement.appendChild(listItem)
    })

    // Load attachments for each expense
    this.loadAttachments(expenses)
  }

  /**
   * Load attachments for expenses
   */
  private async loadAttachments(expenses: Expense[]): Promise<void> {
    for (const expense of expenses) {
      if (expense.id) {
        try {
          const attachments = await attachmentService.getByExpenseId(expense.id)
          this.expenseAttachments.set(expense.id, attachments)

          // Update the expense item with attachment thumbnails
          this.updateExpenseAttachments(expense.id, attachments)
        } catch (error) {
          console.error('Failed to load attachments:', error)
        }
      }
    }
  }

  /**
   * Update expense item with attachment thumbnails
   */
  private updateExpenseAttachments(expenseId: number, attachments: Attachment[]): void {
    const expenseItem = this.listElement.querySelector(`[data-id="${expenseId}"]`)
    if (!expenseItem) return

    const existingAttachments = expenseItem.querySelector('.expense-attachments')
    if (existingAttachments) {
      existingAttachments.remove()
    }

    if (attachments.length === 0) return

    const attachmentsContainer = document.createElement('div')
    attachmentsContainer.className = 'expense-attachments'

    attachments.forEach(attachment => {
      const thumbnail = document.createElement('div')
      thumbnail.className = 'expense-attachment-thumbnail'
      thumbnail.title = attachment.original_file_name

      const img = document.createElement('img')
      img.alt = attachment.original_file_name
      img.loading = 'lazy'

      // Fetch image with auth headers (img.src can't send Authorization header)
      attachmentService.getFileBlobUrl(attachment.id!).then(blobUrl => {
        img.src = blobUrl
      }).catch(err => {
        console.error('Failed to load attachment image:', err)
        img.alt = '❌ ' + attachment.original_file_name
      })

      img.onclick = () => {
        if (img.src) this.showLightbox(img.src)
      }

      thumbnail.appendChild(img)
      attachmentsContainer.appendChild(thumbnail)
    })

    const content = expenseItem.querySelector('.expense-item-content')
    if (content) {
      content.appendChild(attachmentsContainer)
    }
  }

  /**
   * Show image lightbox
   */
  private showLightbox(src: string): void {
    // Remove existing lightbox
    const existingLightbox = document.querySelector('.image-lightbox')
    if (existingLightbox) {
      existingLightbox.remove()
    }

    const lightbox = document.createElement('div')
    lightbox.className = 'image-lightbox'

    const img = document.createElement('img')
    img.src = src

    const closeBtn = document.createElement('button')
    closeBtn.className = 'image-lightbox-close'
    closeBtn.innerHTML = '×'
    closeBtn.onclick = () => lightbox.remove()

    lightbox.appendChild(img)
    lightbox.appendChild(closeBtn)

    document.body.appendChild(lightbox)

    // Close on background click
    lightbox.onclick = (e) => {
      if (e.target === lightbox) {
        lightbox.remove()
      }
    }
  }

  /**
   * Show or hide empty state
   */
  private showEmptyState(show: boolean): void {
    const emptyState = document.getElementById('expenseEmptyState')
    if (emptyState) {
      emptyState.style.display = show ? 'flex' : 'none'
    }
  }

  /**
   * Create expense item element
   */
  private createExpenseItem(expense: Expense): HTMLElement {
    const li = document.createElement('li')
    li.className = 'expense-item'
    li.dataset.id = String(expense.id)

    // Create item content
    const content = document.createElement('div')
    content.className = 'expense-item-content'

    const name = document.createElement('div')
    name.className = 'expense-item-name'

    // Add expense name
    const nameText = document.createElement('span')
    nameText.textContent = expense.name
    name.appendChild(nameText)

    // Add category badge if categorized
    if (expense.planning_name) {
      const categoryBadge = document.createElement('span')
      categoryBadge.className = 'category-badge'
      categoryBadge.textContent = expense.planning_name
      categoryBadge.title = `Kategori: ${expense.planning_name}`
      name.appendChild(categoryBadge)
    } else {
      // Show uncategorized badge
      const uncategorizedBadge = document.createElement('span')
      uncategorizedBadge.className = 'category-badge uncategorized'
      uncategorizedBadge.textContent = 'Uncategorized'
      name.appendChild(uncategorizedBadge)
    }

    // Add attachment count if has attachments
    if (expense.attachments && expense.attachments.length > 0) {
      const attachmentCount = document.createElement('span')
      attachmentCount.className = 'attachment-count'
      attachmentCount.innerHTML = `📎 ${expense.attachments.length}`
      name.appendChild(attachmentCount)
    }

    const details = document.createElement('div')
    details.className = 'expense-item-details'

    const amount = document.createElement('span')
    amount.className = 'expense-item-amount'
    amount.textContent = formatCurrency(expense.amount)

    const date = document.createElement('span')
    date.className = 'expense-item-date'
    date.textContent = formatDate(expense.date)

    details.appendChild(amount)
    details.appendChild(date)

    content.appendChild(name)
    content.appendChild(details)

    // Create delete button
    const deleteButton = document.createElement('button')
    deleteButton.className = 'expense-item-delete icon-btn'
    deleteButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`
    deleteButton.title = 'Hapus'
    deleteButton.type = 'button'
    deleteButton.onclick = () => this.handleDelete(expense.id!)

    li.appendChild(content)
    li.appendChild(deleteButton)

    return li
  }

  /**
   * Handle delete expense
   */
  private async handleDelete(id: number): Promise<void> {
    // Confirm delete
    const confirmed = confirm('Yakin ingin menghapus pengeluaran ini?')
    if (!confirmed) return

    try {
      await expenseStore.delete(id)
      // Show success message (optional)
      this.showDeleteSuccess()
    } catch (error) {
      // Show error message
      this.showDeleteError()
    }
  }

  private showDeleteSuccess(): void {
    // Optional: Show success message
    console.log('Expense deleted successfully')
  }

  private showDeleteError(): void {
    // Optional: Show error message
    console.error('Failed to delete expense')
  }

  /**
   * Cleanup and unsubscribe
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
    }

    // Remove lightbox if exists
    const lightbox = document.querySelector('.image-lightbox')
    if (lightbox) {
      lightbox.remove()
    }
  }
}
