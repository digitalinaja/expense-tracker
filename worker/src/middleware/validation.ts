import { MiddlewareHandler } from 'hono'

// Validation middleware for request body
export const validateExpense: MiddlewareHandler = async (c, next) => {
  try {
    const body = await c.req.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return c.json({
        error: 'Validation Error',
        message: 'Name is required and must be a string'
      }, 400)
    }

    if (!body.amount || typeof body.amount !== 'number') {
      return c.json({
        error: 'Validation Error',
        message: 'Amount is required and must be a number'
      }, 400)
    }

    if (body.amount <= 0) {
      return c.json({
        error: 'Validation Error',
        message: 'Amount must be greater than 0'
      }, 400)
    }

    if (!body.date || typeof body.date !== 'string') {
      return c.json({
        error: 'Validation Error',
        message: 'Date is required and must be a string'
      }, 400)
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(body.date)) {
      return c.json({
        error: 'Validation Error',
        message: 'Date must be in YYYY-MM-DD format'
      }, 400)
    }

    // Validate planning_id (optional)
    if (body.planning_id !== undefined && body.planning_id !== null) {
      if (typeof body.planning_id !== 'number' || body.planning_id <= 0) {
        return c.json({
          error: 'Validation Error',
          message: 'Planning ID must be a positive number'
        }, 400)
      }
    }

    await next()
  } catch (error) {
    return c.json({
      error: 'Validation Error',
      message: 'Invalid JSON body'
    }, 400)
  }
}

export const validatePlanning = validateExpense // Same validation logic
