// Utility functions for validation

/**
 * Validate expense/planning form data
 */
export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validateExpenseFormData(data: {
  name: string
  amount: number | string
  date: string
}): ValidationResult {
  const errors: Record<string, string> = {}

  // Validate name
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.name = 'Nama pengeluaran harus diisi'
  } else if (data.name.trim().length < 3) {
    errors.name = 'Nama pengeluaran minimal 3 karakter'
  } else if (data.name.trim().length > 100) {
    errors.name = 'Nama pengeluaran maksimal 100 karakter'
  }

  // Validate amount
  const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount
  if (isNaN(amount)) {
    errors.amount = 'Jumlah harus berupa angka'
  } else if (amount <= 0) {
    errors.amount = 'Jumlah harus lebih dari 0'
  } else if (amount > 1000000000) {
    errors.amount = 'Jumlah terlalu besar'
  }

  // Validate date
  if (!data.date || typeof data.date !== 'string') {
    errors.date = 'Tanggal harus diisi'
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(data.date)) {
      errors.date = 'Format tanggal harus YYYY-MM-DD'
    } else {
      const date = new Date(data.date)
      if (isNaN(date.getTime())) {
        errors.date = 'Tanggal tidak valid'
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number (Indonesian format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/
  return phoneRegex.test(phone.replace(/[\s-]/g, ''))
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate if input is safe (no dangerous characters)
 */
export function isInputSafe(input: string): boolean {
  const dangerousChars = /<script|javascript:|onerror|onload|onclick/i
  return !dangerousChars.test(input)
}

/**
 * Validate project form data
 */
export function validateProjectFormData(data: {
  name: string
  description?: string
  start_date?: string
  end_date?: string
}): ValidationResult {
  const errors: Record<string, string> = {}

  // Validate name
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.name = 'Nama project harus diisi'
  } else if (data.name.trim().length < 3) {
    errors.name = 'Nama project minimal 3 karakter'
  } else if (data.name.trim().length > 100) {
    errors.name = 'Nama project maksimal 100 karakter'
  }

  // Validate description (optional)
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description === 'string' && data.description.trim().length > 500) {
      errors.description = 'Deskripsi maksimal 500 karakter'
    }
  }

  // Validate dates (optional)
  const startDate = data.start_date ? new Date(data.start_date) : null
  const endDate = data.end_date ? new Date(data.end_date) : null

  if (data.start_date && isNaN(startDate!.getTime())) {
    errors.dates = 'Tanggal mulai tidak valid'
  }

  if (data.end_date && isNaN(endDate!.getTime())) {
    errors.dates = 'Tanggal selesai tidak valid'
  }

  // Validate date range logic
  if (startDate && endDate && startDate > endDate) {
    errors.dates = 'Tanggal mulai tidak boleh setelah tanggal selesai'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}
