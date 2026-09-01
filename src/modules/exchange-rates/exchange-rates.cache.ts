import { env } from '../../config';

interface CacheEntry {
  rate: number;
  provider: string;
  fetchedAt: Date;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(from: string, to: string): string {
  return `${from}_${to}`;
}

export function getCachedRate(from: string, to: string): CacheEntry | null {
  const entry = cache.get(cacheKey(from, to));
  if (!entry) {
    return null;
  }

  const ttlMs = env.exchangeRateCacheTtlMinutes * 60 * 1000;
  const age = Date.now() - entry.fetchedAt.getTime();
  if (age > ttlMs) {
    cache.delete(cacheKey(from, to));
    return null;
  }

  return entry;
}

export function setCachedRate(from: string, to: string, rate: number, provider: string): void {
  cache.set(cacheKey(from, to), { rate, provider, fetchedAt: new Date() });
}
