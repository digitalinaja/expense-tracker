import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { expensesRouter } from './routes/expenses'
import { planningRouter } from './routes/planning'
import { reportsRouter } from './routes/reports'
import { errorHandler } from './middleware/error'

// Environment types
type Env = {
  DB: D1Database
  KV: KVNamespace
  ENVIRONMENT: string
}

// Create Hono app with environment binding
const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'Expense Tracker API',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT || 'unknown'
  })
})

// API routes
app.route('/api/expenses', expensesRouter)
app.route('/api/planning', planningRouter)
app.route('/api/reports', reportsRouter)

// Error handler (must be last)
app.use('*', errorHandler)

// Export app for Cloudflare Workers
export default app
