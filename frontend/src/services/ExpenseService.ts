import type { Expense, ExpenseFormData } from '../types'
import { apiHandler } from './ApiHandler'

export interface ExpenseSearchParams {
  projectId?: number
  search?: string
  planningId?: number | 'uncategorized'
  limit?: number
  offset?: number
}

export interface PaginatedExpenseResult {
  data: Expense[]
  pagination: {
    total: number
    hasMore: boolean
    limit: number
    offset: number
  }
}

/**
 * Service for managing expenses via API
 * Menggunakan centralized ApiHandler untuk automatic token refresh
 */
export class ExpenseService {
  /**
   * Get all expenses (legacy, backward compatible)
   * Can optionally filter by project_id
   */
  async getAll(projectId?: number): Promise<Expense[]> {
    const endpoint = projectId ? `/expenses?project_id=${projectId}` : '/expenses'
    return apiHandler.get<Expense[]>(endpoint)
  }

  /**
   * Search expenses with filters and pagination
   */
  async search(params: ExpenseSearchParams): Promise<PaginatedExpenseResult> {
    const queryParts: string[] = []

    if (params.projectId) {
      queryParts.push(`project_id=${params.projectId}`)
    }
    if (params.search && params.search.trim()) {
      queryParts.push(`search=${encodeURIComponent(params.search.trim())}`)
    }
    if (params.planningId !== undefined) {
      queryParts.push(`planning_id=${params.planningId}`)
    }

    queryParts.push(`limit=${params.limit || 20}`)
    queryParts.push(`offset=${params.offset || 0}`)

    const endpoint = `/expenses?${queryParts.join('&')}`

    // The API returns { success, data, pagination } - ApiHandler extracts .data
    // But we need pagination too, so we do a raw-ish call
    const result = await apiHandler.getWithPagination<Expense[]>(endpoint)
    return result
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
