import { authStore } from '../stores/AuthStore'
import { authModal } from './AuthModal'
import { authService } from '../services/AuthService'
import type { User } from '../types'

/**
 * AuthButton Component
 * Button untuk login/logout dengan user menu dropdown
 */
export class AuthButton {
  private container: HTMLElement | null = null
  private unsubscribe: (() => void) | null = null

  constructor(containerId: string = 'auth-button-container') {
    this.container = document.getElementById(containerId)
    if (!this.container) {
      // Create container if it doesn't exist
      this.container = document.createElement('div')
      this.container.id = containerId
      this.container.className = 'auth-button-container'
    }

    this.render()
    this.subscribe()
  }

  /**
   * Subscribe to auth state changes
   */
  private subscribe(): void {
    this.unsubscribe = authStore.subscribe(() => {
      this.render()
    })
  }

  /**
   * Render component based on auth state
   */
  private render(): void {
    if (!this.container) return

    const isAuthenticated = authStore.isAuthenticated()
    const user = authStore.getUser()

    if (isAuthenticated && user) {
      this.renderAuthenticated(user)
    } else {
      this.renderUnauthenticated()
    }
  }

  /**
   * Render authenticated state with user menu
   */
  private renderAuthenticated(user: User): void {
    if (!this.container) return

    const userInitials = this.getInitials(user.name)
    const userAvatar = user.avatar_url

    this.container.innerHTML = `
      <div class="auth-button authenticated">
        <div class="user-menu-container">
          <button class="user-avatar-button" onclick="authButton.toggleMenu()" aria-label="User menu">
            ${userAvatar ? `
              <img src="${userAvatar}" alt="${user.name}" class="user-avatar-image">
            ` : `
              <span class="user-avatar-initials">${userInitials}</span>
            `}
            <span class="user-name">${user.name}</span>
            <svg class="dropdown-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor">
              <path d="M2 4l4 4 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <div class="user-dropdown-menu" id="userDropdown" style="display: none;">
            <div class="user-dropdown-header">
              ${userAvatar ? `
                <img src="${userAvatar}" alt="${user.name}" class="user-dropdown-avatar">
              ` : `
                <div class="user-dropdown-initials">${userInitials}</div>
              `}
              <div class="user-dropdown-info">
                <div class="user-dropdown-name">${user.name}</div>
                <div class="user-dropdown-email">${user.email}</div>
              </div>
            </div>

            <div class="user-dropdown-divider"></div>

            <button class="user-dropdown-item" onclick="authButton.handleProfile()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Profile</span>
            </button>

            <button class="user-dropdown-item" onclick="authButton.handleSettings()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"/>
              </svg>
              <span>Settings</span>
            </button>

            <div class="user-dropdown-divider"></div>

            <button class="user-dropdown-item logout" onclick="authButton.handleLogout()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render unauthenticated state with login button
   */
  private renderUnauthenticated(): void {
    if (!this.container) return

    this.container.innerHTML = `
      <div class="auth-button unauthenticated">
        <button class="login-button" onclick="authButton.handleLogin()" aria-label="Login with Google">
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.715H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.159 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          <span>Login</span>
        </button>
      </div>
    `
  }

  /**
   * Get initials from user name
   */
  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  /**
   * Toggle user dropdown menu
   */
  toggleMenu(): void {
    const dropdown = document.getElementById('userDropdown')
    if (dropdown) {
      const isHidden = dropdown.style.display === 'none'
      dropdown.style.display = isHidden ? 'block' : 'none'
    }
  }

  /**
   * Handle login button click
   */
  handleLogin(): void {
    authModal.show()
  }

  /**
   * Handle logout
   */
  async handleLogout(): Promise<void> {
    try {
      await authService.logout()
      this.toggleMenu()
      // Reload page to refresh state
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  /**
   * Handle profile click
   */
  handleProfile(): void {
    this.toggleMenu()
    // TODO: Navigate to profile page
    console.log('Profile clicked')
  }

  /**
   * Handle settings click
   */
  handleSettings(): void {
    this.toggleMenu()
    // TODO: Navigate to settings page
    console.log('Settings clicked')
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  }
}

// Global function for onclick handlers
declare global {
  interface Window {
    authButton: AuthButton
  }
}

// Export singleton instance
export const authButton = new AuthButton()
