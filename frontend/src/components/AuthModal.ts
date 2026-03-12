import { authService } from '../services/AuthService'
import { authStore } from '../stores/AuthStore'

/**
 * AuthModal Component
 * Modal untuk Google Sign-In authentication using backend OAuth flow
 */
export class AuthModal {
  private modal: HTMLElement | null = null
  private isOpen: boolean = false

  constructor() {
    this.createModal()
    this.setupOAuthHandler()
  }

  /**
   * Create modal HTML structure
   */
  private createModal(): void {
    // Check if modal already exists
    this.modal = document.getElementById('authModal')
    if (this.modal) return

    // Create modal
    this.modal = document.createElement('div')
    this.modal.id = 'authModal'
    this.modal.className = 'auth-modal'
    this.modal.innerHTML = `
      <div class="auth-modal-backdrop"></div>
      <div class="auth-modal-content">
        <div class="auth-modal-header">
          <h2>Selamat Datang!</h2>
          <button class="auth-modal-close" onclick="authModal.close()">&times;</button>
        </div>
        <div class="auth-modal-body">
          <div class="auth-modal-icon">📊</div>
          <p class="auth-modal-description">
            Login untuk mengelola project-plan-expenses Anda dan berkolaborasi dengan tim.
          </p>

          <div id="auth-error" class="auth-error" style="display: none;"></div>

          <a id="google-signin-button" class="google-signin-button" href="#">
            <div class="google-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.715H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.159 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            </div>
            <span>Sign in with Google</span>
          </a>

          <p class="auth-terms">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    `

    document.body.appendChild(this.modal)

    // Setup backdrop click to close
    const backdrop = this.modal.querySelector('.auth-modal-backdrop')
    if (backdrop) {
      backdrop.addEventListener('click', () => this.close())
    }

    // Setup ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close()
      }
    })
  }

  /**
   * Setup OAuth button handler
   */
  private setupOAuthHandler(): void {
    const button = document.getElementById('google-signin-button')
    if (!button) return

    button.addEventListener('click', (e) => {
      e.preventDefault()

      // Store current URL for redirect after login
      const currentUrl = window.location.origin + window.location.pathname
      localStorage.setItem('auth_redirect', currentUrl)

      // Redirect to backend OAuth endpoint
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787'
      const oauthUrl = `${apiBaseUrl}/auth/google?redirect_uri=${encodeURIComponent(currentUrl)}`

      window.location.href = oauthUrl
    })
  }

  /**
   * Handle OAuth callback from URL hash
   */
  private async handleOAuthCallback(): Promise<void> {
    const hash = window.location.hash
    if (!hash || !hash.includes('token')) {
      return
    }

    try {
      console.log('Handling OAuth callback...')

      // Parse token from hash
      const params = new URLSearchParams(hash.substring(1))
      const token = params.get('token')
      const refreshToken = params.get('refreshToken')
      const userId = params.get('userId')

      console.log('Token received:', { hasToken: !!token, hasRefreshToken: !!refreshToken, userId })

      if (!token || !refreshToken || !userId) {
        throw new Error('Missing authentication parameters')
      }

      // Fetch user info from backend FIRST
      try {
        const user = await authService.getCurrentUser()

        console.log('User info fetched:', user)

        // Store user data and tokens in auth store
        await authStore.login(user, token, refreshToken)

        console.log('User logged in successfully')
      } catch (error) {
        console.error('Failed to fetch user info:', error)

        // If we can't fetch user info, at least store the tokens
        await authStore.login(
          {
            id: parseInt(userId),
            email: '',
            name: ''
          },
          token,
          refreshToken
        )
      }

      // Clear hash
      window.location.hash = ''

      console.log('OAuth callback completed, reloading page...')

      // Reload page to refresh state
      setTimeout(() => {
        window.location.reload()
      }, 100)
    } catch (error) {
      console.error('OAuth callback error:', error)
      this.showError('Authentication failed')
    }
  }

  /**
   * Show modal
   */
  show(): void {
    if (!this.modal) return

    // Check if already authenticated
    if (authStore.isAuthenticated()) {
      return
    }

    this.isOpen = true
    this.modal.style.display = 'flex'
    document.body.style.overflow = 'hidden' // Prevent background scrolling
  }

  /**
   * Close modal
   */
  close(): void {
    if (!this.modal) return

    this.isOpen = false
    this.modal.style.display = 'none'
    document.body.style.overflow = '' // Restore scrolling
    this.hideError()
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const errorEl = document.getElementById('auth-error')
    if (errorEl) {
      errorEl.textContent = message
      errorEl.style.display = 'block'
    }
  }

  /**
   * Hide error message
   */
  private hideError(): void {
    const errorEl = document.getElementById('auth-error')
    if (errorEl) {
      errorEl.style.display = 'none'
    }
  }

  /**
   * Check if user needs to login
   * Show modal if not authenticated
   */
  async checkAuth(): Promise<void> {
    // First check for OAuth callback
    await this.handleOAuthCallback()

    // Wait a bit for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 200))

    // Then check if authenticated
    if (!authStore.isAuthenticated()) {
      // Check for error in URL
      const urlParams = new URLSearchParams(window.location.search)
      const error = urlParams.get('error')

      if (error) {
        this.showError(`Authentication error: ${error}`)
        // Clear error from URL
        window.history.replaceState({}, '', window.location.pathname)
      }

      this.show()
    } else {
      console.log('User is authenticated, skipping auth modal')
    }
  }
}

// Export singleton instance
export const authModal = new AuthModal()
