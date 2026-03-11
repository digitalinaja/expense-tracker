import { Hono } from 'hono'
import { PlanningQueries } from '../db/queries'
import { validatePlanningWithProject } from '../middleware/validation'

type Env = {
  DB: D1Database
  KV: KVNamespace
}

export const planningRouter = new Hono<{ Bindings: Env }>()

// GET /api/planning - Get all planning (optionally filtered by project)
planningRouter.get('/', async (c) => {
  try {
    const projectIdParam = c.req.query('project_id')
    const projectId = projectIdParam ? parseInt(projectIdParam) : undefined

    const planningQueries = new PlanningQueries(c.env.DB)
    const planning = await planningQueries.getAll(projectId)
    return c.json({
      success: true,
      data: planning
    })
  } catch (error) {
    console.error('Error fetching planning:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch planning'
    }, 500)
  }
})

// GET /api/planning/:id - Get single planning
planningRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid ID'
      }, 400)
    }

    const planningQueries = new PlanningQueries(c.env.DB)
    const planning = await planningQueries.getById(id)

    if (!planning) {
      return c.json({
        success: false,
        error: 'Planning not found'
      }, 404)
    }

    return c.json({
      success: true,
      data: planning
    })
  } catch (error) {
    console.error('Error fetching planning:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch planning'
    }, 500)
  }
})

// POST /api/planning - Create new planning (REQUIRES project_id)
planningRouter.post('/', validatePlanningWithProject, async (c) => {
  try {
    const body = await c.req.json()

    // Validate project_id is present and valid
    if (!body.project_id || typeof body.project_id !== 'number') {
      return c.json({
        success: false,
        error: 'project_id is required and must be a number'
      }, 400)
    }

    const planningQueries = new PlanningQueries(c.env.DB)

    const id = await planningQueries.create({
      project_id: body.project_id,
      name: body.name,
      amount: body.amount,
      date: body.date
    })

    return c.json({
      success: true,
      message: 'Planning created successfully',
      data: { id }
    }, 201)
  } catch (error) {
    console.error('Error creating planning:', error)
    return c.json({
      success: false,
      error: 'Failed to create planning'
    }, 500)
  }
})

// DELETE /api/planning/:id - Delete planning
planningRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid ID'
      }, 400)
    }

    const planningQueries = new PlanningQueries(c.env.DB)
    const deleted = await planningQueries.delete(id)

    if (!deleted) {
      return c.json({
        success: false,
        error: 'Planning not found'
      }, 404)
    }

    return c.json({
      success: true,
      message: 'Planning deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting planning:', error)
    return c.json({
      success: false,
      error: 'Failed to delete planning'
    }, 500)
  }
})

// PUT /api/planning/:id - Update planning
planningRouter.put('/:id', validatePlanningWithProject, async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid ID'
      }, 400)
    }

    const body = await c.req.json()
    const planningQueries = new PlanningQueries(c.env.DB)

    const updated = await planningQueries.update(id, {
      project_id: body.project_id,
      name: body.name,
      amount: body.amount,
      date: body.date
    })

    if (!updated) {
      return c.json({
        success: false,
        error: 'Planning not found or no changes made'
      }, 404)
    }

    return c.json({
      success: true,
      message: 'Planning updated successfully'
    })
  } catch (error) {
    console.error('Error updating planning:', error)
    return c.json({
      success: false,
      error: 'Failed to update planning'
    }, 500)
  }
})
