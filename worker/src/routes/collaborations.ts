import { Hono } from 'hono'
import { CollaboratorQueries } from '../db/collaboratorQueries'
import { UserQueries } from '../db/userQueries'
import { requireAuth } from '../middleware/auth'

type Env = {
  DB: D1Database
  KV: KVNamespace
}

export const collaborationsRouter = new Hono<{ Bindings: Env }>()

// GET /api/collaborations/invitations - Get pending invitations for current user
collaborationsRouter.get('/invitations', async (c) => {
  try {
    const user = requireAuth(c)

    const collaboratorQueries = new CollaboratorQueries(c.env.DB)
    const invitations = await collaboratorQueries.getPendingInvitations(user.id)

    return c.json({
      success: true,
      data: invitations
    })
  } catch (error) {
    console.error('Error fetching invitations:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401)
    }

    return c.json({
      success: false,
      error: 'Failed to fetch invitations'
    }, 500)
  }
})

// GET /api/collaborations/invitations/all - Get all invitations for current user
collaborationsRouter.get('/invitations/all', async (c) => {
  try {
    const user = requireAuth(c)

    const collaboratorQueries = new CollaboratorQueries(c.env.DB)
    const invitations = await collaboratorQueries.getUserInvitations(user.id)

    return c.json({
      success: true,
      data: invitations
    })
  } catch (error) {
    console.error('Error fetching invitations:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401)
    }

    return c.json({
      success: false,
      error: 'Failed to fetch invitations'
    }, 500)
  }
})

// POST /api/collaborations/invite - Invite user to project
collaborationsRouter.post('/invite', async (c) => {
  try {
    const user = requireAuth(c)
    const body = await c.req.json()

    // Validate request
    if (!body.projectId || typeof body.projectId !== 'number') {
      return c.json({
        success: false,
        error: 'projectId is required and must be a number'
      }, 400)
    }

    if (!body.email || typeof body.email !== 'string') {
      return c.json({
        success: false,
        error: 'email is required and must be a string'
      }, 400)
    }

    if (!body.role || !['editor', 'viewer'].includes(body.role)) {
      return c.json({
        success: false,
        error: 'role must be either "editor" or "viewer"'
      }, 400)
    }

    const collaboratorQueries = new CollaboratorQueries(c.env.DB)
    const userQueries = new UserQueries(c.env.DB)

    // Check if user is the project owner
    const canManage = await collaboratorQueries.canManageCollaborators(user.id, body.projectId)

    if (!canManage) {
      return c.json({
        success: false,
        error: 'Only project owners can invite collaborators'
      }, 403)
    }

    // Find user by email
    const targetUser = await userQueries.getByEmail(body.email)

    if (!targetUser) {
      return c.json({
        success: false,
        error: 'User not found with this email address'
      }, 404)
    }

    // Check if user is already a collaborator
    const existing = await collaboratorQueries.getByProjectAndUser(body.projectId, targetUser.id!)

    if (existing) {
      if (existing.status === 'accepted') {
        return c.json({
          success: false,
          error: 'User is already a collaborator on this project'
        }, 400)
      } else if (existing.status === 'pending') {
        return c.json({
          success: false,
          error: 'User already has a pending invitation for this project'
        }, 400)
      }
    }

    // Create invitation
    const invitationId = await collaboratorQueries.invite({
      project_id: body.projectId,
      user_id: targetUser.id!,
      role: body.role,
      invited_by: user.id,
      status: 'pending'
    })

    return c.json({
      success: true,
      message: 'Invitation sent successfully',
      data: { id: invitationId }
    }, 201)
  } catch (error) {
    console.error('Error creating invitation:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401)
    }

    return c.json({
      success: false,
      error: 'Failed to create invitation'
    }, 500)
  }
})

// POST /api/collaborations/:id/accept - Accept invitation
collaborationsRouter.post('/:id/accept', async (c) => {
  try {
    const user = requireAuth(c)

    const invitationId = parseInt(c.req.param('id'))
    if (isNaN(invitationId)) {
      return c.json({
        success: false,
        error: 'Invalid invitation ID'
      }, 400)
    }

    const collaboratorQueries = new CollaboratorQueries(c.env.DB)

    // Get invitation to verify ownership
    const invitation = await collaboratorQueries.getById(invitationId)

    if (!invitation) {
      return c.json({
        success: false,
        error: 'Invitation not found'
      }, 404)
    }

    // Check if invitation belongs to current user
    if (invitation.user_id !== user.id) {
      return c.json({
        success: false,
        error: 'You can only accept your own invitations'
      }, 403)
    }

    // Accept invitation
    const accepted = await collaboratorQueries.acceptInvitation(invitationId)

    if (!accepted) {
      return c.json({
        success: false,
        error: 'Failed to accept invitation'
      }, 500)
    }

    return c.json({
      success: true,
      message: 'Invitation accepted successfully'
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401)
    }

    return c.json({
      success: false,
      error: 'Failed to accept invitation'
    }, 500)
  }
})

// POST /api/collaborations/:id/decline - Decline invitation
collaborationsRouter.post('/:id/decline', async (c) => {
  try {
    const user = requireAuth(c)

    const invitationId = parseInt(c.req.param('id'))
    if (isNaN(invitationId)) {
      return c.json({
        success: false,
        error: 'Invalid invitation ID'
      }, 400)
    }

    const collaboratorQueries = new CollaboratorQueries(c.env.DB)

    // Get invitation to verify ownership
    const invitation = await collaboratorQueries.getById(invitationId)

    if (!invitation) {
      return c.json({
        success: false,
        error: 'Invitation not found'
      }, 404)
    }

    // Check if invitation belongs to current user
    if (invitation.user_id !== user.id) {
      return c.json({
        success: false,
        error: 'You can only decline your own invitations'
      }, 403)
    }

    // Decline invitation
    const declined = await collaboratorQueries.declineInvitation(invitationId)

    if (!declined) {
      return c.json({
        success: false,
        error: 'Failed to decline invitation'
      }, 500)
    }

    return c.json({
      success: true,
      message: 'Invitation declined'
    })
  } catch (error) {
    console.error('Error declining invitation:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401)
    }

    return c.json({
      success: false,
      error: 'Failed to decline invitation'
    }, 500)
  }
})

// GET /api/collaborations/project/:id - Get project collaborators
collaborationsRouter.get('/project/:id', async (c) => {
  try {
    const user = requireAuth(c)

    const projectId = parseInt(c.req.param('id'))
    if (isNaN(projectId)) {
      return c.json({
        success: false,
        error: 'Invalid project ID'
      }, 400)
    }

    const collaboratorQueries = new CollaboratorQueries(c.env.DB)

    // Check if user has access to project
    const hasAccess = await collaboratorQueries.checkAccess(user.id, projectId)

    if (!hasAccess.hasAccess) {
      return c.json({
        success: false,
        error: 'You do not have access to this project'
      }, 403)
    }

    // Get collaborators
    const collaborators = await collaboratorQueries.getProjectCollaborators(projectId)

    return c.json({
      success: true,
      data: collaborators
    })
  } catch (error) {
    console.error('Error fetching collaborators:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401)
    }

    return c.json({
      success: false,
      error: 'Failed to fetch collaborators'
    }, 500)
  }
})

// DELETE /api/collaborations/project/:id/user/:userId - Remove collaborator
collaborationsRouter.delete('/project/:id/user/:userId', async (c) => {
  try {
    const user = requireAuth(c)

    const projectId = parseInt(c.req.param('id'))
    const targetUserId = parseInt(c.req.param('userId'))

    if (isNaN(projectId) || isNaN(targetUserId)) {
      return c.json({
        success: false,
        error: 'Invalid project ID or user ID'
      }, 400)
    }

    const collaboratorQueries = new CollaboratorQueries(c.env.DB)

    // Check if user is the project owner
    const canManage = await collaboratorQueries.canManageCollaborators(user.id, projectId)

    if (!canManage) {
      return c.json({
        success: false,
        error: 'Only project owners can remove collaborators'
      }, 403)
    }

    // Remove collaborator
    const removed = await collaboratorQueries.removeCollaborator(projectId, targetUserId)

    if (!removed) {
      return c.json({
        success: false,
        error: 'Failed to remove collaborator or collaborator not found'
      }, 404)
    }

    return c.json({
      success: true,
      message: 'Collaborator removed successfully'
    })
  } catch (error) {
    console.error('Error removing collaborator:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401)
    }

    return c.json({
      success: false,
      error: 'Failed to remove collaborator'
    }, 500)
  }
})

// PUT /api/collaborations/project/:id/user/:userId - Update collaborator role
collaborationsRouter.put('/project/:id/user/:userId', async (c) => {
  try {
    const user = requireAuth(c)

    const projectId = parseInt(c.req.param('id'))
    const targetUserId = parseInt(c.req.param('userId'))

    if (isNaN(projectId) || isNaN(targetUserId)) {
      return c.json({
        success: false,
        error: 'Invalid project ID or user ID'
      }, 400)
    }

    const body = await c.req.json()

    if (!body.role || !['editor', 'viewer'].includes(body.role)) {
      return c.json({
        success: false,
        error: 'role must be either "editor" or "viewer"'
      }, 400)
    }

    const collaboratorQueries = new CollaboratorQueries(c.env.DB)

    // Check if user is the project owner
    const canManage = await collaboratorQueries.canManageCollaborators(user.id, projectId)

    if (!canManage) {
      return c.json({
        success: false,
        error: 'Only project owners can update collaborator roles'
      }, 403)
    }

    // Update collaborator role
    const updated = await collaboratorQueries.updateRole(projectId, targetUserId, body.role)

    if (!updated) {
      return c.json({
        success: false,
        error: 'Failed to update collaborator role or collaborator not found'
      }, 404)
    }

    return c.json({
      success: true,
      message: 'Collaborator role updated successfully'
    })
  } catch (error) {
    console.error('Error updating collaborator role:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401)
    }

    return c.json({
      success: false,
      error: 'Failed to update collaborator role'
    }, 500)
  }
})
