/**
 * JWT Utility untuk decode dan validasi token
 */

export interface JWTPayload {
  userId: number
  email: string
  iat?: number
  exp?: number
}

/**
 * Decode JWT token tanpa verifikasi signature
 * Note: Hanya untuk client-side checking, jangan gunakan untuk security sensitive operations
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode payload (base64url)
    const payload = parts[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )

    return JSON.parse(jsonPayload) as JWTPayload
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

/**
 * Check jika token sudah expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token)

  if (!payload || !payload.exp) {
    // Jika tidak ada exp, anggap valid (untuk backward compatibility)
    return false
  }

  // exp dalam seconds, Date.now() dalam ms
  const expirationTime = payload.exp * 1000
  const currentTime = Date.now()

  return currentTime >= expirationTime
}

/**
 * Get waktu tersisa sebelum token expired (dalam milliseconds)
 * Returns negative jika sudah expired
 */
export function getTokenTimeRemaining(token: string): number {
  const payload = decodeToken(token)

  if (!payload || !payload.exp) {
    return Infinity
  }

  const expirationTime = payload.exp * 1000
  return expirationTime - Date.now()
}

/**
 * Check jika token akan expired dalam waktu dekat (buffer time)
 * Default buffer: 5 menit
 */
export function isTokenExpiringSoon(token: string, bufferMs: number = 5 * 60 * 1000): boolean {
  const timeRemaining = getTokenTimeRemaining(token)
  return timeRemaining <= bufferMs && timeRemaining > 0
}

/**
 * Get expiration date dari token
 */
export function getTokenExpirationDate(token: string): Date | null {
  const payload = decodeToken(token)

  if (!payload || !payload.exp) {
    return null
  }

  return new Date(payload.exp * 1000)
}
