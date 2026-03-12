import type { Expense, ExpenseFormData } from '../types'
import { apiHandler } from './ApiHandler'

/**
 * Service for managing expenses via API
 * Menggunakan centralized ApiHandler untuk automatic token refresh
 */
export class ExpenseService {
  /**
   * Get all expenses
   * Can optionally filter by project_id
   */
  async getAll(projectId?: number): Promise<Expense[]> {
    const endpoint = projectId ? `/expenses?project_id=${projectId}` : '/expenses'
    return apiHandler.get<Expense[]>(endpoint)
  }

  /**
   * Get single expense by ID
   */
  async getById(id: number): Promise<Expense> {
    return apiHandler.get<Expense>(`/expenses/${id}`)
  }

  /**
   * Create new expense
   */
  async create(data: ExpenseFormData): Promise<number> {
    return apiHandler.post<{ id: number }>('/expenses', data).then(r => r.id)
  }

  /**
   * Update expense
   */
  async update(id: number, data: Partial<ExpenseFormData>): Promise<void> {
    return apiHandler.put<void>(`/expenses/${id}`, data)
  }

  /**
   * Delete expense
   */
  async delete(id: number): Promise<void> {
    return apiHandler.delete<void>(`/expenses/${id}`)
  }
}

// Export singleton instance
export const expenseService = new ExpenseService()
