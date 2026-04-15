import { z } from 'zod';

export type LLMTaskType =
    | 'route'
    | 'classify'
    | 'extract'
    | 'summarize'
    | 'reply'
    | 'rerank'
    | 'judge'
    | 'embed';

export type ModelProvider = 'groq' | 'openrouter' | 'google' | 'local' | 'sarvam';

export interface ModelConfig {
    id: string; // The specific string used by the provider
    provider: ModelProvider;
    apiKeyEnv: string; // Environment variable name holding the API key for this model
    contextWindow: number;
}

export interface TaskModelPolicy {
    task: LLMTaskType;
    primary: ModelConfig;
    fallbackChain: ModelConfig[];
}

export interface GenerationOptions<T = unknown> {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    schema?: z.ZodType<T>; // Zod schema for JSON validation
    traceId?: string;
    cacheKey?: string;
    retries?: number; // for auto-repair loop
    signal?: AbortSignal; // Allows cancellation of in-flight HTTP requests
}

export interface GenerationResult<T = string> {
    text?: string;
    data?: T; // Parsed JSON data if schema provided
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
}

export interface EmbedOptions {
    traceId?: string;
    signal?: AbortSignal; // Allows cancellation of in-flight embedding requests
}

export interface EmbedResult {
    embeddings: number[][];
    usage: {
        promptTokens: number;
    };
    model: string;
}
