// Simple in-memory cache for database queries
// Helps reduce redundant database calls and improves performance for concurrent users

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private readonly defaultTTL = 60000 // 1 minute default TTL

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    const now = Date.now()
    const age = now - entry.timestamp

    // Check if cache entry has expired
    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Store data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    })
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Remove expired entries (automatic cleanup)
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp
      if (age > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Singleton instance
export const queryCache = new QueryCache()

// Run cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    queryCache.cleanup()
  }, 5 * 60 * 1000)
}

/**
 * Cache wrapper for database functions
 * Usage: const result = await withCache('key', ttl, () => db.someQuery())
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = queryCache.get<T>(key)
  if (cached !== null) {
    console.log(`📦 Cache HIT: ${key}`)
    return cached
  }

  // Cache miss - fetch data
  console.log(`🔍 Cache MISS: ${key}`)
  const data = await fetchFn()
  
  // Store in cache
  queryCache.set(key, data, ttl)
  
  return data
}

