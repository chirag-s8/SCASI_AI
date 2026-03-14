import type { GenerationResult, EmbedResult } from './types';

// Simple tracing with correlation IDs
export const traceLLMCall = (
    traceId: string | undefined,
    method: string,
    model: string,
    startTime: number,
    result?: GenerationResult<unknown> | EmbedResult,
    error?: unknown
) => {
    const tId = traceId || 'no-trace';
    const duration = Date.now() - startTime;

    if (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Tracing] ${method} | ${tId} | ${model} | Error: ${errorMsg}`);
    } else if (result) {
        const usage = result.usage;
        const tokens = 'totalTokens' in usage ? usage.totalTokens : usage.promptTokens;
        console.log(`[Tracing] ${method} | ${tId} | ${model} | ${duration}ms | Tokens: ${tokens}`);
        // Optional: write to agent_spans table or similar
    }
};
