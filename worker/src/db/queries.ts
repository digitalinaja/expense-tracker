// Database query functions for D1
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

export interface Planning {
  id?: number
  project_id: number  // REQUIRED - belongs to a project
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

// Expense queries
export class ExpenseQueries {
  constructor(private db: D1Database) {}

  async getAll(projectId?: number): Promise<Expense[]> {
    let query = `
      SELECT
        e.*,
        p.name as planning_name,
        pl.project_id
      FROM expenses e
      LEFT JOIN planning p ON e.planning_id = p.id
      LEFT JOIN planning pl ON e.planning_id = pl.id
    `

    // If projectId specified, only get expenses that belong to planning in that project
    if (projectId !== undefined) {
      query += ` WHERE pl.project_id = ?`
    }

    query += ` ORDER BY e.date DESC, e.created_at DESC`

    const stmt = this.db.prepare(query)

    if (projectId !== undefined) {
      const result = await stmt.bind(projectId).all()
      return result.results as Expense[]
    } else {
      const result = await stmt.all()
      return result.results as Expense[]
    }
  }

  /**
   * Get expenses with search, filter, and pagination
   */
  async getPaginated(params: {
    projectId?: number
    search?: string
    planningId?: number | 'uncategorized'
    limit: number
    offset: number
  }): Promise<{ data: Expense[]; total: number; hasMore: boolean }> {
    const conditions: string[] = []
    const values: any[] = []

    // Project filter
    if (params.projectId !== undefined) {
      conditions.push('pl.project_id = ?')
      values.push(params.projectId)
    }

    // Search filter (by name)
    if (params.search && params.search.trim()) {
      conditions.push('e.name LIKE ?')
      values.push(`%${params.search.trim()}%`)
    }

    // Category filter
    if (params.planningId === 'uncategorized') {
      conditions.push('e.planning_id IS NULL')
    } else if (params.planningId !== undefined) {
      conditions.push('e.planning_id = ?')
      values.push(params.planningId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Count total matching records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM expenses e
      LEFT JOIN planning p ON e.planning_id = p.id
      LEFT JOIN planning pl ON e.planning_id = pl.id
      ${whereClause}
    `
    const countResult = await this.db.prepare(countQuery).bind(...values).first()
    const total = (countResult?.total as number) || 0

    // Fetch paginated data
    const dataQuery = `
      SELECT
        e.*,
        p.name as planning_name,
        pl.project_id
      FROM expenses e
      LEFT JOIN planning p ON e.planning_id = p.id
      LEFT JOIN planning pl ON e.planning_id = pl.id
      ${whereClause}
      ORDER BY e.date DESC, e.created_at DESC
      LIMIT ? OFFSET ?
    `
    const dataValues = [...values, params.limit, params.offset]
    const dataResult = await this.db.prepare(dataQuery).bind(...dataValues).all()

    return {
      data: dataResult.results as Expense[],
      total,
      hasMore: params.offset + params.limit < total
    }
  }

  async getByPlanningId(planningId: number): Promise<Expense[]> {
    const result = await this.db
      .prepare(`
        SELECT
          e.*,
          p.name as planning_name
        FROM expenses e
        LEFT JOIN planning p ON e.planning_id = p.id
        WHERE e.planning_id = ?
        ORDER BY e.date DESC
      `)
      .bind(planningId)
      .all()
    return result.results as Expense[]
  }

  async getUncategorized(): Promise<Expense[]> {
    const result = await this.db
      .prepare(`
        SELECT *
        FROM expenses
        WHERE planning_id IS NULL
        ORDER BY date DESC, created_at DESC
      `)
      .all()
    return result.results as Expense[]
  }

  async getById(id: number): Promise<Expense | null> {
    const result = await this.db
      .prepare(`
        SELECT
          e.*,
          p.name as planning_name
        FROM expenses e
        LEFT JOIN planning p ON e.planning_id = p.id
        WHERE e.id = ?
      `)
      .bind(id)
      .first()
    return result as Expense | null
  }

  async create(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'planning_name'>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO expenses (name, amount, date, planning_id) VALUES (?, ?, ?, ?)')
      .bind(expense.name, expense.amount, expense.date, expense.planning_id || null)
      .run()

    if (!result.meta.last_row_id) {
      throw new Error('Failed to create expense')
    }

    return result.meta.last_row_id
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM expenses WHERE id = ?')
      .bind(id)
      .run()

    // Note: Attachments will be deleted automatically due to ON DELETE CASCADE
    // in the attachments table foreign key constraint

    return result.meta.changes > 0
  }

  async update(id: number, expense: Partial<Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'planning_name'>>): Promise<boolean> {
    const updates: string[] = []
    const values: any[] = []

    if (expense.name !== undefined) {
      updates.push('name = ?')
      values.push(expense.name)
    }
    if (expense.amount !== undefined) {
      updates.push('amount = ?')
      values.push(expense.amount)
    }
    if (expense.date !== undefined) {
      updates.push('date = ?')
      values.push(expense.date)
    }
    if (expense.planning_id !== undefined) {
      updates.push('planning_id = ?')
      values.push(expense.planning_id)
    }

    if (updates.length === 0) return false

    values.push(id)

    // Ensure no undefined values are passed to D1
    const safeValues = values.map(v => v === undefined ? null : v)

    const result = await this.db
      .prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...safeValues)
      .run()

    return result.meta.changes > 0
  }

  async getTotal(): Promise<number> {
    const result = await this.db
      .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses')
      .first()
    return result?.total as number || 0
  }
}

// Planning queries
export class PlanningQueries {
  constructor(private db: D1Database) {}

  async getAll(projectId?: number): Promise<Planning[]> {
    let query = `
      SELECT
        pl.*,
        p.name as project_name
      FROM planning pl
      JOIN projects p ON pl.project_id = p.id
    `

    if (projectId !== undefined) {
      query += ' WHERE pl.project_id = ?'
      query += ' ORDER BY pl.date DESC, pl.created_at DESC'
      const result = await this.db.prepare(query).bind(projectId).all()
      return result.results as Planning[]
    } else {
      query += ' ORDER BY p.name, pl.date DESC, pl.created_at DESC'
      const result = await this.db.prepare(query).all()
      return result.results as Planning[]
    }
  }

  async getById(id: number): Promise<Planning | null> {
    const result = await this.db
      .prepare(`
        SELECT
          pl.*,
          p.name as project_name
        FROM planning pl
        JOIN projects p ON pl.project_id = p.id
        WHERE pl.id = ?
      `)
      .bind(id)
      .first()
    return result as Planning | null
  }

  async getByProjectId(projectId: number): Promise<Planning[]> {
    const result = await this.db
      .prepare(`
        SELECT
          pl.*,
          p.name as project_name
        FROM planning pl
        JOIN projects p ON pl.project_id = p.id
        WHERE pl.project_id = ?
        ORDER BY pl.date DESC, pl.created_at DESC
      `)
      .bind(projectId)
      .all()
    return result.results as Planning[]
  }

  async create(planning: Omit<Planning, 'id' | 'created_at' | 'updated_at' | 'project_name'>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO planning (project_id, name, amount, date) VALUES (?, ?, ?, ?)')
      .bind(planning.project_id, planning.name, planning.amount, planning.date)
      .run()

    if (!result.meta.last_row_id) {
      throw new Error('Failed to create planning')
    }

    return result.meta.last_row_id
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM planning WHERE id = ?')
      .bind(id)
      .run()

    return result.meta.changes > 0
  }

  async update(id: number, planning: Partial<Omit<Planning, 'id' | 'created_at' | 'updated_at'>>): Promise<boolean> {
    const updates: string[] = []
    const values: any[] = []

    if (planning.name !== undefined) {
      updates.push('name = ?')
      values.push(planning.name)
    }
    if (planning.amount !== undefined) {
      updates.push('amount = ?')
      values.push(planning.amount)
    }
    if (planning.date !== undefined) {
      updates.push('date = ?')
      values.push(planning.date)
    }

    if (updates.length === 0) return false

    values.push(id)
    const result = await this.db
      .prepare(`UPDATE planning SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return result.meta.changes > 0
  }

  async getTotal(): Promise<number> {
    const result = await this.db
      .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM planning')
      .first()
    return result?.total as number || 0
  }
}

// Summary queries
export class SummaryQueries {
  constructor(private db: D1Database) {}

  async getSummary(): Promise<Summary> {
    const result = await this.db
      .prepare(`
        SELECT
          (SELECT COALESCE(SUM(amount), 0) FROM expenses) as total_expenses,
          (SELECT COALESCE(SUM(amount), 0) FROM planning) as total_planning
      `)
      .first()

    const totalExpenses = result?.total_expenses as number || 0
    const totalPlanning = result?.total_planning as number || 0

    return {
      total_expenses: totalExpenses,
      total_planning: totalPlanning,
      remaining_balance: totalPlanning - totalExpenses
    }
  }
}

// Category report queries
export class CategoryReportQueries {
  constructor(private db: D1Database) {}

  async getByCategory(projectId?: number): Promise<CategoryReport[]> {
    let query = `
      SELECT
        p.id as planning_id,
        p.name as planning_name,
        p.amount as budget_amount,
        COALESCE(SUM(e.amount), 0) as actual_amount
      FROM planning p
      LEFT JOIN expenses e ON p.id = e.planning_id
    `

    // Filter by project if specified
    if (projectId !== undefined) {
      query += ` WHERE p.project_id = ?`
    }

    query += `
      GROUP BY p.id, p.name, p.amount
      ORDER BY p.name
    `

    const stmt = this.db.prepare(query)

    let result
    if (projectId !== undefined) {
      result = await stmt.bind(projectId).all()
    } else {
      result = await stmt.all()
    }

    return result.results.map((row: any) => {
      const budget = row.budget_amount as number
      const actual = row.actual_amount as number
      const percentage = budget > 0 ? (actual / budget) * 100 : 0

      return {
        planning_id: row.planning_id as number,
        planning_name: row.planning_name as string,
        budget_amount: budget,
        actual_amount: actual,
        remaining: budget - actual,
        percentage_used: Math.round(percentage * 100) / 100
      }
    })
  }

  async getUncategorizedReport(projectId?: number): Promise<UncategorizedReport> {
    let query = `
      SELECT
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) as count
      FROM expenses
      WHERE planning_id IS NULL
    `

    // For project-specific reports, we need to exclude uncategorized expenses
    // because they don't belong to any planning/project
    // When filtering by project, uncategorized report will be empty
    if (projectId !== undefined) {
      return {
        total_amount: 0,
        count: 0
      }
    }

    const result = await this.db.prepare(query).first()

    return {
      total_amount: result?.total_amount as number || 0,
      count: result?.count as number || 0
    }
  }

  async getFullReport(projectId?: number): Promise<{ categorized: CategoryReport[]; uncategorized: UncategorizedReport }> {
    const [categorized, uncategorized] = await Promise.all([
      this.getByCategory(projectId),
      this.getUncategorizedReport(projectId)
    ])

    return { categorized, uncategorized }
  }
}
