/**
 * NavigationManager Component
 * Handles page switching functionality for bottom navigation
 */
export class NavigationManager {
  private navItems: NodeListOf<HTMLButtonElement>
  private pages: NodeListOf<HTMLElement>
  private currentPage: string

  constructor() {
    this.navItems = document.querySelectorAll('.nav-item')
    this.pages = document.querySelectorAll('.page')
    this.currentPage = 'dashboard'

    this.init()
  }

  /**
   * Initialize navigation manager
   */
  private init(): void {
    this.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const pageName = item.getAttribute('data-page')
        if (pageName) {
          this.navigateTo(pageName)
        }
      })
    })
  }

  /**
   * Navigate to a specific page
   */
  public navigateTo(pageName: string): void {
    // Don't navigate if already on this page
    if (this.currentPage === pageName) {
      return
    }

    // Remove active class from all nav items and pages
    this.navItems.forEach(item => item.classList.remove('active'))
    this.pages.forEach(page => page.classList.remove('active'))

    // Find and activate the clicked nav item
    const activeNav = document.querySelector(`[data-page="${pageName}"]`)
    if (activeNav) {
      activeNav.classList.add('active')
    }

    // Find and activate the corresponding page
    const activePage = document.getElementById(`page-${pageName}`)
    if (activePage) {
      activePage.classList.add('active')
    }

    // Update current page
    this.currentPage = pageName

    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Dispatch navigation event for other components to listen
    this.dispatchNavigationEvent(pageName)
  }

  /**
   * Get the currently active page
   */
  public getCurrentPage(): string {
    return this.currentPage
  }

  /**
   * Programmatically navigate to a page
   */
  public setPage(pageName: string): void {
    this.navigateTo(pageName)
  }

  /**
   * Dispatch custom event when navigation changes
   */
  private dispatchNavigationEvent(pageName: string): void {
    const event = new CustomEvent('pageChange', {
      detail: { page: pageName }
    })
    window.dispatchEvent(event)
  }

  /**
   * Destroy navigation manager and clean up event listeners
   */
  public destroy(): void {
    this.navItems.forEach(item => {
      item.replaceWith(item.cloneNode(true))
    })
  }
}
