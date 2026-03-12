import type { Expense, ApiResponse, ExpenseFormData } from '../types'
import { authService } from './AuthService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL : '/api'

/**
 * Service for managing expenses via API
 */
export class ExpenseService {
  private baseUrl: string

  constructor() {
    this.baseUrl = `${API_BASE_URL}/expenses`
  }

  /**
   * Get auth headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders()
    }
  }

  /**
   * Get all expenses
   * Can optionally filter by project_id
   */
  async getAll(projectId?: number): Promise<Expense[]> {
    try {
      const url = projectId ? `${this.baseUrl}?project_id=${projectId}` : this.baseUrl
      const response = await fetch(url, {
        headers: this.getHeaders()
      })
      const result: ApiResponse<Expense[]> = await response.json()

      if (result.success && result.data) {
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch expenses')
    } catch (error) {
      console.error('Error fetching expenses:', error)
      throw error
    }
  }

  /**
   * Get single expense by ID
   */
  async getById(id: number): Promise<Expense> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        headers: this.getHeaders()
      })
      const result: ApiResponse<Expense> = await response.json()

      if (result.success && result.data) {
        return result.data
      }

      throw new Error(result.error || 'Failed to fetch expense')
    } catch (error) {
      console.error('Error fetching expense:', error)
      throw error
    }
  }

  /**
   * Create new expense
   */
  async create(data: ExpenseFormData): Promise<number> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      })

      const result: ApiResponse<{ id: number }> = await response.json()

      if (result.success && result.data) {
        return result.data.id
      }

      throw new Error(result.error || 'Failed to create expense')
    } catch (error) {
      console.error('Error creating expense:', error)
      throw error
    }
  }

  /**
   * Update expense
   */
  async update(id: number, data: Partial<ExpenseFormData>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      })

      const result: ApiResponse<void> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update expense')
      }
    } catch (error) {
      console.error('Error updating expense:', error)
      throw error
    }
  }

  /**
   * Delete expense
   */
  async delete(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      })

      const result: ApiResponse<void> = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete expense')
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      throw error
    }
  }
}

// Export singleton instance
export const expenseService = new ExpenseService()
