// TypeScript type definitions for Expense Tracker

export interface Project {
  id?: number
  name: string
  description?: string
  start_date?: string
  end_date?: string
  created_at?: string
  updated_at?: string
}

export interface Expense {
  id?: number
  name: string
  amount: number
  date: string
  planning_id?: number | null
  planning_name?: string  // For display purposes from JOIN
  project_name?: string  // For display purposes from planning JOIN
  attachments?: Attachment[]  // Associated image attachments
  created_at?: string
  updated_at?: string
}

export interface Attachment {
  id?: number
  expense_id: number
  file_name: string
  original_file_name: string
  file_size: number
  mime_type: string
  r2_key: string
  width?: number
  height?: number
  created_at?: string
  url?: string  // Computed URL for accessing the file
}

export interface Planning {
  id?: number
  project_id: number  // REQUIRED
  name: string
  amount: number
  date: string
  project_name?: string  // For display purposes from JOIN
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
  project_id: number  // REQUIRED
  name: string
  amount: number
  date: string
}

export interface ProjectFormData {
  name: string
  description?: string
  start_date?: string
  end_date?: string
}

export interface ProjectSummary {
  project: Project
  total_planning: number
  total_expenses: number
  remaining: number
  planning_count: number
  expense_count: number
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

// ============================================
// Authentication Types
// ============================================

export interface User {
  id: number
  email: string
  name: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

// ============================================
// Collaboration Types
// ============================================

export interface ProjectCollaborator {
  id?: number
  project_id: number
  user_id: number
  role: 'editor' | 'viewer'
  invited_by: number
  status: 'pending' | 'accepted' | 'declined'
  created_at?: string
  updated_at?: string
}

export interface CollaboratorWithUser extends ProjectCollaborator {
  user_email: string
  user_name: string
  user_avatar_url?: string
  inviter_name: string
}

export interface Invitation {
  id: number
  project_id: number
  project_name: string
  project_description?: string
  role: 'editor' | 'viewer'
  inviter_id: number
  inviter_name: string
  inviter_email: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export interface ProjectWithAccess extends Project {
  is_owner: boolean
  user_role?: 'editor' | 'viewer'
  collaborator_count?: number
}

// ============================================
// Google Identity Services Types
// ============================================

declare global {
  interface Window {
    google?: typeof import('google-one-tap')
  }
}

export {} // Make this a module
