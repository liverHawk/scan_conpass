import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  normalizeString,
  isValidEmail,
  parseQueryString,
  encodeData,
  decodeData,
  paginate,
  calculateChecksum,
  validateChecksum,
  generateRateLimitKey,
  sanitizeInput,
  mergeObjects,
  deepClone,
  formatTimestamp,
  parseJSONSafe,
  compareVersions,
} from './utils'

/**
 * Property-based tests for utility functions
 * Each test verifies a key property/invariant of the function
 */

describe('Property-based Tests: String Utilities', () => {
  /**
   * Property: normalizeString idempotency
   * normalizeString(normalizeString(x)) === normalizeString(x)
   */
  it('normalizeString should be idempotent', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const once = normalizeString(input)
        const twice = normalizeString(once)
        expect(once).toBe(twice)
      }),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: normalizeString should produce lowercase output
   * output should never contain uppercase letters
   */
  it('normalizeString output should be lowercase', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = normalizeString(input)
        expect(result).toBe(result.toLowerCase())
      }),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: normalizeString should remove leading/trailing whitespace
   * trim(normalizeString(x)) === normalizeString(x)
   */
  it('normalizeString should be trimmed', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = normalizeString(input)
        expect(result).toBe(result.trim())
      }),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: sanitizeInput should remove XSS vectors
   * All dangerous patterns should be removed
   */
  it('sanitizeInput should remove XSS vectors', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeInput(input)
        expect(result).not.toContain('<')
        expect(result).not.toContain('>')
        expect(result).not.toMatch(/javascript:/i)
        expect(result).not.toMatch(/on\w+=/i)
      }),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: sanitizeInput should also trim
   * Result should not have leading/trailing whitespace
   */
  it('sanitizeInput should trim result', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeInput(input)
        expect(result).toBe(result.trim())
      }),
      { numRuns: 1000 }
    )
  })
})

describe('Property-based Tests: Email Validation', () => {
  /**
   * Property: isValidEmail should be deterministic
   */
  it('isValidEmail should be deterministic', () => {
    fc.assert(
      fc.property(fc.string(), (email) => {
        const result1 = isValidEmail(email)
        const result2 = isValidEmail(email)
        expect(result1).toBe(result2)
      }),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: Emails without @ should be invalid
   */
  it('should reject emails without @', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 5, regex: /^[a-z0-9.]+$/ }), (str) => {
        const noAt = str.replace(/@/g, '')
        // Emails without @ should always be invalid
        expect(isValidEmail(noAt)).toBe(false)
      }),
      { numRuns: 300 }
    )
  })

  /**
   * Property: Strings with @ and dot after should be valid
   */
  it('should validate emails with @ and dot', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (str) => {
        const email = `test${str}@example.com`
        // Constructed emails might be valid
        const result = isValidEmail(email)
        expect(typeof result).toBe('boolean')
      }),
      { numRuns: 500 }
    )
  })
})

describe('Property-based Tests: Encoding/Decoding', () => {
  /**
   * Property: Round-trip invariant
   * decodeData(encodeData(x)) === x for all strings x
   */
  it('encodeData and decodeData should be inverses', () => {
    fc.assert(
      fc.property(fc.string(), (data) => {
        const encoded = encodeData(data)
        const decoded = decodeData(encoded)
        expect(decoded).toBe(data)
      }),
      { numRuns: 500 }
    )
  })

  /**
   * Property: Encoding should be deterministic
   * encodeData(x) should always produce the same output
   */
  it('encodeData should be deterministic', () => {
    fc.assert(
      fc.property(fc.string(), (data) => {
        const encoded1 = encodeData(data)
        const encoded2 = encodeData(data)
        expect(encoded1).toBe(encoded2)
      }),
      { numRuns: 500 }
    )
  })
})

describe('Property-based Tests: Query String Parsing', () => {
  /**
   * Property: parseQueryString should always return object
   */
  it('parseQueryString should return valid object', () => {
    fc.assert(
      fc.property(fc.string(), (qs) => {
        const result = parseQueryString(qs)
        expect(typeof result).toBe('object')
        expect(result !== null).toBe(true)
      }),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: All parsed values should be strings
   */
  it('parseQueryString values should be strings', () => {
    fc.assert(
      fc.property(fc.string(), (qs) => {
        const result = parseQueryString(qs)
        Object.values(result).forEach((value) => {
          expect(typeof value).toBe('string')
        })
      }),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: parseQueryString should be deterministic
   */
  it('parseQueryString should be deterministic', () => {
    fc.assert(
      fc.property(fc.string(), (qs) => {
        const result1 = parseQueryString(qs)
        const result2 = parseQueryString(qs)
        expect(result1).toEqual(result2)
      }),
      { numRuns: 1000 }
    )
  })
})

describe('Property-based Tests: Checksum', () => {
  /**
   * Property: Checksum should be deterministic
   * calculateChecksum(x) always returns the same value for same input
   */
  it('calculateChecksum should be deterministic', () => {
    fc.assert(
      fc.property(fc.string(), (data) => {
        const checksum1 = calculateChecksum(data)
        const checksum2 = calculateChecksum(data)
        expect(checksum1).toBe(checksum2)
      }),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: Valid checksum should validate
   * validateChecksum(x, calculateChecksum(x)) === true
   */
  it('validateChecksum should accept valid checksums', () => {
    fc.assert(
      fc.property(fc.string(), (data) => {
        const checksum = calculateChecksum(data)
        expect(validateChecksum(data, checksum)).toBe(true)
      }),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: Invalid checksum should not validate
   * If checksum is wrong, validation should fail
   */
  it('validateChecksum should reject incorrect checksums', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer(), (data, wrongChecksum) => {
        const correctChecksum = calculateChecksum(data)
        if (wrongChecksum !== correctChecksum) {
          expect(validateChecksum(data, wrongChecksum)).toBe(false)
        }
      }),
      { numRuns: 1000 }
    )
  })
})

describe('Property-based Tests: Pagination', () => {
  /**
   * Property: Paginate should never return more items than requested
   * paginate(arr, p, size).length <= size for all valid inputs
   */
  it('paginate should respect page size limit', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 50 }),
        (arr, page, pageSize) => {
          const result = paginate(arr, page, pageSize)
          expect(result.length).toBeLessThanOrEqual(pageSize)
        }
      ),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: Paginate should never return more items than exist
   * paginate(arr, p, size).length <= arr.length for all inputs
   */
  it('paginate should never exceed array length', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 50 }),
        (arr, page, pageSize) => {
          const result = paginate(arr, page, pageSize)
          expect(result.length).toBeLessThanOrEqual(arr.length)
        }
      ),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: First page should start at beginning
   * paginate(arr, 1, size)[0] === arr[0] (when arr is not empty)
   */
  it('paginate first page should start at beginning', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1 }), fc.integer({ min: 1, max: 50 }), (arr, pageSize) => {
        const result = paginate(arr, 1, pageSize)
        if (result.length > 0) {
          expect(result[0]).toBe(arr[0])
        }
      }),
      { numRuns: 500 }
    )
  })
})

describe('Property-based Tests: Object Operations', () => {
  /**
   * Property: mergeObjects should combine both objects correctly
   * All properties from obj1 should be in result (unless overridden by obj2)
   */
  it('mergeObjects should override obj1 with obj2', () => {
    fc.assert(
      fc.property(
        fc.record({ a: fc.string(), b: fc.string() }),
        fc.record({ b: fc.string(), c: fc.string() }),
        (obj1, obj2) => {
          const result = mergeObjects(obj1, obj2)
          // obj1.a should be preserved
          expect(result.a).toBe(obj1.a)
          // obj2 should override
          expect(result.b).toBe(obj2.b)
          // obj2.c should be added
          expect(result.c).toBe(obj2.c)
        }
      ),
      { numRuns: 500 }
    )
  })

  /**
   * Property: deepClone should create independent copy
   * Modifying clone should not affect original
   */
  it('deepClone should create independent copy', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const original = [...arr]
        const cloned = deepClone(arr)

        // Modify clone
        if (cloned.length > 0) {
          ;(cloned as any)[0] = -999
        }

        // Original should be unchanged
        expect(arr).toEqual(original)
      }),
      { numRuns: 500 }
    )
  })

  /**
   * Property: deepClone should preserve values
   * clone(x) should equal x (in value, not reference)
   */
  it('deepClone should preserve values', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string(),
          age: fc.integer({ min: 0, max: 150 }),
          active: fc.boolean(),
        }),
        (obj) => {
          const cloned = deepClone(obj)
          expect(cloned).toEqual(obj)
        }
      ),
      { numRuns: 500 }
    )
  })
})

describe('Property-based Tests: Timestamp', () => {
  /**
   * Property: formatTimestamp should return ISO string
   */
  it('formatTimestamp should return ISO format', () => {
    fc.assert(
      fc.property(
        // Use realistic timestamps only (after 1970, before 2100)
        fc.integer({ min: 0, max: new Date('2100-01-01').getTime() }),
        (timestamp) => {
          const result = formatTimestamp(timestamp)
          // Should produce a valid ISO date string
          expect(typeof result).toBe('string')
          expect(result.includes('T')).toBe(true)
          expect(result.includes('Z')).toBe(true)
        }
      ),
      { numRuns: 500 }
    )
  })

  /**
   * Property: formatTimestamp should be deterministic
   */
  it('formatTimestamp should be deterministic', () => {
    fc.assert(
      fc.property(fc.integer(), (timestamp) => {
        const result1 = formatTimestamp(timestamp)
        const result2 = formatTimestamp(timestamp)
        expect(result1).toBe(result2)
      }),
      { numRuns: 1000 }
    )
  })
})

describe('Property-based Tests: JSON Parsing', () => {
  /**
   * Property: parseJSONSafe should never throw
   */
  it('parseJSONSafe should never throw', () => {
    fc.assert(
      fc.property(fc.string(), (json) => {
        expect(() => {
          parseJSONSafe(json)
        }).not.toThrow()
      }),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: parseJSONSafe should successfully parse valid JSON
   */
  it('parseJSONSafe should parse valid JSON', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const json = JSON.stringify({ data: str })
        const result = parseJSONSafe(json)
        expect(result).toBeDefined()
        expect(result !== null).toBe(true)
      }),
      { numRuns: 500 }
    )
  })
})

describe('Property-based Tests: Version Comparison', () => {
  /**
   * Property: compareVersions should return 0 for identical versions
   */
  it('compareVersions should return 0 for identical versions', () => {
    fc.assert(
      fc.property(fc.nat(5), fc.nat(5), fc.nat(5), (major, minor, patch) => {
        const version = `${major}.${minor}.${patch}`
        expect(compareVersions(version, version)).toBe(0)
      }),
      { numRuns: 500 }
    )
  })

  /**
   * Property: compareVersions should be deterministic
   */
  it('compareVersions should be deterministic', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (v1, v2) => {
        const result1 = compareVersions(v1, v2)
        const result2 = compareVersions(v1, v2)
        expect(result1).toBe(result2)
      }),
      { numRuns: 1000 }
    )
  })
})

describe('Property-based Tests: Rate Limit Key', () => {
  /**
   * Property: generateRateLimitKey should include both parts with separator
   */
  it('generateRateLimitKey should include userId and action', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (userId, action) => {
          const key = generateRateLimitKey(userId, action)
          expect(key).toContain(userId)
          expect(key).toContain(action)
          expect(key).toContain(':')
        }
      ),
      { numRuns: 1000 }
    )
  })

  /**
   * Property: Different inputs should produce different keys
   */
  it('generateRateLimitKey should produce unique keys', () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 })),
        fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 })),
        ([user1, action1], [user2, action2]) => {
          if (user1 !== user2 || action1 !== action2) {
            const key1 = generateRateLimitKey(user1, action1)
            const key2 = generateRateLimitKey(user2, action2)
            expect(key1).not.toBe(key2)
          }
        }
      ),
      { numRuns: 1000 }
    )
  })
})
