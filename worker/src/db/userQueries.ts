// Database query functions for Users
export interface User {
  id?: number
  google_id: string
  email: string
  name: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export interface UserData {
  google_id: string
  email: string
  name: string
  avatar_url?: string
}

// User queries
export class UserQueries {
  constructor(private db: D1Database) {}

  async getAll(): Promise<User[]> {
    const result = await this.db
      .prepare('SELECT * FROM users ORDER BY name')
      .all()
    return result.results as User[]
  }

  async getById(id: number): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first()
    return result as User | null
  }

  async getByGoogleId(googleId: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE google_id = ?')
      .bind(googleId)
      .first()
    return result as User | null
  }

  async getByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first()
    return result as User | null
  }

  async create(user: UserData): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)')
      .bind(user.google_id, user.email, user.name, user.avatar_url || null)
      .run()

    if (!result.meta.last_row_id) {
      throw new Error('Failed to create user')
    }

    return result.meta.last_row_id
  }

  async update(id: number, user: Partial<Omit<UserData, 'google_id' | 'email'>>): Promise<boolean> {
    const updates: string[] = []
    const values: any[] = []

    if (user.name !== undefined) {
      updates.push('name = ?')
      values.push(user.name)
    }
    if (user.avatar_url !== undefined) {
      updates.push('avatar_url = ?')
      values.push(user.avatar_url)
    }

    if (updates.length === 0) return false

    values.push(id)
    const result = await this.db
      .prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(...values)
      .run()

    return result.meta.changes > 0
  }

  async updateLastLogin(id: number): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(id)
      .run()

    return result.meta.changes > 0
  }

  async delete(id: number): Promise<boolean> {
    // Check if user owns any projects
    const projectsCheck = await this.db
      .prepare('SELECT COUNT(*) as count FROM projects WHERE owner_id = ?')
      .bind(id)
      .first()

    const projectCount = projectsCheck?.count as number || 0

    if (projectCount > 0) {
      throw new Error('Cannot delete user who owns projects. Transfer or delete projects first.')
    }

    const result = await this.db
      .prepare('DELETE FROM users WHERE id = ?')
      .bind(id)
      .run()

    return result.meta.changes > 0
  }

  async getOrCreateByGoogleId(googleUser: UserData): Promise<User> {
    // Try to find existing user
    const existing = await this.getByGoogleId(googleUser.google_id)
    if (existing) {
      // Update last login
      await this.updateLastLogin(existing.id!)
      return existing
    }

    // Create new user
    const userId = await this.create(googleUser)
    return await this.getById(userId)!
  }

  async searchByEmail(query: string, limit: number = 10): Promise<User[]> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email LIKE ? LIMIT ?')
      .bind(`%${query}%`, limit)
      .all()
    return result.results as User[]
  }

  async count(): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM users')
      .first()

    return (result?.count as number) || 0
  }
}
