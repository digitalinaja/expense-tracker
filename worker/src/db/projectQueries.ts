// Database query functions for Projects
export interface Project {
  id?: number
  name: string
  description?: string
  start_date?: string
  end_date?: string
  created_at?: string
  updated_at?: string
}

export interface ProjectSummary {
  project: Project
  total_planning: number
  total_expenses: number
  remaining: number
  planning_count: number
  expense_count: number
}

// Project queries
export class ProjectQueries {
  constructor(private db: D1Database) {}

  async getAll(): Promise<Project[]> {
    const result = await this.db
      .prepare('SELECT * FROM projects ORDER BY name')
      .all()
    return result.results as Project[]
  }

  async getById(id: number): Promise<Project | null> {
    const result = await this.db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .bind(id)
      .first()
    return result as Project | null
  }

  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO projects (name, description, start_date, end_date) VALUES (?, ?, ?, ?)')
      .bind(project.name, project.description || null, project.start_date || null, project.end_date || null)
      .run()

    if (!result.meta.last_row_id) {
      throw new Error('Failed to create project')
    }

    return result.meta.last_row_id
  }

  async update(id: number, project: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>): Promise<boolean> {
    const updates: string[] = []
    const values: any[] = []

    if (project.name !== undefined) {
      updates.push('name = ?')
      values.push(project.name)
    }
    if (project.description !== undefined) {
      updates.push('description = ?')
      values.push(project.description)
    }
    if (project.start_date !== undefined) {
      updates.push('start_date = ?')
      values.push(project.start_date)
    }
    if (project.end_date !== undefined) {
      updates.push('end_date = ?')
      values.push(project.end_date)
    }

    if (updates.length === 0) return false

    values.push(id)
    const result = await this.db
      .prepare(`UPDATE projects SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(...values)
      .run()

    return result.meta.changes > 0
  }

  async delete(id: number): Promise<boolean> {
    // Check if project has any planning
    const planningCheck = await this.db
      .prepare('SELECT COUNT(*) as count FROM planning WHERE project_id = ?')
      .bind(id)
      .first()

    const planningCount = planningCheck?.count as number || 0

    if (planningCount > 0) {
      throw new Error('Cannot delete project with existing planning. Delete all planning first.')
    }

    const result = await this.db
      .prepare('DELETE FROM projects WHERE id = ?')
      .bind(id)
      .run()

    return result.meta.changes > 0
  }

  async getSummary(projectId: number): Promise<ProjectSummary> {
    // Get project
    const project = await this.getById(projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    // Get total planning amount
    const planningResult = await this.db
      .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM planning WHERE project_id = ?')
      .bind(projectId)
      .first()

    const totalPlanning = planningResult?.total as number || 0

    // Get total expenses untuk this project
    const expensesResult = await this.db
      .prepare(`
        SELECT COALESCE(SUM(e.amount), 0) as total
        FROM expenses e
        INNER JOIN planning pl ON e.planning_id = pl.id
        WHERE pl.project_id = ?
      `)
      .bind(projectId)
      .first()

    const totalExpenses = expensesResult?.total as number || 0

    // Get counts
    const planningCountResult = await this.db
      .prepare('SELECT COUNT(*) as count FROM planning WHERE project_id = ?')
      .bind(projectId)
      .first()

    const planningCount = planningCountResult?.count as number || 0

    const expenseCountResult = await this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM expenses e
        INNER JOIN planning pl ON e.planning_id = pl.id
        WHERE pl.project_id = ?
      `)
      .bind(projectId)
      .first()

    const expenseCount = expenseCountResult?.count as number || 0

    return {
      project,
      total_planning: totalPlanning,
      total_expenses: totalExpenses,
      remaining: totalPlanning - totalExpenses,
      planning_count: planningCount,
      expense_count: expenseCount
    }
  }

  async getAllWithSummary(): Promise<ProjectSummary[]> {
    const projects = await this.getAll()

    const summaries = await Promise.all(
      projects.map(project => this.getSummary(project.id!))
    )

    return summaries
  }

  async hasPlanning(projectId: number): Promise<boolean> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM planning WHERE project_id = ?')
      .bind(projectId)
      .first()

    const count = result?.count as number || 0
    return count > 0
  }

  async hasExpenses(projectId: number): Promise<boolean> {
    const result = await this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM expenses e
        INNER JOIN planning pl ON e.planning_id = pl.id
        WHERE pl.project_id = ?
      `)
      .bind(projectId)
      .first()

    const count = result?.count as number || 0
    return count > 0
  }

  async isEmpty(projectId: number): Promise<boolean> {
    const hasPlanning = await this.hasPlanning(projectId)
    return !hasPlanning
  }
}
