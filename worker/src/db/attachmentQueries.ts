/**
 * Attachment Queries for D1 Database
 * Handles all attachment-related database operations
 */

export interface Attachment {
  id?: number
  expense_id: number
  file_name: string
  original_file_name: string
  file_size: number
  mime_type: string
  r2_key: string
  width?: number
  height?: number
  created_at?: string
}

export class AttachmentQueries {
  private db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  /**
   * Create new attachment record
   */
  async create(data: Omit<Attachment, 'id' | 'created_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO attachments (
        expense_id, file_name, original_file_name, file_size,
        mime_type, r2_key, width, height
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = await stmt.bind(
      data.expense_id,
      data.file_name,
      data.original_file_name,
      data.file_size,
      data.mime_type,
      data.r2_key,
      data.width ?? null,
      data.height ?? null
    ).run()

    if (!result.success) {
      throw new Error('Failed to create attachment')
    }

    return result.meta.last_row_id
  }

  /**
   * Get attachment by ID
   */
  async getById(id: number): Promise<Attachment | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM attachments WHERE id = ?
    `)

    const result = await stmt.bind(id).first<Attachment>()

    return result || null
  }

  /**
   * Get all attachments for an expense
   */
  async getByExpenseId(expenseId: number): Promise<Attachment[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM attachments
      WHERE expense_id = ?
      ORDER BY created_at ASC
    `)

    const result = await stmt.bind(expenseId).all<Attachment>()

    return result.results
  }

  /**
   * Delete attachment by ID
   */
  async delete(id: number): Promise<boolean> {
    const stmt = this.db.prepare(`
      DELETE FROM attachments WHERE id = ?
    `)

    const result = await stmt.bind(id).run()

    return result.meta.changes > 0
  }

  /**
   * Delete all attachments for an expense
   */
  async deleteByExpenseId(expenseId: number): Promise<number> {
    const stmt = this.db.prepare(`
      DELETE FROM attachments WHERE expense_id = ?
    `)

    const result = await stmt.bind(expenseId).run()

    return result.meta.changes
  }

  /**
   * Update attachment record
   */
  async update(id: number, data: Partial<Attachment>): Promise<boolean> {
    const fields: string[] = []
    const values: any[] = []

    if (data.file_name !== undefined) {
      fields.push('file_name = ?')
      values.push(data.file_name)
    }
    if (data.original_file_name !== undefined) {
      fields.push('original_file_name = ?')
      values.push(data.original_file_name)
    }
    if (data.file_size !== undefined) {
      fields.push('file_size = ?')
      values.push(data.file_size)
    }
    if (data.mime_type !== undefined) {
      fields.push('mime_type = ?')
      values.push(data.mime_type)
    }
    if (data.r2_key !== undefined) {
      fields.push('r2_key = ?')
      values.push(data.r2_key)
    }
    if (data.width !== undefined) {
      fields.push('width = ?')
      values.push(data.width)
    }
    if (data.height !== undefined) {
      fields.push('height = ?')
      values.push(data.height)
    }

    if (fields.length === 0) {
      return false
    }

    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE attachments
      SET ${fields.join(', ')}
      WHERE id = ?
    `)

    const result = await stmt.bind(...values).run()

    return result.meta.changes > 0
  }
}
