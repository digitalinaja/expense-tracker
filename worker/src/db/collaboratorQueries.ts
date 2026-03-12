// Database query functions for Project Collaborators
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

export interface InvitationWithDetails {
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

export interface AccessInfo {
  hasAccess: boolean
  role?: 'owner' | 'editor' | 'viewer'
  status?: 'pending' | 'accepted' | 'declined'
}

// Project collaborator queries
export class CollaboratorQueries {
  constructor(private db: D1Database) {}

  async getAll(): Promise<ProjectCollaborator[]> {
    const result = await this.db
      .prepare('SELECT * FROM project_collaborators ORDER BY created_at DESC')
      .all()
    return result.results as ProjectCollaborator[]
  }

  async getById(id: number): Promise<ProjectCollaborator | null> {
    const result = await this.db
      .prepare('SELECT * FROM project_collaborators WHERE id = ?')
      .bind(id)
      .first()
    return result as ProjectCollaborator | null
  }

  async getProjectCollaborators(projectId: number): Promise<CollaboratorWithUser[]> {
    const result = await this.db
      .prepare(`
        SELECT
          pc.*,
          u.email as user_email,
          u.name as user_name,
          u.avatar_url as user_avatar_url,
          inviter.name as inviter_name
        FROM project_collaborators pc
        INNER JOIN users u ON pc.user_id = u.id
        INNER JOIN users inviter ON pc.invited_by = inviter.id
        WHERE pc.project_id = ?
        ORDER BY pc.created_at DESC
      `)
      .bind(projectId)
      .all()

    return result.results as CollaboratorWithUser[]
  }

  async getActiveProjectCollaborators(projectId: number): Promise<CollaboratorWithUser[]> {
    const result = await this.db
      .prepare(`
        SELECT
          pc.*,
          u.email as user_email,
          u.name as user_name,
          u.avatar_url as user_avatar_url,
          inviter.name as inviter_name
        FROM project_collaborators pc
        INNER JOIN users u ON pc.user_id = u.id
        INNER JOIN users inviter ON pc.invited_by = inviter.id
        WHERE pc.project_id = ? AND pc.status = 'accepted'
        ORDER BY pc.created_at DESC
      `)
      .bind(projectId)
      .all()

    return result.results as CollaboratorWithUser[]
  }

  async getPendingInvitations(userId: number): Promise<InvitationWithDetails[]> {
    const result = await this.db
      .prepare(`
        SELECT
          pc.id,
          pc.project_id,
          p.name as project_name,
          p.description as project_description,
          pc.role,
          pc.invited_by as inviter_id,
          inviter.name as inviter_name,
          inviter.email as inviter_email,
          pc.status,
          pc.created_at
        FROM project_collaborators pc
        INNER JOIN projects p ON pc.project_id = p.id
        INNER JOIN users inviter ON pc.invited_by = inviter.id
        WHERE pc.user_id = ? AND pc.status = 'pending'
        ORDER BY pc.created_at DESC
      `)
      .bind(userId)
      .all()

    return result.results as InvitationWithDetails[]
  }

  async getUserInvitations(userId: number): Promise<InvitationWithDetails[]> {
    const result = await this.db
      .prepare(`
        SELECT
          pc.id,
          pc.project_id,
          p.name as project_name,
          p.description as project_description,
          pc.role,
          pc.invited_by as inviter_id,
          inviter.name as inviter_name,
          inviter.email as inviter_email,
          pc.status,
          pc.created_at
        FROM project_collaborators pc
        INNER JOIN projects p ON pc.project_id = p.id
        INNER JOIN users inviter ON pc.invited_by = inviter.id
        WHERE pc.user_id = ?
        ORDER BY pc.created_at DESC
      `)
      .bind(userId)
      .all()

    return result.results as InvitationWithDetails[]
  }

  async getByProjectAndUser(projectId: number, userId: number): Promise<ProjectCollaborator | null> {
    const result = await this.db
      .prepare('SELECT * FROM project_collaborators WHERE project_id = ? AND user_id = ?')
      .bind(projectId, userId)
      .first()
    return result as ProjectCollaborator | null
  }

  async invite(collaborator: Omit<ProjectCollaborator, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.db
      .prepare(`
        INSERT INTO project_collaborators (project_id, user_id, role, invited_by, status)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(
        collaborator.project_id,
        collaborator.user_id,
        collaborator.role,
        collaborator.invited_by,
        collaborator.status
      )
      .run()

    if (!result.meta.last_row_id) {
      throw new Error('Failed to create invitation')
    }

    return result.meta.last_row_id
  }

  async acceptInvitation(invitationId: number): Promise<boolean> {
    const result = await this.db
      .prepare(`
        UPDATE project_collaborators
        SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(invitationId)
      .run()

    return result.meta.changes > 0
  }

  async declineInvitation(invitationId: number): Promise<boolean> {
    const result = await this.db
      .prepare(`
        UPDATE project_collaborators
        SET status = 'declined', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(invitationId)
      .run()

    return result.meta.changes > 0
  }

  async removeCollaborator(projectId: number, userId: number): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM project_collaborators WHERE project_id = ? AND user_id = ?')
      .bind(projectId, userId)
      .run()

    return result.meta.changes > 0
  }

  async updateRole(projectId: number, userId: number, role: 'editor' | 'viewer'): Promise<boolean> {
    const result = await this.db
      .prepare(`
        UPDATE project_collaborators
        SET role = ?, updated_at = CURRENT_TIMESTAMP
        WHERE project_id = ? AND user_id = ?
      `)
      .bind(role, projectId, userId)
      .run()

    return result.meta.changes > 0
  }

  async checkAccess(userId: number, projectId: number): Promise<AccessInfo> {
    // First check if user is the owner
    const projectResult = await this.db
      .prepare('SELECT owner_id FROM projects WHERE id = ?')
      .bind(projectId)
      .first()

    if (!projectResult) {
      return { hasAccess: false }
    }

    const ownerId = projectResult.owner_id as number

    if (ownerId === userId) {
      return { hasAccess: true, role: 'owner' }
    }

    // Check if user is a collaborator
    const collaborator = await this.getByProjectAndUser(projectId, userId)

    if (!collaborator) {
      return { hasAccess: false }
    }

    if (collaborator.status !== 'accepted') {
      return {
        hasAccess: false,
        role: collaborator.role,
        status: collaborator.status
      }
    }

    return {
      hasAccess: true,
      role: collaborator.role,
      status: collaborator.status
    }
  }

  async getProjectRole(userId: number, projectId: number): Promise<'owner' | 'editor' | 'viewer' | null> {
    const access = await this.checkAccess(userId, projectId)

    if (!access.hasAccess) {
      return null
    }

    return access.role || null
  }

  async canEditProject(userId: number, projectId: number): Promise<boolean> {
    const access = await this.checkAccess(userId, projectId)

    if (!access.hasAccess) {
      return false
    }

    return access.role === 'owner' || access.role === 'editor'
  }

  async canDeleteProject(userId: number, projectId: number): Promise<boolean> {
    const access = await this.checkAccess(userId, projectId)

    if (!access.hasAccess) {
      return false
    }

    return access.role === 'owner'
  }

  async canManageCollaborators(userId: number, projectId: number): Promise<boolean> {
    const access = await this.checkAccess(userId, projectId)

    if (!access.hasAccess) {
      return false
    }

    return access.role === 'owner'
  }

  async getCollaboratorCount(projectId: number): Promise<number> {
    const result = await this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM project_collaborators
        WHERE project_id = ? AND status = 'accepted'
      `)
      .bind(projectId)
      .first()

    return (result?.count as number) || 0
  }

  async isCollaborator(userId: number, projectId: number): Promise<boolean> {
    const access = await this.checkAccess(userId, projectId)
    return access.hasAccess && access.role !== 'owner'
  }

  async getPendingCount(userId: number): Promise<number> {
    const result = await this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM project_collaborators
        WHERE user_id = ? AND status = 'pending'
      `)
      .bind(userId)
      .first()

    return (result?.count as number) || 0
  }
}
