/**
 * Cache em memória simples com TTL.
 * Evita repetir chamadas à API CardápioWeb dentro da mesma janela de tempo.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

const TTL_MS = 10 * 60 * 1000; // 10 minutos

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function cacheSet<T>(key: string, data: T): void {
  store.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

export async function cachedFetch<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== null) return cached;
  const data = await fn();
  cacheSet(key, data);
  return data;
}
