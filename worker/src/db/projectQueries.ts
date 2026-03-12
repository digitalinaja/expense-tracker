// Database query functions for Projects
export interface Project {
  id?: number
  name: string
  description?: string
  start_date?: string
  end_date?: string
  owner_id?: number
  created_at?: string
  updated_at?: string
}

export interface ProjectWithAccess extends Project {
  is_owner: boolean
  user_role?: 'editor' | 'viewer'
  collaborator_count?: number
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

  /**
   * Get all projects with user access (owned + shared)
   */
  async getAllWithAccess(userId: number): Promise<ProjectWithAccess[]> {
    // Get owned projects
    const ownedResult = await this.db
      .prepare(`
        SELECT
          p.*,
          1 as is_owner,
          NULL as user_role,
          (SELECT COUNT(*) FROM project_collaborators WHERE project_id = p.id AND status = 'accepted') as collaborator_count
        FROM projects p
        WHERE p.owner_id = ?
        ORDER BY p.name
      `)
      .bind(userId)
      .all()

    const owned = this.normalizeProjectResults(ownedResult.results, true)

    // Get shared projects
    const sharedResult = await this.db
      .prepare(`
        SELECT
          p.*,
          0 as is_owner,
          pc.role as user_role,
          (SELECT COUNT(*) FROM project_collaborators WHERE project_id = p.id AND status = 'accepted') as collaborator_count
        FROM projects p
        INNER JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE pc.user_id = ? AND pc.status = 'accepted'
        ORDER BY p.name
      `)
      .bind(userId)
      .all()

    const shared = this.normalizeProjectResults(sharedResult.results, false)

    // Combine and deduplicate
    const allProjects = [...owned]
    shared.forEach(sharedProject => {
      if (!owned.find(op => op.id === sharedProject.id)) {
        allProjects.push(sharedProject)
      }
    })

    return allProjects
  }

  /**
   * Normalize project results from D1 (convert types properly)
   */
  private normalizeProjectResults(results: any[], isOwner: boolean): ProjectWithAccess[] {
    if (!results || results.length === 0) {
      return []
    }

    return results.map((row: any) => {
      // Helper function to convert string "null" to actual null
      const nullIfStringNull = (value: any) => {
        if (value === 'null' || value === null || value === undefined) {
          return null
        }
        return value
      }

      // Only include fields that exist in the row
      const project: any = {
        id: row.id,
        name: row.name,
        description: nullIfStringNull(row.description),
        start_date: nullIfStringNull(row.start_date),
        end_date: nullIfStringNull(row.end_date),
        owner_id: row.owner_id,
        created_at: nullIfStringNull(row.created_at),
        is_owner: isOwner,
        user_role: nullIfStringNull(row.user_role),
        collaborator_count: row.collaborator_count || 0
      }

      // Only add updated_at if it exists in the row
      if (row.updated_at !== undefined) {
        project.updated_at = nullIfStringNull(row.updated_at)
      }

      return project
    })
  }

  /**
   * Get owned projects only
   */
  async getOwnedProjects(userId: number): Promise<Project[]> {
    const result = await this.db
      .prepare('SELECT * FROM projects WHERE owner_id = ? ORDER BY name')
      .bind(userId)
      .all()
    return result.results as Project[]
  }

  /**
   * Get shared projects only
   */
  async getSharedProjects(userId: number): Promise<Project[]> {
    const result = await this.db
      .prepare(`
        SELECT DISTINCT p.*
        FROM projects p
        INNER JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE pc.user_id = ? AND pc.status = 'accepted'
        ORDER BY p.name
      `)
      .bind(userId)
      .all()
    return result.results as Project[]
  }

  /**
   * Get all projects (deprecated - use getAllWithAccess instead)
   */
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

  /**
   * Get project by ID with user access check
   */
  async getByIdWithAccess(id: number, userId: number): Promise<Project | null> {
    // Check if user is owner
    const ownerCheck = await this.db
      .prepare('SELECT * FROM projects WHERE id = ? AND owner_id = ?')
      .bind(id, userId)
      .first()

    if (ownerCheck) {
      return ownerCheck as Project
    }

    // Check if user is a collaborator
    const collaboratorCheck = await this.db
      .prepare(`
        SELECT p.*
        FROM projects p
        INNER JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = ? AND pc.user_id = ? AND pc.status = 'accepted'
      `)
      .bind(id, userId)
      .first()

    return collaboratorCheck as Project | null
  }

  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>, ownerId: number): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO projects (name, description, start_date, end_date, owner_id) VALUES (?, ?, ?, ?, ?)')
      .bind(project.name, project.description ?? null, project.start_date ?? null, project.end_date ?? null, ownerId)
      .run()

    if (!result.meta.last_row_id) {
      throw new Error('Failed to create project')
    }

    return result.meta.last_row_id
  }

  async update(id: number, project: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>, userId: number): Promise<boolean> {
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

    values.push(id, userId)
    
    // Ensure no undefined values are passed to D1
    const safeValues = values.map(v => v === undefined ? null : v)

    const result = await this.db
      .prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND owner_id = ?`)
      .bind(...safeValues)
      .run()

    return result.meta.changes > 0
  }

  async delete(id: number, userId: number): Promise<boolean> {
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
      .prepare('DELETE FROM projects WHERE id = ? AND owner_id = ?')
      .bind(id, userId)
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

  async getAllWithSummary(userId: number): Promise<ProjectSummary[]> {
    const projects = await this.getAllWithAccess(userId)

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
