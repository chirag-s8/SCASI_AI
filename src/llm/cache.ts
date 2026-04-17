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

/**
 * HybridCache — L1 in-memory + L2 Supabase persistence for embedding keys.
 *
 * Keys prefixed with "emb:" are written through to the `llm_cache` table so
 * embeddings survive server restarts. All other keys stay in-memory only.
 * Falls back silently to in-memory-only if Supabase service role key is not set.
 */
export class HybridCache implements Cache {
    private l1 = new InMemoryCache();

    private getDb() {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { getSupabaseAdmin } = require('@/lib/supabase') as typeof import('@/lib/supabase');
            return getSupabaseAdmin();
        } catch {
            return null;
        }
    }

    async get<T = unknown>(key: string): Promise<T | null> {
        const l1hit = await this.l1.get<T>(key);
        if (l1hit !== null) return l1hit;
        if (!key.startsWith('emb:')) return null;
        const db = this.getDb();
        if (!db) return null;
        try {
            const { data, error } = await db.from('llm_cache').select('value, expires_at').eq('key', key).single();
            if (error || !data) return null;
            if (new Date(data.expires_at) <= new Date()) {
                db.from('llm_cache').delete().eq('key', key).then(() => {});
                return null;
            }
            const value = data.value as T;
            await this.l1.set(key, value, new Date(data.expires_at).getTime() - Date.now());
            return value;
        } catch { return null; }
    }

    async set<T = unknown>(key: string, value: T, ttl: number = 3600000): Promise<void> {
        await this.l1.set(key, value, ttl);
        if (!key.startsWith('emb:')) return;
        const db = this.getDb();
        if (!db) return;
        try {
            await db.from('llm_cache').upsert(
                { key, value: value as object, expires_at: new Date(Date.now() + ttl).toISOString() },
                { onConflict: 'key' }
            );
        } catch { /* Non-fatal — L1 still has the value */ }
    }

    async delete(key: string): Promise<void> {
        await this.l1.delete(key);
        if (!key.startsWith('emb:')) return;
        const db = this.getDb();
        if (!db) return;
        try { await db.from('llm_cache').delete().eq('key', key); } catch { /* Non-fatal */ }
    }
}
