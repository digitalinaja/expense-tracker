import { MiddlewareHandler } from 'hono'

interface ErrorResponse {
  error: string
  message: string
  details?: any
}

export const errorHandler: MiddlewareHandler = async (c, next) => {
  try {
    await next()
  } catch (error) {
    console.error('Error:', error)

    // Handle different error types
    if (error instanceof Error) {
      const response: ErrorResponse = {
        error: 'Internal Server Error',
        message: error.message
      }

      // Add stack trace in development
      if (c.env.ENVIRONMENT === 'development') {
        response.details = {
          stack: error.stack,
          name: error.name
        }
      }

      return c.json(response, 500)
    }

    // Handle unknown errors
    return c.json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    }, 500)
  }
}
