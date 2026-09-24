/**
 * Utility functions for the backend
 * Pure functions designed for property-based testing
 */

/**
 * Normalize a string by trimming and lowercasing
 */
export function normalizeString(input: string): string {
  return input.trim().toLowerCase()
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Parse query string to object
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString)
  const result: Record<string, string> = {}
  params.forEach((value, key) => {
    result[key] = value
  })
  return result
}

/**
 * Encode data for safe transmission
 */
export function encodeData(data: string): string {
  return btoa(encodeURIComponent(data))
}

/**
 * Decode data from transmission
 */
export function decodeData(encoded: string): string {
  return decodeURIComponent(atob(encoded))
}

/**
 * Paginate array
 */
export function paginate<T>(
  array: T[],
  page: number,
  pageSize: number
): T[] {
  const start = Math.max(0, (page - 1) * pageSize)
  return array.slice(start, start + pageSize)
}

/**
 * Calculate checksum for data integrity
 */
export function calculateChecksum(data: string): number {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += data.charCodeAt(i)
  }
  return sum
}

/**
 * Validate checksum
 */
export function validateChecksum(data: string, checksum: number): boolean {
  return calculateChecksum(data) === checksum
}

/**
 * Rate limit key generator
 */
export function generateRateLimitKey(userId: string, action: string): string {
  return `${userId}:${action}`
}

/**
 * Sanitize input to prevent injection
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

/**
 * Merge objects shallowly
 */
export function mergeObjects<T extends Record<string, unknown>>(
  obj1: T,
  obj2: Partial<T>
): T {
  return { ...obj1, ...obj2 }
}

/**
 * Deep clone an object (for simple types)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    return obj.map(deepClone) as unknown as T
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T
  }
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Format timestamp
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

/**
 * Parse JSON safely
 */
export function parseJSONSafe(json: string): unknown | null {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * Compare versions (semantic versioning)
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0
    const part2 = parts2[i] || 0

    if (part1 > part2) return 1
    if (part1 < part2) return -1
  }

  return 0
}
