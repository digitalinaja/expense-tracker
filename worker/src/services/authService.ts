// Authentication Service for Google OAuth and JWT management
import { SignJWT, jwtVerify } from 'jose'
import { OAuth2Client } from 'google-auth-library'
import { UserQueries, UserData } from '../db/userQueries'

export interface GoogleUser {
  googleId: string
  email: string
  name: string
  avatarUrl?: string
}

export interface JWTPayload {
  userId: number
  email: string
  iat?: number
  exp?: number
}

export interface AuthResponse {
  user: {
    id: number
    email: string
    name: string
    avatar_url?: string
  }
  token: string
  refreshToken: string
}

export class AuthService {
  private userQueries: UserQueries
  private jwtSecret: string
  private googleClient: OAuth2Client
  private googleClientId: string

  constructor(db: D1Database, env: any) {
    this.userQueries = new UserQueries(db)
    this.jwtSecret = env.JWT_SECRET || 'your-secret-key-change-this-in-production'
    this.googleClientId = env.GOOGLE_CLIENT_ID

    // Initialize Google OAuth client
    this.googleClient = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET
    )
  }

  /**
   * Verify Google ID token and extract user information
   */
  async verifyGoogleToken(idToken: string): Promise<GoogleUser> {
    try {
      // Verify the Google ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.googleClientId
      })

      const payload = ticket.getPayload()
      if (!payload) {
        throw new Error('Invalid Google token payload')
      }

      return {
        googleId: payload.sub,
        email: payload.email!,
        name: payload.name || payload.email!.split('@')[0],
        avatarUrl: payload.picture
      }
    } catch (error) {
      console.error('Error verifying Google token:', error)
      throw new Error('Failed to verify Google token')
    }
  }

  /**
   * Generate JWT token for a user
   */
  async generateJWT(userId: number, email: string): Promise<string> {
    const secret = new TextEncoder().encode(this.jwtSecret)

    const token = await new SignJWT({ userId, email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m') // Access token expires in 15 minutes
      .sign(secret)

    return token
  }

  /**
   * Generate refresh token (longer lived)
   */
  async generateRefreshToken(userId: number, email: string): Promise<string> {
    const secret = new TextEncoder().encode(this.jwtSecret)

    const token = await new SignJWT({ userId, email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // Refresh token expires in 7 days
      .sign(secret)

    return token
  }

  /**
   * Verify JWT token and return payload
   */
  async verifyJWT(token: string): Promise<JWTPayload> {
    try {
      const secret = new TextEncoder().encode(this.jwtSecret)

      const { payload } = await jwtVerify(token, secret)

      return {
        userId: payload.userId as number,
        email: payload.email as string,
        iat: payload.iat,
        exp: payload.exp
      }
    } catch (error) {
      console.error('Error verifying JWT:', error)
      throw new Error('Invalid or expired token')
    }
  }

  /**
   * Login or register user with Google OAuth
   */
  async loginOrRegister(googleUser: GoogleUser): Promise<AuthResponse> {
    try {
      // Get or create user
      const userData: UserData = {
        google_id: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        avatar_url: googleUser.avatarUrl
      }

      const user = await this.userQueries.getOrCreateByGoogleId(userData)

      if (!user.id) {
        throw new Error('Failed to create or retrieve user')
      }

      // Generate JWT token and refresh token
      const token = await this.generateJWT(user.id, user.email)
      const refreshToken = await this.generateRefreshToken(user.id, user.email)

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url
        },
        token,
        refreshToken
      }
    } catch (error) {
      console.error('Error during login/registration:', error)
      throw new Error('Failed to authenticate user')
    }
  }

  /**
   * Authenticate user with Google ID token
   */
  async authenticateWithGoogle(idToken: string): Promise<AuthResponse> {
    const googleUser = await this.verifyGoogleToken(idToken)
    return await this.loginOrRegister(googleUser)
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = await this.verifyJWT(refreshToken)

      // Get user from database
      const user = await this.userQueries.getById(payload.userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Generate new access token and refresh token
      const token = await this.generateJWT(user.id!, user.email)
      const newRefreshToken = await this.generateRefreshToken(user.id!, user.email)

      return {
        user: {
          id: user.id!,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url
        },
        token,
        refreshToken: newRefreshToken
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
      throw new Error('Failed to refresh token')
    }
  }

  async validateTokenAndGetUser(token: string): Promise<{
    userId: number
    email: string
    id?: number
  } | null> {
    try {
      const payload = await this.verifyJWT(token)
      return {
        userId: payload.userId,
        email: payload.email,
        id: payload.userId
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Get full user object by ID
   */
  async getUserById(id: number) {
    return await this.userQueries.getById(id)
  }
}
