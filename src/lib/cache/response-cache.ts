/**
 * Response cache pro opakované dotazy
 * 
 * Cachuje odpovědi na běžné dotazy aby se šetřily API volání.
 * Klíč = normalizovaný text dotazu, hodnota = odpověď + timestamp
 * 
 * MIGRACE NA PRODUKCI:
 * Nahradit za Redis/Vercel KV cache s TTL
 */

interface CacheEntry {
  response: string;
  timestamp: number;
  hits: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minut
const MAX_CACHE_SIZE = 100;

const cache = new Map<string, CacheEntry>();

function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?]+$/g, '')
    // Normalizuj čísla - "5 mil" = "5000000" = "5 milionů"
    .replace(/(\d+)\s*mil(i[oó]n[ůu]?)?/gi, (_, n) => `${parseInt(n)}000000`)
    .replace(/(\d+)\s*tis[ií]c/gi, (_, n) => `${parseInt(n)}000`);
}

export function getCachedResponse(query: string): string | null {
  const key = normalizeQuery(query);
  const entry = cache.get(key);
  
  if (!entry) return null;
  
  // Expired?
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  
  entry.hits++;
  return entry.response;
}

export function setCachedResponse(query: string, response: string): void {
  const key = normalizeQuery(query);
  
  // Evict oldest if full
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  
  cache.set(key, {
    response,
    timestamp: Date.now(),
    hits: 1,
  });
}

export function getCacheStats(): { size: number; totalHits: number } {
  let totalHits = 0;
  for (const entry of cache.values()) {
    totalHits += entry.hits;
  }
  return { size: cache.size, totalHits };
}
