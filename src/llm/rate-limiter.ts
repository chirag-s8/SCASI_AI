interface ProviderLimits {
    rpm: number; // requests per minute
    tpm: number; // tokens per minute
}

const DEFAULT_LIMITS: Record<string, ProviderLimits> = {
    GROQ_API_KEY:                  { rpm: 30,  tpm: 150_000 },
    SARVAM_API_KEY:                { rpm: 60,  tpm: 200_000 },
    OPENROUTER_API_KEY_GPT_OSS:    { rpm: 200, tpm: 1_000_000 },
    OPENROUTER_API_KEY_NEMOTRON:   { rpm: 200, tpm: 1_000_000 },
    OPENROUTER_API_KEY_QWEN3:      { rpm: 200, tpm: 1_000_000 },
    GEMINI_API_KEY:                { rpm: 60,  tpm: 500_000 },
};

const FALLBACK_LIMITS: ProviderLimits = { rpm: 60, tpm: 500_000 };

export class ProviderRateLimiter {
    private requestWindow = new Map<string, number[]>();
    private tokenWindow = new Map<string, { timestamp: number; count: number }[]>();

    private getLimits(keyGroup: string): ProviderLimits {
        return DEFAULT_LIMITS[keyGroup] ?? FALLBACK_LIMITS;
    }

    private cleanWindows(keyGroup: string) {
        const oneMinAgo = Date.now() - 60_000;

        const reqs = this.requestWindow.get(keyGroup) || [];
        this.requestWindow.set(keyGroup, reqs.filter((ts) => ts > oneMinAgo));

        const tokens = this.tokenWindow.get(keyGroup) || [];
        this.tokenWindow.set(keyGroup, tokens.filter((t) => t.timestamp > oneMinAgo));
    }

    async acquire(keyGroup: string, estimatedTokens: number = 1000): Promise<void> {
        this.cleanWindows(keyGroup);
        const limit = this.getLimits(keyGroup);

        const reqs = this.requestWindow.get(keyGroup) || [];
        const tokens = this.tokenWindow.get(keyGroup) || [];
        const currentTpm = tokens.reduce((sum, item) => sum + item.count, 0);

        if (reqs.length >= limit.rpm || currentTpm + estimatedTokens > limit.tpm) {
            let waitTime = 1000;
            if (reqs.length >= limit.rpm && reqs[0]) {
                waitTime = Math.max(waitTime, reqs[0] + 60_000 - Date.now());
            }
            if (currentTpm + estimatedTokens > limit.tpm && tokens[0]) {
                waitTime = Math.max(waitTime, tokens[0].timestamp + 60_000 - Date.now());
            }

            console.warn(`[RateLimiter] ${keyGroup} rate limited. Waiting ${waitTime}ms...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            return this.acquire(keyGroup, estimatedTokens);
        }

        const now = Date.now();
        reqs.push(now);
        tokens.push({ timestamp: now, count: estimatedTokens });
        this.requestWindow.set(keyGroup, reqs);
        this.tokenWindow.set(keyGroup, tokens);
    }

    recordActualTokens(keyGroup: string, actualTokens: number, estimatedTokens: number = 1000) {
        this.cleanWindows(keyGroup);
        const tokens = this.tokenWindow.get(keyGroup) || [];
        if (tokens.length > 0) {
            const last = tokens[tokens.length - 1];
            last.count = Math.max(0, last.count + (actualTokens - estimatedTokens));
        }
    }
}

export const rateLimiter = new ProviderRateLimiter();
