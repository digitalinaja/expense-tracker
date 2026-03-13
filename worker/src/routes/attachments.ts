import { Hono } from 'hono'
import { AttachmentQueries } from '../db/attachmentQueries'

type Env = {
  DB: D1Database
  R2: R2Bucket
  KV: KVNamespace
}

export const attachmentsRouter = new Hono<{ Bindings: Env }>()

/**
 * POST /api/attachments/upload
 * Upload compressed image to R2 and create attachment record
 */
attachmentsRouter.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    const expenseId = formData.get('expense_id') as string | null

    // Validation
    if (!file) {
      return c.json({
        success: false,
        error: 'No file provided'
      }, 400)
    }

    if (!expenseId) {
      return c.json({
        success: false,
        error: 'expense_id is required'
      }, 400)
    }

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      return c.json({
        success: false,
        error: 'Only image files are allowed'
      }, 400)
    }

    // Validate expense exists
    const expenseStmt = c.env.DB.prepare('SELECT id FROM expenses WHERE id = ?')
    const expenseResult = await expenseStmt.bind(parseInt(expenseId)).first()

    if (!expenseResult) {
      return c.json({
        success: false,
        error: 'Expense not found'
      }, 404)
    }

    // Get file metadata
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Parse metadata from formData
    const width = parseInt(formData.get('width') as string || '0')
    const height = parseInt(formData.get('height') as string || '0')
    const originalSize = parseInt(formData.get('original_size') as string || '0')

    // Generate unique R2 key
    const timestamp = Date.now()
    const randomId = Math.floor(Math.random() * 10000)
    const extension = file.name.split('.').pop() || 'jpg'
    const r2Key = `expenses/${expenseId}/${timestamp}_${randomId}.${extension}`

    // Upload to R2
    await c.env.R2.put(r2Key, buffer, {
      httpMetadata: {
        contentType: file.type
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        expenseId: expenseId.toString()
      }
    })

    // Create attachment record in database
    const attachmentQueries = new AttachmentQueries(c.env.DB)
    const attachmentId = await attachmentQueries.create({
      expense_id: parseInt(expenseId),
      file_name: `${timestamp}_${randomId}.${extension}`,
      original_file_name: file.name,
      file_size: buffer.length,
      mime_type: file.type,
      r2_key: r2Key,
      width: width || null,
      height: height || null
    })

    return c.json({
      success: true,
      message: 'Attachment uploaded successfully',
      data: {
        id: attachmentId,
        r2_key: r2Key,
        file_size: buffer.length,
        original_size: originalSize,
        compression_ratio: originalSize > 0
          ? ((originalSize - buffer.length) / originalSize * 100).toFixed(2)
          : '0'
      }
    }, 201)

  } catch (error) {
    console.error('Error uploading attachment:', error)
    return c.json({
      success: false,
      error: 'Failed to upload attachment'
    }, 500)
  }
})

/**
 * GET /api/attachments/expense/:expenseId
 * Get all attachments for an expense
 */
attachmentsRouter.get('/expense/:expenseId', async (c) => {
  try {
    const expenseId = parseInt(c.req.param('expenseId'))

    if (isNaN(expenseId)) {
      return c.json({
        success: false,
        error: 'Invalid expense ID'
      }, 400)
    }

    const attachmentQueries = new AttachmentQueries(c.env.DB)
    const attachments = await attachmentQueries.getByExpenseId(expenseId)

    return c.json({
      success: true,
      data: attachments
    })

  } catch (error) {
    console.error('Error fetching attachments:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch attachments'
    }, 500)
  }
})

/**
 * GET /api/attachments/:id
 * Get single attachment by ID
 */
attachmentsRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))

    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid attachment ID'
      }, 400)
    }

    const attachmentQueries = new AttachmentQueries(c.env.DB)
    const attachment = await attachmentQueries.getById(id)

    if (!attachment) {
      return c.json({
        success: false,
        error: 'Attachment not found'
      }, 404)
    }

    return c.json({
      success: true,
      data: attachment
    })

  } catch (error) {
    console.error('Error fetching attachment:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch attachment'
    }, 500)
  }
})

/**
 * GET /api/attachments/:id/file
 * Get attachment file from R2 (proxy)
 */
attachmentsRouter.get('/:id/file', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))

    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid attachment ID'
      }, 400)
    }

    const attachmentQueries = new AttachmentQueries(c.env.DB)
    const attachment = await attachmentQueries.getById(id)

    if (!attachment) {
      return c.json({
        success: false,
        error: 'Attachment not found'
      }, 404)
    }

    // Get file from R2
    const object = await c.env.R2.get(attachment.r2_key)

    if (!object) {
      return c.json({
        success: false,
        error: 'File not found in storage'
      }, 404)
    }

    const headers = new Headers()
    headers.set('Content-Type', attachment.mime_type)
    headers.set('Cache-Control', 'public, max-age=31536000') // 1 year cache

    return new Response(object.body, { headers })

  } catch (error) {
    console.error('Error fetching attachment file:', error)
    return c.json({
      success: false,
      error: 'Failed to fetch file'
    }, 500)
  }
})

/**
 * DELETE /api/attachments/:id
 * Delete attachment (from R2 and database)
 */
attachmentsRouter.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))

    if (isNaN(id)) {
      return c.json({
        success: false,
        error: 'Invalid attachment ID'
      }, 400)
    }

    const attachmentQueries = new AttachmentQueries(c.env.DB)
    const attachment = await attachmentQueries.getById(id)

    if (!attachment) {
      return c.json({
        success: false,
        error: 'Attachment not found'
      }, 404)
    }

    // Delete from R2
    await c.env.R2.delete(attachment.r2_key)

    // Delete from database
    await attachmentQueries.delete(id)

    return c.json({
      success: true,
      message: 'Attachment deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting attachment:', error)
    return c.json({
      success: false,
      error: 'Failed to delete attachment'
    }, 500)
  }
})
