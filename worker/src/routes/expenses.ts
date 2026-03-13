import { Hono } from 'hono'
import { ExpenseQueries } from '../db/queries'
import { AttachmentQueries } from '../db/attachmentQueries'
import { validateExpense } from '../middleware/validation'

type Env = {
  DB: D1Database
  KV: KVNamespace
  R2: R2Bucket
}

export const expensesRouter = new Hono<{ Bindings: Env }>()

// GET /api/expenses - Get expenses (with optional search, filter, pagination)
expensesRouter.get('/', async (c) => {
  try {
    const projectIdParam = c.req.query('project_id')
    const projectId = projectIdParam ? parseInt(projectIdParam) : undefined
    const search = c.req.query('search') || undefined
    const planningIdParam = c.req.query('planning_id')
    const limitParam = c.req.query('limit')
    const offsetParam = c.req.query('offset')

    const expenseQueries = new ExpenseQueries(c.env.DB)

    // If pagination params are present, use paginated query
    if (limitParam || search || planningIdParam) {
      const limit = limitParam ? parseInt(limitParam) : 20
      const offset = offsetParam ? parseInt(offsetParam) : 0

      // Parse planning_id: 'uncategorized' or a number
      let planningId: number | 'uncategorized' | undefined
      if (planningIdParam === 'uncategorized') {
        planningId = 'uncategorized'
      } else if (planningIdParam) {
        planningId = parseInt(planningIdParam)
      }

      const result = await expenseQueries.getPaginated({
        projectId,
        search,
        planningId,
        limit,
        offset
      })

      return c.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          hasMore: result.hasMore,
          limit,
          offset
        }
      })
    }

    // Default: return all (backward compatible)
    const expenses = await expenseQueries.getAll(projectId)
    return c.json({
      success: true,
      data: expenses
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch expenses'
    }, 500)
  }
})

// GET /api/expenses/:id - Get single expense
expensesRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid ID'
      }, 400)
    }

    const expenseQueries = new ExpenseQueries(c.env.DB)
    const expense = await expenseQueries.getById(id)

    if (!expense) {
      return c.json({
        success: false,
        error: 'Expense not found'
      }, 404)
    }

    return c.json({
      success: true,
      data: expense
    })
  } catch (error) {
    console.error('Error fetching expense:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch expense'
    }, 500)
  }
})

// POST /api/expenses - Create new expense
expensesRouter.post('/', validateExpense, async (c) => {
  try {
    const body = await c.req.json()
    const expenseQueries = new ExpenseQueries(c.env.DB)

    const id = await expenseQueries.create({
      name: body.name,
      amount: body.amount,
      date: body.date,
      planning_id: body.planning_id
    })

    return c.json({
      success: true,
      message: 'Expense created successfully',
      data: { id }
    }, 201)
  } catch (error) {
    console.error('Error creating expense:', error)
    return c.json({
      success: false,
      error: 'Failed to create expense'
    }, 500)
  }
})

// DELETE /api/expenses/:id - Delete expense
expensesRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid ID'
      }, 400)
    }

    // First, get all attachments for this expense to delete from R2
    const attachmentQueries = new AttachmentQueries(c.env.DB)
    const attachments = await attachmentQueries.getByExpenseId(id)

    // Delete all attachments from R2
    for (const attachment of attachments) {
      try {
        await c.env.R2.delete(attachment.r2_key)
        console.log(`Deleted R2 object: ${attachment.r2_key}`)
      } catch (error) {
        console.error(`Failed to delete R2 object ${attachment.r2_key}:`, error)
        // Continue even if R2 delete fails
      }
    }

    // Delete expense from database (attachments will be deleted due to CASCADE)
    const expenseQueries = new ExpenseQueries(c.env.DB)
    const deleted = await expenseQueries.delete(id)

    if (!deleted) {
      return c.json({
        success: false,
        error: 'Expense not found'
      }, 404)
    }

    return c.json({
      success: true,
      message: 'Expense deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return c.json({
      success: false,
      error: 'Failed to delete expense'
    }, 500)
  }
})

// PUT /api/expenses/:id - Update expense
expensesRouter.put('/:id', validateExpense, async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid ID'
      }, 400)
    }

    const body = await c.req.json()
    const expenseQueries = new ExpenseQueries(c.env.DB)

    const updated = await expenseQueries.update(id, {
      name: body.name,
      amount: body.amount,
      date: body.date,
      planning_id: body.planning_id
    })

    if (!updated) {
      return c.json({
        success: false,
        error: 'Expense not found or no changes made'
      }, 404)
    }

    return c.json({
      success: true,
      message: 'Expense updated successfully'
    })
  } catch (error) {
    console.error('Error updating expense:', error)
    return c.json({
      success: false,
      error: 'Failed to update expense'
    }, 500)
  }
})
