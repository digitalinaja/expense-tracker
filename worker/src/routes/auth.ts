import { Hono } from 'hono'
import { AuthService } from '../services/authService'

type Env = {
  DB: D1Database
  KV: KVNamespace
  JWT_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
}

export const authRouter = new Hono<{ Bindings: Env }>()

// GET /api/auth/google - Start OAuth flow (redirect to Google)
authRouter.get('/google', async (c) => {
  const redirectUri = c.req.query('redirect_uri') || 'http://localhost:3000'
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  // Store state in KV for verification (optional, for security)
  await c.env.KV.put(`oauth_state:${state}`, redirectUri, { expirationTtl: 600 })

  // Construct Google OAuth URL
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${new URL(c.req.url).origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    prompt: 'select_account'
  })

  return c.redirect(googleAuthUrl)
})

// GET /api/auth/google/callback - OAuth callback from Google
authRouter.get('/google/callback', async (c) => {
  try {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const error = c.req.query('error')

    // Handle user denial or error
    if (error) {
      console.error('OAuth error:', error)
      return c.redirect(`http://localhost:3000?error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return c.redirect('http://localhost:3000?error=missing_parameters')
    }

    // Verify state and get redirect URI
    const stateData = await c.env.KV.get(`oauth_state:${state}`)
    if (!stateData) {
      return c.redirect('http://localhost:3000?error=invalid_state')
    }

    const redirectUri = stateData

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${new URL(c.req.url).origin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return c.redirect(`${redirectUri}?error=token_exchange_failed`)
    }

    const tokenData = await tokenResponse.json()

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info')
      return c.redirect(`${redirectUri}?error=userinfo_failed`)
    }

    const googleUser = await userInfoResponse.json()

    // Create or update user in database
    const authService = new AuthService(c.env.DB, c.env)
    const authResponse = await authService.loginOrRegister({
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture
    })

    // Redirect back to frontend with token in hash (for security)
    const frontendUrl = new URL(redirectUri)
    frontendUrl.hash = `#token=${authResponse.token}&refreshToken=${authResponse.refreshToken}&userId=${authResponse.user.id}`

    return c.redirect(frontendUrl.toString())
  } catch (error) {
    console.error('OAuth callback error:', error)
    return c.redirect('http://localhost:3000?error=oauth_failed')
  }
})

// POST /api/auth/google - Authenticate with Google ID token (legacy, for compatibility)
authRouter.post('/google', async (c) => {
  try {
    const body = await c.req.json()

    // Validate request
    if (!body.idToken || typeof body.idToken !== 'string') {
      return c.json({
        success: false,
        error: 'idToken is required and must be a string'
      }, 400)
    }

    // Initialize auth service
    const authService = new AuthService(c.env.DB, c.env)

    // Authenticate with Google
    const authResponse = await authService.authenticateWithGoogle(body.idToken)

    return c.json({
      success: true,
      message: 'Authentication successful',
      data: authResponse
    })
  } catch (error) {
    console.error('Error during Google authentication:', error)

    if (error instanceof Error) {
      // Return specific error messages
      if (error.message.includes('Invalid Google token')) {
        return c.json({
          success: false,
          error: 'Invalid Google token'
        }, 401)
      }
      if (error.message.includes('Failed to authenticate user')) {
        return c.json({
          success: false,
          error: 'Authentication failed'
        }, 500)
      }
    }

    return c.json({
      success: false,
      error: 'Authentication failed'
    }, 500)
  }
})

// POST /api/auth/refresh - Refresh access token
authRouter.post('/refresh', async (c) => {
  try {
    const body = await c.req.json()

    // Validate request
    if (!body.refreshToken || typeof body.refreshToken !== 'string') {
      return c.json({
        success: false,
        error: 'refreshToken is required and must be a string'
      }, 400)
    }

    // Initialize auth service
    const authService = new AuthService(c.env.DB, c.env)

    // Refresh token
    const authResponse = await authService.refreshToken(body.refreshToken)

    return c.json({
      success: true,
      message: 'Token refreshed successfully',
      data: authResponse
    })
  } catch (error) {
    console.error('Error refreshing token:', error)

    if (error instanceof Error) {
      if (error.message.includes('Invalid or expired token')) {
        return c.json({
          success: false,
          error: 'Invalid or expired refresh token'
        }, 401)
      }
      if (error.message.includes('User not found')) {
        return c.json({
          success: false,
          error: 'User not found'
        }, 404)
      }
    }

    return c.json({
      success: false,
      error: 'Failed to refresh token'
    }, 500)
  }
})

// GET /api/auth/me - Get current user info (requires authentication)
authRouter.get('/me', async (c) => {
  try {
    // Get user from context (set by auth middleware)
    const user = c.get('user')

    if (!user) {
      return c.json({
        success: false,
        error: 'Not authenticated'
      }, 401)
    }

    return c.json({
      success: true,
      data: {
        id: user.id,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Error fetching user info:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch user info'
    }, 500)
  }
})

// POST /api/auth/logout - Logout (client-side token removal)
authRouter.post('/logout', async (c) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // by removing the token. If we were using session tokens in database,
    // we would invalidate the session here.

    // For future enhancement: Add token to blacklist in KV store
    // await c.env.KV.put(`blacklist:${token}`, '1', { expirationTtl: 900 })

    return c.json({
      success: true,
      message: 'Logout successful'
    })
  } catch (error) {
    console.error('Error during logout:', error)
    return c.json({
      success: false,
      error: 'Logout failed'
    }, 500)
  }
})
