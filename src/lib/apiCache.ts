// Simple in-memory cache with TTL for external API responses

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export interface CacheStats {
  totalEntries: number;
  entries: Array<{
    key: string;
    expiresIn: number; // seconds remaining
    expiresAt: Date;
  }>;
  totalMovies: number;
}

class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

  // Get cached data if valid
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`[ApiCache] Cache HIT: ${key}`);
    return entry.data as T;
  }

  // Set cache with optional TTL (in milliseconds)
  set<T>(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiry });
    console.log(`[ApiCache] Cache SET: ${key}, expires in ${(ttl || this.defaultTTL) / 1000}s`);
  }

  // Check if cache has valid entry
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  // Clear specific key or all cache
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  // Get cache size
  get size(): number {
    return this.cache.size;
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get detailed cache statistics
  getStats(): CacheStats {
    this.cleanup(); // Clean expired entries first
    const now = Date.now();
    let totalMovies = 0;
    const entries: CacheStats['entries'] = [];

    for (const [key, entry] of this.cache.entries()) {
      const expiresIn = Math.max(0, Math.round((entry.expiry - now) / 1000));
      entries.push({
        key,
        expiresIn,
        expiresAt: new Date(entry.expiry),
      });

      // Count movies from cached responses
      if (entry.data?.data?.items) {
        totalMovies += entry.data.data.items.length;
      } else if (entry.data?.items) {
        totalMovies += entry.data.items.length;
      }
    }

    // Sort by expiry time (soonest first)
    entries.sort((a, b) => a.expiresIn - b.expiresIn);

    return {
      totalEntries: this.cache.size,
      entries,
      totalMovies,
    };
  }
}

// Singleton instance
export const apiCache = new ApiCache();

// Helper function for cached fetch
export async function cachedFetch<T>(
  url: string,
  options?: {
    ttl?: number; // Cache TTL in milliseconds
    forceRefresh?: boolean; // Skip cache and fetch fresh
  }
): Promise<T> {
  const cacheKey = url;
  
  // Check cache first (unless force refresh)
  if (!options?.forceRefresh) {
    const cached = apiCache.get<T>(cacheKey);
    if (cached) return cached;
  }

  // Fetch from API
  console.log(`[ApiCache] Fetching: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Cache the response
  apiCache.set(cacheKey, data, options?.ttl);
  
  return data;
}

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  SHORT: 2 * 60 * 1000,     // 2 minutes - for frequently updated data
  MEDIUM: 5 * 60 * 1000,    // 5 minutes - default
  LONG: 15 * 60 * 1000,     // 15 minutes - for rarely changing data
  HALF_HOUR: 30 * 60 * 1000, // 30 minutes
  HOUR: 60 * 60 * 1000,     // 1 hour - for static data
};

// Get dynamic TTL from minutes setting
export function getCacheTTL(minutes: string | null | undefined): number {
  const mins = parseInt(minutes || "5", 10);
  if (isNaN(mins) || mins < 1) return CACHE_TTL.MEDIUM;
  return mins * 60 * 1000;
}
