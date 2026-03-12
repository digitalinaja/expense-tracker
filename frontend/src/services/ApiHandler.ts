import { authService } from './AuthService'
import { isTokenExpired } from '../utils/jwt'
import { authStore } from '../stores/AuthStore'
import type { ApiResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL : '/api'

/**
 * Track jika sedang refresh token untuk mencegah multiple refresh requests
 */
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

/**
 * Subscribe ke token refresh completion
 */
function subscribeToRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

/**
 * Notify semua subscribers bahwa token sudah di-refresh
 */
function onRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

/**
 * Centralized API Handler dengan automatic token refresh
 */
export class ApiHandler {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  /**
   * Request interceptor untuk cek token expiration sebelum request
   */
  private async prepareRequest(): Promise<HeadersInit> {
    const token = authService.getToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    // Check jika token expired dan coba refresh
    if (token && isTokenExpired(token)) {
      console.log('Token expired, attempting refresh...')
      const newToken = await this.attemptTokenRefresh()

      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`
      }
    } else if (token) {
      // Check jika token akan segera expired (opsional - proactive refresh)
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  /**
   * Attempt token refresh
   */
  private async attemptTokenRefresh(): Promise<string | null> {
    const refreshToken = authStore.getRefreshToken()

    if (!refreshToken) {
      console.log('No refresh token available')
      return null
    }

    // Jika sedang refresh, tunggu sampai selesai
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeToRefresh((token) => {
          resolve(token)
        })
      })
    }

    isRefreshing = true

    try {
      console.log('Refreshing token...')
      const response = await authService.refreshToken(refreshToken)
      const newToken = response.token

      console.log('Token refreshed successfully')
      onRefreshed(newToken)

      return newToken
    } catch (error) {
      console.error('Failed to refresh token:', error)

      // Token refresh failed, logout user
      console.log('Token refresh failed, logging out user')
      this.handleAuthFailure()

      return null
    } finally {
      isRefreshing = false
    }
  }

  /**
   * Handle authentication failure (logout dan show login modal)
   */
  private handleAuthFailure(): void {
    authStore.logout()

    // Import authModal dynamically dan show
    import('../components/AuthModal').then(module => {
      const authModal = module.authModal
      if (authModal && authModal.show) {
        authModal.show()
      }
    }).catch(err => {
      console.error('Failed to load AuthModal:', err)
      // Fallback: reload page untuk trigger auth check
      console.log('Reloading page to trigger authentication...')
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    })
  }

  /**
   * Parse response dan check untuk auth errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Check untuk 401 Unauthorized
    if (response.status === 401) {
      console.log('Received 401 response, attempting token refresh...')

      // Try refresh token
      const newToken = await this.attemptTokenRefresh()

      if (newToken) {
        // Retry request with new token
        throw new Error('RETRY_REQUEST')
      }

      // If refresh failed, handle auth failure
      this.handleAuthFailure()
      throw new Error('Session expired. Please login again.')
    }

    // Parse JSON response
    const result: ApiResponse<T> = await response.json()

    // Check untuk API error
    if (!result.success) {
      throw new Error(result.error || 'Request failed')
    }

    return result.data !== undefined ? result.data : (undefined as any)
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.prepareRequest()

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers
    })

    // Retry jika token di-refresh
    if (!response.ok && response.status === 401) {
      try {
        await this.handleResponse<T>(response)
      } catch (error: any) {
        if (error.message === 'RETRY_REQUEST') {
          // Retry with new token
          const newHeaders = await this.prepareRequest()
          response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: newHeaders
          })
        }
      }
    }

    return this.handleResponse<T>(response)
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<T> {
    const headers = await this.prepareRequest()

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    // Retry jika token di-refresh
    if (!response.ok && response.status === 401) {
      try {
        await this.handleResponse<T>(response)
      } catch (error: any) {
        if (error.message === 'RETRY_REQUEST') {
          // Retry with new token
          const newHeaders = await this.prepareRequest()
          response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: newHeaders,
            body: body ? JSON.stringify(body) : undefined
          })
        }
      }
    }

    return this.handleResponse<T>(response)
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<T> {
    const headers = await this.prepareRequest()

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    // Retry jika token di-refresh
    if (!response.ok && response.status === 401) {
      try {
        await this.handleResponse<T>(response)
      } catch (error: any) {
        if (error.message === 'RETRY_REQUEST') {
          // Retry with new token
          const newHeaders = await this.prepareRequest()
          response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: newHeaders,
            body: body ? JSON.stringify(body) : undefined
          })
        }
      }
    }

    return this.handleResponse<T>(response)
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.prepareRequest()

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers
    })

    // Retry jika token di-refresh
    if (!response.ok && response.status === 401) {
      try {
        await this.handleResponse<T>(response)
      } catch (error: any) {
        if (error.message === 'RETRY_REQUEST') {
          // Retry with new token
          const newHeaders = await this.prepareRequest()
          response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: newHeaders
          })
        }
      }
    }

    return this.handleResponse<T>(response)
  }

  /**
   * POST without auth (untuk login endpoint)
   */
  async postUnauth<T>(endpoint: string, body?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    })

    return this.handleResponse<T>(response)
  }
}

// Export singleton instance
export const apiHandler = new ApiHandler()
