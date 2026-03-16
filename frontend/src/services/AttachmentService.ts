import type { Attachment } from '../types'
import { apiHandler } from './ApiHandler'

/**
 * Service for managing attachments via API
 * Handles image uploads, retrievals, and deletions
 */
export class AttachmentService {
  private blobUrlCache: Map<number, string> = new Map()

  /**
   * Upload attachment for an expense
   */
  async upload(
    expenseId: number,
    file: File,
    metadata: { width: number; height: number; originalSize: number }
  ): Promise<{ id: number; r2_key: string; file_size: number; original_size: number; compression_ratio: string }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('expense_id', expenseId.toString())
    formData.append('width', metadata.width.toString())
    formData.append('height', metadata.height.toString())
    formData.append('original_size', metadata.originalSize.toString())

    return apiHandler.postFormData<{
      id: number
      r2_key: string
      file_size: number
      original_size: number
      compression_ratio: string
    }>('/attachments/upload', formData)
  }

  /**
   * Get all attachments for an expense
   */
  async getByExpenseId(expenseId: number): Promise<Attachment[]> {
    return apiHandler.get<Attachment[]>(`/attachments/expense/${expenseId}`)
  }

  /**
   * Get single attachment by ID
   */
  async getById(id: number): Promise<Attachment> {
    return apiHandler.get<Attachment>(`/attachments/${id}`)
  }

  /**
   * Get attachment file URL (plain URL without auth)
   */
  getFileUrl(id: number): string {
    return `${apiHandler.getBaseUrl()}/attachments/${id}/file`
  }

  /**
   * Fetch attachment file as blob URL with proper auth headers
   * Using ApiHandler to automatically handle tokens
   */
  async getFileBlobUrl(id: number): Promise<string> {
    // Return cached URL if available
    const cached = this.blobUrlCache.get(id)
    if (cached) return cached

    const blob = await apiHandler.getBlob(`/attachments/${id}/file`)
    const blobUrl = URL.createObjectURL(blob)
    this.blobUrlCache.set(id, blobUrl)
    return blobUrl
  }

  /**
   * Clear cached blob URLs (call when navigating away or cleaning up)
   */
  clearBlobCache(): void {
    this.blobUrlCache.forEach(url => URL.revokeObjectURL(url))
    this.blobUrlCache.clear()
  }

  /**
   * Delete attachment
   */
  async delete(id: number): Promise<void> {
    return apiHandler.delete<void>(`/attachments/${id}`)
  }
}

// Export singleton instance
export const attachmentService = new AttachmentService()
