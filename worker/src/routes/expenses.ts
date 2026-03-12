import { Hono } from 'hono'
import { ExpenseQueries, SummaryQueries } from '../db/queries'
import { validateExpense } from '../middleware/validation'

type Env = {
  DB: D1Database
  KV: KVNamespace
}

export const expensesRouter = new Hono<{ Bindings: Env }>()

// GET /api/expenses - Get all expenses (optionally filtered by project)
expensesRouter.get('/', async (c) => {
  try {
    const projectIdParam = c.req.query('project_id')
    const projectId = projectIdParam ? parseInt(projectIdParam) : undefined

    const expenseQueries = new ExpenseQueries(c.env.DB)
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
