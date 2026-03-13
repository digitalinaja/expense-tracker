import { formatCurrency, formatDate } from '../utils/formatters'
import { expenseStore } from '../stores/ExpenseStore'
import { planningStore } from '../stores/PlanningStore'
import { attachmentService } from '../services/AttachmentService'
import type { Expense, Attachment } from '../types'

/**
 * Expense List Component
 * Displays list of expenses with search, category filter,
 * infinite scroll, and delete functionality
 */
export class ExpenseList {
  private listElement!: HTMLUListElement
  private unsubscribe: (() => void) | null = null
  private unsubscribePlanning: (() => void) | null = null
  private expenseAttachments: Map<number, Attachment[]> = new Map()

  // Search & filter elements
  private searchInput!: HTMLInputElement
  private chipContainer!: HTMLElement
  private activeFilterValue: string = ''
  private resultCount!: HTMLElement

  // Infinite scroll
  private sentinelElement!: HTMLElement
  private scrollObserver: IntersectionObserver | null = null
  private scrollLoader!: HTMLElement

  // Debounce timer
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.listElement = document.getElementById('expenseList') as HTMLUListElement
  }

  /**
   * Initialize component and subscribe to store updates
   */
  init(): void {
    // Create toolbar elements
    this.createToolbar()

    // Create scroll loader and sentinel
    this.createScrollElements()

    // Subscribe to expense store changes
    this.unsubscribe = expenseStore.subscribe(() => {
      const state = expenseStore.getState()
      this.render(state.expenses)
      this.updateResultCount(state.total, state.expenses.length)
      this.updateScrollLoader(state.loadingMore)
      this.updateSentinel(state.hasMore)
    })

    // Subscribe to planning store for category filter options
    this.unsubscribePlanning = planningStore.subscribe(() => {
      this.populateCategoryFilter()
    })

    // Populate initial category filter
    this.populateCategoryFilter()

    // Load first page
    expenseStore.loadPage()

    // Set up infinite scroll
    this.setupInfiniteScroll()
  }

  /**
   * Create search & filter toolbar
   */
  private createToolbar(): void {
    const historySection = this.listElement.closest('.history-section')
    if (!historySection) return

    // Check if toolbar already exists
    if (historySection.querySelector('.history-toolbar')) return

    const toolbar = document.createElement('div')
    toolbar.className = 'history-toolbar'

    // Search box
    const searchBox = document.createElement('div')
    searchBox.className = 'search-box'

    const searchIcon = document.createElement('span')
    searchIcon.className = 'search-icon'
    searchIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`

    this.searchInput = document.createElement('input')
    this.searchInput.type = 'text'
    this.searchInput.id = 'expenseSearch'
    this.searchInput.placeholder = 'Cari pengeluaran...'
    this.searchInput.addEventListener('input', () => this.handleSearchInput())

    searchBox.appendChild(searchIcon)
    searchBox.appendChild(this.searchInput)

    // Category chip container
    this.chipContainer = document.createElement('div')
    this.chipContainer.className = 'filter-chips'

    // Result count
    this.resultCount = document.createElement('div')
    this.resultCount.className = 'result-count'
    this.resultCount.style.display = 'none'

    toolbar.appendChild(searchBox)
    toolbar.appendChild(this.chipContainer)

    // Insert toolbar before the list
    const pageHeader = historySection.previousElementSibling
    if (pageHeader && pageHeader.classList.contains('page-header')) {
      pageHeader.after(toolbar)
      toolbar.after(this.resultCount)
    } else {
      historySection.insertBefore(this.resultCount, historySection.firstChild)
      historySection.insertBefore(toolbar, historySection.firstChild)
    }
  }

  /**
   * Populate category filter chips from planning store
   */
  private populateCategoryFilter(): void {
    if (!this.chipContainer) return

    this.chipContainer.innerHTML = ''

    // "Semua" chip (default active)
    this.chipContainer.appendChild(this.createChip('Semua', '', this.activeFilterValue === ''))

    // "Tanpa Kategori" chip
    this.chipContainer.appendChild(this.createChip('Tanpa Kategori', 'uncategorized', this.activeFilterValue === 'uncategorized'))

    // Planning category chips
    const { planning } = planningStore.getState()
    planning.forEach(p => {
      this.chipContainer.appendChild(this.createChip(p.name, String(p.id), this.activeFilterValue === String(p.id)))
    })
  }

  /**
   * Create a filter chip element
   */
  private createChip(label: string, value: string, active: boolean): HTMLElement {
    const chip = document.createElement('button')
    chip.className = `filter-chip${active ? ' active' : ''}`
    chip.textContent = label
    chip.type = 'button'
    chip.dataset.value = value

    chip.addEventListener('click', () => {
      this.activeFilterValue = value
      // Update active state on all chips
      this.chipContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'))
      chip.classList.add('active')
      this.handleFilterChange()
    })

    return chip
  }

  /**
   * Handle search input with debounce
   */
  private handleSearchInput(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer)
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.applyFilters()
    }, 300)
  }

  /**
   * Handle category filter change
   */
  private handleFilterChange(): void {
    this.applyFilters()
  }

  /**
   * Apply current search and filter to store
   */
  private applyFilters(): void {
    const search = this.searchInput?.value || ''

    let planningId: number | 'uncategorized' | undefined
    if (this.activeFilterValue === 'uncategorized') {
      planningId = 'uncategorized'
    } else if (this.activeFilterValue) {
      planningId = parseInt(this.activeFilterValue)
    }

    expenseStore.loadPage(search, planningId)
  }

  /**
   * Create scroll loader and sentinel elements
   */
  private createScrollElements(): void {
    const historySection = this.listElement.closest('.history-section')
    if (!historySection) return

    // Scroll loader (spinner)
    if (!historySection.querySelector('.scroll-loader')) {
      this.scrollLoader = document.createElement('div')
      this.scrollLoader.className = 'scroll-loader'
      this.scrollLoader.innerHTML = '<div class="scroll-spinner"></div><span>Memuat data...</span>'
      this.scrollLoader.style.display = 'none'
      historySection.appendChild(this.scrollLoader)
    }

    // Sentinel element (invisible trigger for IntersectionObserver)
    if (!historySection.querySelector('.scroll-sentinel')) {
      this.sentinelElement = document.createElement('div')
      this.sentinelElement.className = 'scroll-sentinel'
      historySection.appendChild(this.sentinelElement)
    }
  }

  /**
   * Setup IntersectionObserver for infinite scroll
   */
  private setupInfiniteScroll(): void {
    if (!this.sentinelElement) return

    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const state = expenseStore.getState()
            if (state.hasMore && !state.loadingMore && !state.loading) {
              expenseStore.loadMore()
            }
          }
        })
      },
      {
        rootMargin: '200px'
      }
    )

    this.scrollObserver.observe(this.sentinelElement)
  }

  /**
   * Update result count display
   */
  private updateResultCount(total: number, shown: number): void {
    if (!this.resultCount) return

    const state = expenseStore.getState()
    const hasFilters = state.searchQuery || state.filterPlanningId !== undefined

    if (hasFilters || total > 0) {
      this.resultCount.style.display = 'block'
      if (hasFilters) {
        this.resultCount.textContent = `Menampilkan ${shown} dari ${total} pengeluaran`
      } else {
        this.resultCount.textContent = `${total} pengeluaran`
      }
    } else {
      this.resultCount.style.display = 'none'
    }
  }

  /**
   * Update scroll loader visibility
   */
  private updateScrollLoader(loading: boolean): void {
    if (this.scrollLoader) {
      this.scrollLoader.style.display = loading ? 'flex' : 'none'
    }
  }

  /**
   * Update sentinel visibility
   */
  private updateSentinel(hasMore: boolean): void {
    if (this.sentinelElement) {
      this.sentinelElement.style.display = hasMore ? 'block' : 'none'
    }
  }

  /**
   * Render expense list
   */
  private render(expenses: Expense[]): void {
    const state = expenseStore.getState()

    // Only clear and re-render when it's a fresh load (not loadMore)
    if (!state.loadingMore) {
      // Clear list
      this.listElement.innerHTML = ''

      // Show empty state if no expenses
      if (expenses.length === 0 && !state.loading) {
        this.showEmptyState(true, !!state.searchQuery || state.filterPlanningId !== undefined)
        return
      }

      // Hide empty state and render all expenses
      this.showEmptyState(false)
      expenses.forEach(expense => {
        const listItem = this.createExpenseItem(expense)
        this.listElement.appendChild(listItem)
      })
    } else {
      // Append only new items (loadMore case)
      // The new items are at the end of the array
      const existingCount = this.listElement.children.length
      const newExpenses = expenses.slice(existingCount)
      newExpenses.forEach(expense => {
        const listItem = this.createExpenseItem(expense)
        this.listElement.appendChild(listItem)
      })
    }

    // Load attachments for displayed expenses
    this.loadAttachments(expenses)
  }

  /**
   * Load attachments for expenses
   */
  private async loadAttachments(expenses: Expense[]): Promise<void> {
    for (const expense of expenses) {
      if (expense.id && !this.expenseAttachments.has(expense.id)) {
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
  private showEmptyState(show: boolean, hasFilters: boolean = false): void {
    const emptyState = document.getElementById('expenseEmptyState')
    if (emptyState) {
      emptyState.style.display = show ? 'flex' : 'none'
      if (show && hasFilters) {
        emptyState.innerHTML = `
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p>Tidak ditemukan pengeluaran yang cocok</p>
        `
      } else if (show) {
        emptyState.innerHTML = `
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4"/>
            <polyline points="9 12 12 15 15 12"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <p>Belum ada pengeluaran</p>
        `
      }
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
    console.log('Expense deleted successfully')
  }

  private showDeleteError(): void {
    console.error('Failed to delete expense')
  }

  /**
   * Cleanup and unsubscribe
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    if (this.unsubscribePlanning) {
      this.unsubscribePlanning()
    }
    if (this.scrollObserver) {
      this.scrollObserver.disconnect()
    }
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer)
    }

    // Remove lightbox if exists
    const lightbox = document.querySelector('.image-lightbox')
    if (lightbox) {
      lightbox.remove()
    }
  }
}
