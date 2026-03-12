import type { User, AuthResponse } from '../types'
import { authStore } from '../stores/AuthStore'
import { apiHandler } from './ApiHandler'

/**
 * Service untuk authentication via API
 * Menggunakan centralized ApiHandler untuk automatic token refresh
 */
export class AuthService {
  /**
   * Sign in with Google
   */
  async signInWithGoogle(idToken: string): Promise<AuthResponse> {
    const result = await apiHandler.postUnauth<AuthResponse>('/auth/google', { idToken })

    // Update auth store
    await authStore.login(
      result.user,
      result.token,
      result.refreshToken
    )

    return result
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    return apiHandler.get<User>('/auth/me')
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const result = await apiHandler.postUnauth<AuthResponse>('/auth/refresh', { refreshToken })

    // Update auth store with new token
    authStore.updateToken(
      result.token,
      result.refreshToken
    )

    return result
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiHandler.post<void>('/auth/logout')
    } catch (error) {
      console.warn('Logout API call failed:', error)
    } finally {
      // Always logout locally, even if API call fails
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
   * Get auth headers for API requests (legacy method - mostly not needed anymore)
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
