/**
 * @file src/agents/_shared/utils.ts
 * Shared utility functions for the agents layer.
 */

export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

export async function pMap<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    concurrency: number
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    async function worker(): Promise<void> {
        while (nextIndex < items.length) {
            const idx = nextIndex++;
            results[idx] = await fn(items[idx], idx);
        }
    }

    const workers = Array.from(
        { length: Math.min(concurrency, items.length) },
        () => worker()
    );
    await Promise.all(workers);
    return results;
}

export async function pMapSettled<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    concurrency: number
): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let nextIndex = 0;

    async function worker(): Promise<void> {
        while (nextIndex < items.length) {
            const idx = nextIndex++;
            try {
                const value = await fn(items[idx], idx);
                results[idx] = { status: 'fulfilled', value };
            } catch (reason) {
                results[idx] = { status: 'rejected', reason };
            }
        }
    }

    const workers = Array.from(
        { length: Math.min(concurrency, items.length) },
        () => worker()
    );
    await Promise.all(workers);
    return results;
}
