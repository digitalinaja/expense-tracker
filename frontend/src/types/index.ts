// TypeScript type definitions for Expense Tracker

export interface Expense {
  id?: number
  name: string
  amount: number
  date: string
  planning_id?: number | null
  planning_name?: string  // For display purposes from JOIN
  created_at?: string
  updated_at?: string
}

export interface Planning {
  id?: number
  name: string
  amount: number
  date: string
  created_at?: string
  updated_at?: string
}

export interface Summary {
  total_expenses: number
  total_planning: number
  remaining_balance: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ExpenseFormData {
  name: string
  amount: number
  date: string
  planning_id?: number | null
}

export interface PlanningFormData {
  name: string
  amount: number
  date: string
}

export interface CategoryReport {
  planning_id: number
  planning_name: string
  budget_amount: number
  actual_amount: number
  remaining: number
  percentage_used: number
}

export interface UncategorizedReport {
  total_amount: number
  count: number
}

export interface FullCategoryReport {
  categorized: CategoryReport[]
  uncategorized: UncategorizedReport
}
