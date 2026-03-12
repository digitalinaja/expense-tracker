import type { User, AuthResponse, ApiResponse } from '../types'
import { authStore } from '../stores/AuthStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL : '/api'

/**
 * Service untuk authentication via API
 */
export class AuthService {
  private baseUrl: string

  constructor() {
    this.baseUrl = `${API_BASE_URL}/auth`
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(idToken: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idToken })
      })

      const result: ApiResponse<AuthResponse> = await response.json()

      if (result.success && result.data) {
        // Update auth store
        await authStore.login(
          result.data.user,
          result.data.token,
          result.data.refreshToken
        )

        return result.data
      }

      throw new Error(result.error || 'Authentication failed')
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: this.getAuthHeaders()
      })

      const result: ApiResponse<User> = await response.json()

      if (result.success && result.data) {
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch user info')
    } catch (error) {
      console.error('Error fetching current user:', error)
      throw error
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      })

      const result: ApiResponse<AuthResponse> = await response.json()

      if (result.success && result.data) {
        // Update auth store with new token
        authStore.updateToken(
          result.data.token,
          result.data.refreshToken
        )

        return result.data
      }

      throw new Error(result.error || 'Failed to refresh token')
    } catch (error) {
      console.error('Error refreshing token:', error)
      throw error
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      })

      const result: ApiResponse<void> = await response.json()

      // Always logout locally, even if API call fails
      authStore.logout()

      if (!result.success) {
        console.warn('Logout API call failed:', result.error)
      }
    } catch (error) {
      console.error('Error during logout:', error)
      // Still logout locally
      authStore.logout()
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return authStore.isAuthenticated()
  }

  /**
   * Get auth headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    return authStore.getAuthHeaders()
  }

  /**
   * Get current user from store
   */
  getUser(): User | null {
    return authStore.getUser()
  }

  /**
   * Get current token from store
   */
  getToken(): string | null {
    return authStore.getToken()
  }
}

// Export singleton instance
export const authService = new AuthService()
