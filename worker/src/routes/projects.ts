import { Hono } from 'hono'
import { ProjectQueries } from '../db/projectQueries'

type Env = {
  DB: D1Database
  KV: KVNamespace
}

export const projectsRouter = new Hono<{ Bindings: Env }>()

// GET /api/projects - Get all projects
projectsRouter.get('/', async (c) => {
  try {
    const projectQueries = new ProjectQueries(c.env.DB)
    const projects = await projectQueries.getAll()
    return c.json({
      success: true,
      data: projects
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch projects'
    }, 500)
  }
})

// GET /api/projects/:id/summary - Get project summary
// NOTE: This route must come BEFORE /:id to avoid route conflicts
projectsRouter.get('/:id/summary', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid ID'
      }, 400)
    }

    const projectQueries = new ProjectQueries(c.env.DB)
    const summary = await projectQueries.getSummary(id)

    return c.json({
      success: true,
      data: summary
    })
  } catch (error) {
    console.error('Error fetching project summary:', error)
    if (error instanceof Error && error.message === 'Project not found') {
      return c.json({
        success: false,
        error: 'Project not found'
      }, 404)
    }
    return c.json({
      success: false,
      error: 'Failed to fetch project summary'
    }, 500)
  }
})

// GET /api/projects/:id - Get single project
projectsRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid ID'
      }, 400)
    }

    const projectQueries = new ProjectQueries(c.env.DB)
    const project = await projectQueries.getById(id)

    if (!project) {
      return c.json({
        success: false,
        error: 'Project not found'
      }, 404)
    }

    return c.json({
      success: true,
      data: project
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch project'
    }, 500)
  }
})

// POST /api/projects - Create new project
projectsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return c.json({
        success: false,
        error: 'Name is required and must be a string'
      }, 400)
    }

    const projectQueries = new ProjectQueries(c.env.DB)
    const id = await projectQueries.create({
      name: body.name,
      description: body.description || null,
      start_date: body.start_date || null,
      end_date: body.end_date || null
    })

    return c.json({
      success: true,
      message: 'Project created successfully',
      data: { id }
    }, 201)
  } catch (error) {
    console.error('Error creating project:', error)
    return c.json({
      success: false,
      error: 'Failed to create project'
    }, 500)
  }
})

// PUT /api/projects/:id - Update project
projectsRouter.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid ID'
      }, 400)
    }

    const body = await c.req.json()
    const projectQueries = new ProjectQueries(c.env.DB)

    const updated = await projectQueries.update(id, {
      name: body.name,
      description: body.description,
      start_date: body.start_date,
      end_date: body.end_date
    })

    if (!updated) {
      return c.json({
        success: false,
        error: 'Project not found or no changes made'
      }, 404)
    }

    return c.json({
      success: true,
      message: 'Project updated successfully'
    })
  } catch (error) {
    console.error('Error updating project:', error)
    return c.json({
      success: false,
      error: 'Failed to update project'
    }, 500)
  }
})

// DELETE /api/projects/:id - Delete project
projectsRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid ID'
      }, 400)
    }

    const projectQueries = new ProjectQueries(c.env.DB)

    const deleted = await projectQueries.delete(id)

    if (!deleted) {
      return c.json({
        success: false,
        error: 'Project not found'
      }, 404)
    }

    return c.json({
      success: true,
      message: 'Project deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    if (error instanceof Error) {
      if (error.message.includes('Cannot delete project with existing planning')) {
        return c.json({
          success: false,
          error: error.message
        }, 400)
      }
    }
    return c.json({
      success: false,
      error: 'Failed to delete project'
    }, 500)
  }
})
