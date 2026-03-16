import { getTodayDate } from '../utils/formatters'
import { validateExpenseFormData } from '../utils/validators'
import { expenseStore } from '../stores/ExpenseStore'
import { planningStore } from '../stores/PlanningStore'
import { imageCompressor, ImageCompressor } from '../utils/imageCompressor'
import { attachmentService } from '../services/AttachmentService'

/**
 * Expense Form Component
 * Handles adding new expenses dengan planning categorization
 */
export class ExpenseForm {
  private form!: HTMLFormElement
  private nameInput!: HTMLInputElement
  private amountInput!: HTMLInputElement
  private dateInput!: HTMLInputElement
  private planningSelect!: HTMLSelectElement
  private submitButton!: HTMLButtonElement
  private fileInput!: HTMLInputElement
  private imagePreviewContainer: HTMLElement | null = null
  private pendingUploads: Array<{ file: File; compressed: any }> = []

  constructor() {
    // Defer initialization until form exists
    if (!document.getElementById('expenseForm')) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init())
      } else {
        setTimeout(() => this.init(), 100)
      }
      return
    }

    this.init()
  }

  /**
   * Initialize form after DOM is ready
   */
  private init(): void {
    this.form = document.getElementById('expenseForm') as HTMLFormElement

    if (!this.form) {
      console.warn('⚠️ ExpenseForm: Form still not found, will retry later')
      return
    }

    this.nameInput = document.getElementById('expenseName') as HTMLInputElement
    this.amountInput = document.getElementById('expenseAmount') as HTMLInputElement
    this.dateInput = document.getElementById('expenseDate') as HTMLInputElement
    this.submitButton = this.form.querySelector('button[type="submit"]') as HTMLButtonElement

    // Get or create planning select dropdown
    this.planningSelect = this.getOrCreatePlanningSelect()

    // Create file input and preview container
    this.fileInput = this.createFileInput()
    this.imagePreviewContainer = this.createImagePreviewContainer()

    // Set default date to today
    this.dateInput.value = getTodayDate()

    // Populate planning options
    this.populatePlanningOptions()

    // Attach submit handler
    this.form.addEventListener('submit', this.handleSubmit.bind(this))

    // Attach file input handler
    this.fileInput.addEventListener('change', this.handleFileSelect.bind(this))

    // Subscribe to planning changes untuk update dropdown
    planningStore.subscribe(() => {
      this.populatePlanningOptions()
    })

    // Store instance for debugging
    if (this.form) {
      (this.form as any).__expenseForm__ = this
    }
    console.log('✅ ExpenseForm initialized', {
      form: !!this.form,
      fileInput: !!this.fileInput,
      previewContainer: !!this.imagePreviewContainer
    })
  }

  /**
   * Get or create planning select dropdown
   */
  private getOrCreatePlanningSelect(): HTMLSelectElement {
    let select = document.getElementById('expensePlanning') as HTMLSelectElement

    if (!select) {
      // Create select element
      select = document.createElement('select')
      select.id = 'expensePlanning'
      select.name = 'planning_id'

      // Create label
      const label = document.createElement('label')
      label.textContent = 'Kategori (Opsional)'
      label.setAttribute('for', 'expensePlanning')

      // Insert before submit button
      this.submitButton.parentElement?.insertBefore(label, this.submitButton)
      this.submitButton.parentElement?.insertBefore(select, this.submitButton)
    }

    return select
  }

  /**
   * Create file input for image upload
   */
  private createFileInput(): HTMLInputElement {
    let input = document.getElementById('expenseImage') as HTMLInputElement

    if (!input) {
      // Create file input container
      const container = document.createElement('div')
      container.className = 'file-input-container'

      // Create label
      const label = document.createElement('label')
      label.textContent = 'Foto/Attachment (Opsional)'
      label.setAttribute('for', 'expenseImage')

      // Create file input
      input = document.createElement('input')
      input.type = 'file'
      input.id = 'expenseImage'
      input.name = 'image'
      input.accept = 'image/*'
      input.multiple = true
      input.className = 'file-input'

      // Create help text
      const helpText = document.createElement('small')
      helpText.className = 'help-text'
      helpText.textContent = 'Maksimal 5 gambar. Akan dikompres otomatis seperti WhatsApp.'

      container.appendChild(label)
      container.appendChild(input)
      container.appendChild(helpText)

      // Insert before submit button
      this.submitButton.parentElement?.insertBefore(container, this.submitButton)
    }

    return input
  }

  /**
   * Create image preview container
   */
  private createImagePreviewContainer(): HTMLElement {
    let container = document.getElementById('imagePreviewContainer') as HTMLElement

    if (!container) {
      container = document.createElement('div')
      container.id = 'imagePreviewContainer'
      container.className = 'image-preview-container'

      // Insert before submit button
      this.submitButton.parentElement?.insertBefore(container, this.submitButton)
    }

    return container
  }

  /**
   * Populate planning dropdown dengan options
   */
  private populatePlanningOptions(): void {
    // Clear existing options
    this.planningSelect.innerHTML = ''

    // Add default "Uncategorized" option
    const defaultOption = document.createElement('option')
    defaultOption.value = ''
    defaultOption.textContent = 'Tanpa Kategori (Uncategorized)'
    this.planningSelect.appendChild(defaultOption)

    // Get all planning items
    const { planning } = planningStore.getState()

    // Add planning options
    planning.forEach(item => {
      const option = document.createElement('option')
      option.value = String(item.id!)
      option.textContent = `${item.name} - ${this.formatCurrency(item.amount)}`
      this.planningSelect.appendChild(option)
    })
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault()

    const name = this.nameInput.value.trim()
    const amount = parseFloat(this.amountInput.value)
    const date = this.dateInput.value

    // Get planning_id (empty string means null/uncategorized)
    const planningValue = this.planningSelect.value
    const planning_id = planningValue === '' ? null : parseInt(planningValue)

    // Validate form data
    const validation = validateExpenseFormData({ name, amount, date })

    if (!validation.valid) {
      this.showErrors(validation.errors)
      return
    }

    // Clear previous errors
    this.clearErrors()

    // Disable submit button and show loading state
    this.setLoading(true, 'Menambahkan pengeluaran...')

    try {
      // Add expense through store dengan planning_id (don't reload yet - wait for uploads)
      const expenseId = await expenseStore.add({
        name,
        amount,
        date,
        planning_id
      }, false) // ← Don't reload yet, wait for uploads to complete

      // Upload images if any
      if (this.pendingUploads.length > 0) {
        this.setLoading(true, `Mengupload ${this.pendingUploads.length} gambar...`)
        await this.uploadImages(expenseId)
      }

      // NOW reload the data after everything is complete
      await expenseStore.loadPage()

      // Reset form (but keep date)
      const currentDate = this.dateInput.value
      this.form.reset()
      this.dateInput.value = currentDate
      this.planningSelect.value = '' // Reset to Uncategorized
      this.clearImagePreviews()
      this.pendingUploads = []

      // Show success message
      this.showSuccess('Pengeluaran berhasil ditambahkan!')
    } catch (error) {
      // Show error message
      console.error('Error adding expense:', error)
      this.showError('Gagal menambahkan pengeluaran. Silakan coba lagi.')
    } finally {
      // Re-enable submit button
      this.setLoading(false)
    }
  }

  /**
   * Handle file selection
   */
  private async handleFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files || [])

    if (files.length === 0) {
      return
    }

    console.log(`📁 Selected ${files.length} file(s)`)

    // Validate number of files (max 5)
    if (this.pendingUploads.length + files.length > 5) {
      this.showError('Maksimal 5 gambar yang bisa diupload')
      input.value = ''
      return
    }

    // Compress and preview each image
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (!ImageCompressor.isValidImageFile(file)) {
        this.showError('Hanya file gambar yang diperbolehkan')
        continue
      }

      try {
        console.log(`🔧 Compressing image ${i + 1}/${files.length}: ${file.name} (${ImageCompressor.formatFileSize(file.size)})`)
        const startTime = Date.now()

        const compressed = await imageCompressor.compressImage(file)

        const compressionTime = Date.now() - startTime
        console.log(`✅ Compression completed in ${compressionTime}ms`)
        console.log(`📊 Size: ${ImageCompressor.formatFileSize(compressed.originalSize)} → ${ImageCompressor.formatFileSize(compressed.compressedSize)} (${compressed.compressionRatio.toFixed(1)}% reduction)`)

        this.pendingUploads.push({ file, compressed })
        this.addImagePreview(compressed)
      } catch (error) {
        console.error('❌ Error compressing image:', error)
        this.showError('Gagal memproses gambar. Silakan coba lagi.')
      }
    }

    console.log(`📋 Total pending uploads: ${this.pendingUploads.length}`)

    // Clear input to allow selecting same file again
    input.value = ''
  }

  /**
   * Add image preview to container
   */
  private addImagePreview(compressed: any): void {
    if (!this.imagePreviewContainer) return

    const preview = document.createElement('div')
    preview.className = 'image-preview-item'

    const img = document.createElement('img')
    img.src = compressed.base64
    img.alt = 'Preview'

    const info = document.createElement('div')
    info.className = 'image-preview-info'
    info.innerHTML = `
      <span>${ImageCompressor.formatFileSize(compressed.originalSize)} → ${ImageCompressor.formatFileSize(compressed.compressedSize)}</span>
      <span class="compression-ratio">-${compressed.compressionRatio.toFixed(1)}%</span>
    `

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'remove-image-btn'
    removeBtn.innerHTML = '×'
    removeBtn.onclick = () => {
      const index = this.pendingUploads.findIndex(p => p.compressed === compressed)
      if (index > -1) {
        this.pendingUploads.splice(index, 1)
      }
      preview.remove()
    }

    preview.appendChild(img)
    preview.appendChild(info)
    preview.appendChild(removeBtn)
    this.imagePreviewContainer.appendChild(preview)
  }

  /**
   * Clear all image previews
   */
  private clearImagePreviews(): void {
    if (!this.imagePreviewContainer) return
    this.imagePreviewContainer.innerHTML = ''
  }

  /**
   * Upload images to server
   */
  private async uploadImages(expenseId: number): Promise<void> {
    console.log(`Starting upload of ${this.pendingUploads.length} images for expense ${expenseId}`)

    const uploadPromises = this.pendingUploads.map(async ({ compressed }, index) => {
      try {
        console.log(`Compressing and uploading image ${index + 1}/${this.pendingUploads.length}`)

        // Convert base64 to blob
        const response = await fetch(compressed.base64)
        const blob = await response.blob()

        // Create file from blob
        const file = new File([blob], `image_${Date.now()}.jpg`, {
          type: compressed.mimeType
        })

        console.log(`Uploading file: ${file.name}, size: ${file.size} bytes`)

        // Upload to server
        const result = await attachmentService.upload(expenseId, file, {
          width: compressed.width,
          height: compressed.height,
          originalSize: compressed.originalSize
        })

        console.log(`Upload successful for image ${index + 1}:`, result)
        return result
      } catch (error) {
        console.error(`Failed to upload image ${index + 1}:`, error)
        throw error
      }
    })

    const results = await Promise.all(uploadPromises)
    console.log('All images uploaded successfully:', results)
  }

  private showErrors(errors: Record<string, string>): void {
    this.clearErrors()

    // Show error for each field
    if (errors.name) {
      this.showFieldError(this.nameInput, errors.name)
    }
    if (errors.amount) {
      this.showFieldError(this.amountInput, errors.amount)
    }
    if (errors.date) {
      this.showFieldError(this.dateInput, errors.date)
    }
  }

  private showFieldError(input: HTMLInputElement, message: string): void {
    input.classList.add('error')

    const errorDiv = document.createElement('div')
    errorDiv.className = 'field-error'
    errorDiv.textContent = message

    input.parentElement?.appendChild(errorDiv)
  }

  private clearErrors(): void {
    // Remove error class from inputs
    this.nameInput.classList.remove('error')
    this.amountInput.classList.remove('error')
    this.dateInput.classList.remove('error')
    this.planningSelect.classList.remove('error')

    // Remove all error messages
    const form = this.form
    form.querySelectorAll('.field-error').forEach(el => el.remove())
  }

  private setLoading(loading: boolean, message: string = 'Menambahkan...'): void {
    this.submitButton.disabled = loading
    this.submitButton.textContent = loading ? message : 'Tambah Pengeluaran'
  }

  private showSuccess(message: string): void {
    this.showMessage(message, 'success')
  }

  private showError(message: string): void {
    this.showMessage(message, 'error')
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    // Remove existing messages
    const existingMessage = this.form.querySelector('.form-message')
    if (existingMessage) {
      existingMessage.remove()
    }

    // Create message element
    const messageDiv = document.createElement('div')
    messageDiv.className = `form-message ${type}`
    messageDiv.textContent = message

    // Insert message before form
    this.form.parentElement?.insertBefore(messageDiv, this.form)

    // Auto-remove message after 3 seconds
    setTimeout(() => {
      messageDiv.remove()
    }, 3000)
  }

  /**
   * Reset form to initial state
   */
  reset(): void {
    this.form.reset()
    this.dateInput.value = getTodayDate()
    this.planningSelect.value = ''
    this.clearErrors()
    this.clearImagePreviews()
    this.pendingUploads = []
  }
}
