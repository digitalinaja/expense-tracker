import { Hono } from 'hono'
import { CategoryReportQueries } from '../db/queries'

type Env = {
  DB: D1Database
  KV: KVNamespace
}

export const reportsRouter = new Hono<{ Bindings: Env }>()

// GET /api/reports/by-category - Get categorized expense report
reportsRouter.get('/by-category', async (c) => {
  try {
    const reportQueries = new CategoryReportQueries(c.env.DB)
    const report = await reportQueries.getFullReport()

    return c.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('Error fetching category report:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch category report'
    }, 500)
  }
})

// GET /api/reports/uncategorized - Get uncategorized expenses report
reportsRouter.get('/uncategorized', async (c) => {
  try {
    const reportQueries = new CategoryReportQueries(c.env.DB)
    const report = await reportQueries.getUncategorizedReport()

    return c.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('Error fetching uncategorized report:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch uncategorized report'
    }, 500)
  }
})
