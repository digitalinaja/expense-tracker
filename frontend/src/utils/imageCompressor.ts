/**
 * WhatsApp-like Image Compressor
 * Compresses images while maintaining good visual quality
 * Target: Reduce file size by 70-80% like WhatsApp does
 */

export interface CompressedImage {
  blob: Blob
  base64: string
  originalSize: number
  compressedSize: number
  width: number
  height: number
  mimeType: string
  compressionRatio: number
}

export class ImageCompressor {
  private readonly MAX_WIDTH = 1280 // WhatsApp max width
  private readonly MAX_HEIGHT = 1280 // WhatsApp max height
  private readonly QUALITY = 0.75 // 75% quality (WhatsApp-like)
  private readonly MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB max after compression

  /**
   * Compress an image file
   * @param file - Original image file
   * @returns Compressed image with metadata
   */
  async compressImage(file: File): Promise<CompressedImage> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const img = new Image()

        img.onload = () => {
          try {
            // Calculate new dimensions maintaining aspect ratio
            const { width, height } = this.calculateDimensions(
              img.width,
              img.height
            )

            // Create canvas for resizing
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            if (!ctx) {
              reject(new Error('Failed to get canvas context'))
              return
            }

            canvas.width = width
            canvas.height = height

            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'

            // Draw resized image
            ctx.drawImage(img, 0, 0, width, height)

            // Convert to blob with compression
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to compress image'))
                  return
                }

                const compressedSize = blob.size
                const originalSize = file.size

                // Create result object
                const result: CompressedImage = {
                  blob,
                  base64: canvas.toDataURL(file.type, this.QUALITY),
                  originalSize,
                  compressedSize,
                  width,
                  height,
                  mimeType: file.type,
                  compressionRatio: ((originalSize - compressedSize) / originalSize) * 100
                }

                // If still too large, try again with lower quality
                if (compressedSize > this.MAX_FILE_SIZE) {
                  this.compressWithLowerQuality(canvas, file.type, width, height, originalSize)
                    .then(resolve)
                    .catch(reject)
                } else {
                  resolve(result)
                }
              },
              file.type,
              this.QUALITY
            )
          } catch (error) {
            reject(error)
          }
        }

        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }

        img.src = e.target?.result as string
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsDataURL(file)
    })
  }

  /**
   * Calculate dimensions maintaining aspect ratio
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number
  ): { width: number; height: number } {
    let width = originalWidth
    let height = originalHeight

    // Scale down if exceeds max dimensions
    if (width > this.MAX_WIDTH || height > this.MAX_HEIGHT) {
      const ratio = Math.min(
        this.MAX_WIDTH / width,
        this.MAX_HEIGHT / height
      )
      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)
    }

    return { width, height }
  }

  /**
   * Compress with progressively lower quality if still too large
   */
  private async compressWithLowerQuality(
    canvas: HTMLCanvasElement,
    mimeType: string,
    width: number,
    height: number,
    originalSize: number
  ): Promise<CompressedImage> {
    const qualities = [0.6, 0.5, 0.4, 0.3]

    for (const quality of qualities) {
      try {
        const blob = await this.canvasToBlob(canvas, mimeType, quality)
        const compressedSize = blob.size

        if (compressedSize <= this.MAX_FILE_SIZE) {
          return {
            blob,
            base64: canvas.toDataURL(mimeType, quality),
            originalSize,
            compressedSize,
            width,
            height,
            mimeType,
            compressionRatio: ((originalSize - compressedSize) / originalSize) * 100
          }
        }
      } catch (error) {
        console.error(`Failed to compress with quality ${quality}:`, error)
      }
    }

    // If all qualities fail, return the last attempt
    const blob = await this.canvasToBlob(canvas, mimeType, 0.3)
    return {
      blob,
      base64: canvas.toDataURL(mimeType, 0.3),
      originalSize,
      compressedSize: blob.size,
      width,
      height,
      mimeType,
      compressionRatio: ((originalSize - blob.size) / originalSize) * 100
    }
  }

  /**
   * Helper to convert canvas to blob with Promise
   */
  private canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        },
        type,
        quality
      )
    })
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Validate if file is an image
   */
  static isValidImageFile(file: File): boolean {
    return file.type.startsWith('image/')
  }

  /**
   * Get file extension from mime type
   */
  static getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp'
    }

    return mimeToExt[mimeType] || 'jpg'
  }
}

// Export singleton instance
export const imageCompressor = new ImageCompressor()
