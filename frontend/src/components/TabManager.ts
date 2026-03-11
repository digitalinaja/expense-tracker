/**
 * TabManager Component
 * Handles tab switching functionality for the application
 */
export class TabManager {
  private tabButtons: NodeListOf<HTMLButtonElement>
  private tabContents: NodeListOf<HTMLElement>
  private container: HTMLElement

  constructor(containerSelector: string) {
    this.container = document.querySelector(containerSelector) as HTMLElement
    if (!this.container) {
      throw new Error(`Container ${containerSelector} not found`)
    }

    this.tabButtons = this.container.querySelectorAll('.tab-btn')
    this.tabContents = this.container.querySelectorAll('.tab-content')

    this.init()
  }

  /**
   * Initialize tab manager
   */
  private init(): void {
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab')
        if (tabName) {
          this.switchTab(tabName)
        }
      })
    })
  }

  /**
   * Switch to a specific tab
   */
  private switchTab(tabName: string): void {
    // Remove active class from all buttons and contents
    this.tabButtons.forEach(btn => btn.classList.remove('active'))
    this.tabContents.forEach(content => content.classList.remove('active'))

    // Find and activate the clicked button
    const activeButton = this.container.querySelector(`[data-tab="${tabName}"]`)
    if (activeButton) {
      activeButton.classList.add('active')
    }

    // Find and activate the corresponding content
    const activeContent = document.getElementById(`${tabName}-tab`)
    if (activeContent) {
      activeContent.classList.add('active')
    }
  }

  /**
   * Get the currently active tab
   */
  getActiveTab(): string | null {
    const activeButton = this.container.querySelector('.tab-btn.active')
    return activeButton?.getAttribute('data-tab') || null
  }

  /**
   * Programmatically switch to a tab
   */
  setActiveTab(tabName: string): void {
    this.switchTab(tabName)
  }

  /**
   * Destroy tab manager and clean up event listeners
   */
  destroy(): void {
    this.tabButtons.forEach(button => {
      button.replaceWith(button.cloneNode(true))
    })
  }
}
