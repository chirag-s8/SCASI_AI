export interface Cache {
    get<T = unknown>(key: string): Promise<T | null>;
    set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
}

export class InMemoryCache implements Cache {
    private cache = new Map<string, { value: unknown; expiresAt: number }>();

    async get<T = unknown>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value as T;
    }

    async set<T = unknown>(key: string, value: T, ttl: number = 3600000): Promise<void> {
        // default 1hr TTL
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttl
        });
    }

    async delete(key: string): Promise<void> {
        this.cache.delete(key);
    }
}

// Singleton cache instance
export const llmCache = new InMemoryCache();
