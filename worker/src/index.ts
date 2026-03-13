import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { expensesRouter } from './routes/expenses'
import { planningRouter } from './routes/planning'
import { reportsRouter } from './routes/reports'
import { projectsRouter } from './routes/projects'
import { authRouter } from './routes/auth'
import { collaborationsRouter } from './routes/collaborations'
import { attachmentsRouter } from './routes/attachments'
import { errorHandler } from './middleware/error'
import { AuthService } from './services/authService'
import { createAuthMiddleware } from './middleware/auth'

// Environment types
type Env = {
  DB: D1Database
  KV: KVNamespace
  R2: R2Bucket
  ENVIRONMENT: string
  JWT_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
}

// Create Hono app with environment binding
const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Create auth middleware (will be initialized on each request)
const getAuthMiddleware = (c: any) => {
  const authService = new AuthService(c.env.DB, c.env)
  return createAuthMiddleware(authService)
}

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'Expense Tracker API',
    version: '2.0.0',
    environment: c.env.ENVIRONMENT || 'unknown',
    features: ['authentication', 'collaboration']
  })
})

// Public routes (no authentication required except for /me)
app.use('/api/auth/me', async (c, next) => {
  const authService = new AuthService(c.env.DB, c.env)
  const middleware = createAuthMiddleware(authService)
  return middleware(c, next)
})
app.route('/api/auth', authRouter)

// Protected routes (authentication required)
// Note: We're applying auth middleware inline to each route group
// This ensures the middleware has access to the request context
app.use('/api/projects/*', async (c, next) => {
  const authService = new AuthService(c.env.DB, c.env)
  const middleware = createAuthMiddleware(authService)
  return middleware(c, next)
})

app.use('/api/expenses/*', async (c, next) => {
  const authService = new AuthService(c.env.DB, c.env)
  const middleware = createAuthMiddleware(authService)
  return middleware(c, next)
})

app.use('/api/planning/*', async (c, next) => {
  const authService = new AuthService(c.env.DB, c.env)
  const middleware = createAuthMiddleware(authService)
  return middleware(c, next)
})

app.use('/api/reports/*', async (c, next) => {
  const authService = new AuthService(c.env.DB, c.env)
  const middleware = createAuthMiddleware(authService)
  return middleware(c, next)
})

app.use('/api/collaborations/*', async (c, next) => {
  const authService = new AuthService(c.env.DB, c.env)
  const middleware = createAuthMiddleware(authService)
  return middleware(c, next)
})

app.use('/api/attachments/*', async (c, next) => {
  const authService = new AuthService(c.env.DB, c.env)
  const middleware = createAuthMiddleware(authService)
  return middleware(c, next)
})

// API routes
app.route('/api/expenses', expensesRouter)
app.route('/api/planning', planningRouter)
app.route('/api/projects', projectsRouter)
app.route('/api/reports', reportsRouter)
app.route('/api/collaborations', collaborationsRouter)
app.route('/api/attachments', attachmentsRouter)

// Error handler (must be last)
app.use('*', errorHandler)

// Export app for Cloudflare Workers
export default app
