// Authentication Middleware for JWT token validation
import { Context, Next } from 'hono'
import { AuthService } from '../services/authService'

// Extend Hono's context to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id?: number // keep this for compatibility if it was used elsewhere
      userId: number
      email: string
    }
  }
}

/**
 * Authentication middleware factory
 * Creates a middleware function that validates JWT tokens
 */
export const createAuthMiddleware = (authService: AuthService) => {
  return async (c: Context, next: Next) => {
    try {
      // Get Authorization header
      const authHeader = c.req.header('Authorization')

      if (!authHeader) {
        return c.json({
          success: false,
          error: 'Authorization header required'
        }, 401)
      }

      // Extract token from "Bearer <token>" format
      const parts = authHeader.split(' ')
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return c.json({
          success: false,
          error: 'Invalid authorization format. Use: Bearer <token>'
        }, 401)
      }

      const token = parts[1]

      // Validate token and get user info
      const user = await authService.validateTokenAndGetUser(token)

      if (!user) {
        return c.json({
          success: false,
          error: 'Invalid or expired token'
        }, 401)
      }

      // Attach user to context
      c.set('user', user)

      // Continue to next middleware/route handler
      await next()
    } catch (error) {
      console.error('Authentication error:', error)
      return c.json({
        success: false,
        error: 'Authentication failed'
      }, 500)
    }
  }
}

/**
 * Optional authentication middleware
 * Attaches user to context if token is valid, but doesn't require authentication
 */
export const createOptionalAuthMiddleware = (authService: AuthService) => {
  return async (c: Context, next: Next) => {
    try {
      const authHeader = c.req.header('Authorization')

      if (authHeader) {
        const parts = authHeader.split(' ')
        if (parts.length === 2 && parts[0] === 'Bearer') {
          const token = parts[1]
          const user = await authService.validateTokenAndGetUser(token)

          if (user) {
            c.set('user', user)
          }
        }
      }

      await next()
    } catch (error) {
      console.error('Optional authentication error:', error)
      // Continue without authentication on error
      await next()
    }
  }
}

/**
 * Helper function to get user from context
 */
export const getUserFromContext = (c: Context): {
  id?: number
  userId: number
  email: string
} | null => {
  return c.get('user') || null
}

/**
 * Helper function to require authentication
 * Throws error if user is not authenticated
 */
export const requireAuth = (c: Context): {
  id?: number
  userId: number
  email: string
} => {
  const user = getUserFromContext(c)

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}
