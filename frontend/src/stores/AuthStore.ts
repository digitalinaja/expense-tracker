import type { User, AuthState } from '../types'
import { isTokenExpired } from '../utils/jwt'

/**
 * Store untuk authentication state management
 * Menggunakan Observer pattern untuk reactive updates
 */
export class AuthStore {
  private user: User | null = null
  private token: string | null = null
  private refreshToken: string | null = null
  private listeners: Array<(state: AuthState) => void> = []
  private loading: boolean = false
  private error: string | null = null
  private readonly STORAGE_KEY_USER = 'auth_user'
  private readonly STORAGE_KEY_TOKEN = 'auth_token'
  private readonly STORAGE_KEY_REFRESH = 'auth_refresh_token'

  constructor() {
    // Restore auth state from localStorage on init
    this.restoreFromStorage()

    // Check jika token expired pada init
    this.checkTokenExpiration()
  }

  /**
   * Check jika access token expired
   */
  private checkTokenExpiration(): void {
    if (this.token && isTokenExpired(this.token)) {
      console.log('Access token expired on init')
      this.error = 'Session expired'
      // Token will be refreshed by ApiHandler on first API call
    }
  }

  /**
   * Subscribe ke state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener)
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  /**
   * Notify semua listeners dari state change
   */
  private notify(): void {
    const state: AuthState = {
      user: this.user,
      token: this.token,
      isAuthenticated: this.isAuthenticated()
    }
    this.listeners.forEach(listener => listener(state))
  }

  /**
   * Get current state
   */
  getState(): AuthState & { loading: boolean; error: string | null } {
    return {
      user: this.user,
      token: this.token,
      isAuthenticated: this.isAuthenticated(),
      loading: this.loading,
      error: this.error
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.user !== null && this.token !== null
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.user
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token
  }

  /**
   * Get auth headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.token) {
      return {}
    }

    return {
      'Authorization': `Bearer ${this.token}`
    }
  }

  /**
   * Login user
   */
  async login(user: User, token: string, refreshToken?: string): Promise<void> {
    this.loading = true
    this.error = null
    this.user = user
    this.token = token
    this.refreshToken = refreshToken || null

    // Save to localStorage
    this.saveToStorage()

    this.loading = false
    this.notify()
  }

  /**
   * Logout user
   */
  logout(): void {
    this.user = null
    this.token = null
    this.refreshToken = null
    this.error = null

    // Clear localStorage
    this.clearStorage()

    this.notify()
  }

  /**
   * Update user data
   */
  updateUser(user: User): void {
    this.user = user
    this.saveToStorage()
    this.notify()
  }

  /**
   * Update token
   */
  updateToken(token: string, refreshToken?: string): void {
    this.token = token
    this.refreshToken = refreshToken || null
    this.saveToStorage()
    this.notify()
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.loading = loading
    this.notify()
  }

  /**
   * Set error state
   */
  setError(error: string | null): void {
    this.error = error
    this.loading = false
    this.notify()
  }

  /**
   * Save auth state to localStorage
   */
  private saveToStorage(): void {
    try {
      if (this.user) {
        localStorage.setItem(this.STORAGE_KEY_USER, JSON.stringify(this.user))
      }
      if (this.token) {
        localStorage.setItem(this.STORAGE_KEY_TOKEN, this.token)
      }
      if (this.refreshToken) {
        localStorage.setItem(this.STORAGE_KEY_REFRESH, this.refreshToken)
      }
    } catch (error) {
      console.warn('Failed to save auth state to localStorage:', error)
    }
  }

  /**
   * Restore auth state from localStorage
   */
  private restoreFromStorage(): void {
    try {
      const userJson = localStorage.getItem(this.STORAGE_KEY_USER)
      const token = localStorage.getItem(this.STORAGE_KEY_TOKEN)
      const refreshToken = localStorage.getItem(this.STORAGE_KEY_REFRESH)

      if (userJson && token) {
        this.user = JSON.parse(userJson)
        this.token = token
        this.refreshToken = refreshToken
      }
    } catch (error) {
      console.warn('Failed to restore auth state from localStorage:', error)
      // Clear corrupted data
      this.clearStorage()
    }
  }

  /**
   * Clear auth state from localStorage
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY_USER)
      localStorage.removeItem(this.STORAGE_KEY_TOKEN)
      localStorage.removeItem(this.STORAGE_KEY_REFRESH)
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.refreshToken
  }

  /**
   * Clear semua state
   */
  clear(): void {
    this.logout()
  }

  /**
   * Check jika user perlu login ulang (kedua token expired)
   */
  needsReauthentication(): boolean {
    const accessExpired = !this.token || isTokenExpired(this.token)
    const refreshExpired = !this.refreshToken || isTokenExpired(this.refreshToken)
    return accessExpired && refreshExpired
  }
}

// Export singleton instance
export const authStore = new AuthStore()
