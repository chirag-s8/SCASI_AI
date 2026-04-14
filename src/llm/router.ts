import { Groq } from 'groq-sdk';
import { LLMTaskType, ModelConfig, GenerationOptions, GenerationResult, EmbedOptions, EmbedResult } from './types';
import { taskPolicies } from './policy';
import { rateLimiter } from './rate-limiter';
import { llmCache } from './cache';
import { traceLLMCall } from './tracing';

/** Must match the vector(768) column in Supabase and hybridSearch.ts. */
const EMBED_DIM = 768;

export class LLMRouter {
    private groqClients = new Map<string, Groq>();
    private localEmbedder: any = null; // Store Transformers.js pipeline

    private getGroqClient(apiKeyEnv: string): Groq {
        let client = this.groqClients.get(apiKeyEnv);
        if (!client) {
            client = new Groq({ apiKey: process.env[apiKeyEnv] || '' });
            this.groqClients.set(apiKeyEnv, client);
        }
        return client;
    }

    private getApiKey(model: ModelConfig): string {
        return process.env[model.apiKeyEnv] || '';
    }

    private getModelFromChain(task: LLMTaskType, attempt: number): ModelConfig {
        const policy = taskPolicies[task];
        if (attempt === 0) return policy.primary;

        const fallbackIndex = attempt - 1;
        if (fallbackIndex < policy.fallbackChain.length) {
            return policy.fallbackChain[fallbackIndex];
        }

        return policy.fallbackChain[policy.fallbackChain.length - 1] || policy.primary;
    }

    private parseJsonResponse(text: string): string {
        // 1. Strip thinking tags (Qwen, DeepSeek, etc.)
        let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        // 2. Try markdown code block extraction
        const mdMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (mdMatch) {
            cleaned = mdMatch[1].trim();
        }

        // 3. If it already looks like valid JSON, return as-is
        if (/^\s*[{\[]/.test(cleaned) && /[}\]]\s*$/.test(cleaned)) {
            return cleaned;
        }

        // 4. Find the first JSON object {...} in the text
        const objStart = cleaned.indexOf('{');
        const objEnd = cleaned.lastIndexOf('}');
        if (objStart !== -1 && objEnd > objStart) {
            return cleaned.slice(objStart, objEnd + 1);
        }

        // 5. Find the first JSON array [...] in the text
        const arrStart = cleaned.indexOf('[');
        const arrEnd = cleaned.lastIndexOf(']');
        if (arrStart !== -1 && arrEnd > arrStart) {
            return cleaned.slice(arrStart, arrEnd + 1);
        }

        return cleaned;
    }

    async generateText<T = string>(
        task: LLMTaskType,
        prompt: string,
        options: GenerationOptions<T> = {}
    ): Promise<GenerationResult<T>> {
        const { schema, traceId, cacheKey, retries = 3 } = options;

        if (cacheKey) {
            const cached = await llmCache.get<GenerationResult<T>>(`gen:${cacheKey}`);
            if (cached) {
                traceLLMCall(traceId, 'generateText', 'cache-hit', Date.now(), cached);
                return cached;
            }
        }

        let attempt = 0;
        while (attempt < (taskPolicies[task].fallbackChain.length + 1)) {
            const model = this.getModelFromChain(task, attempt);

            let repairAttempt = 0;
            const currentPrompt = prompt;
            let errorContext = '';

            while (repairAttempt < retries) {
                let fullPrompt = currentPrompt;
                if (schema && repairAttempt > 0) {
                    fullPrompt += `\n\nYour previous response failed validation with error: ${errorContext}. Please fix the JSON and return ONLY valid JSON.`;
                }

                const startTime = Date.now();
                try {
                    const estTokens = (fullPrompt.length / 4) + (options.maxTokens || 1000);
                    await rateLimiter.acquire(model.apiKeyEnv, estTokens);

                    let resultText = '';
                    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

                    if (model.provider === 'groq') {
                        const groq = this.getGroqClient(model.apiKeyEnv);
                        const resp = await groq.chat.completions.create({
                            model: model.id,
                            messages: [
                                ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
                                { role: 'user' as const, content: fullPrompt }
                            ],
                            temperature: options.temperature ?? 0.7,
                            max_tokens: options.maxTokens,
                            response_format: schema ? { type: 'json_object' } : undefined
                        });

                        resultText = resp.choices[0]?.message?.content || '';
                        const rawUsage = resp.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
                        usage = {
                            promptTokens: rawUsage.prompt_tokens,
                            completionTokens: rawUsage.completion_tokens,
                            totalTokens: rawUsage.total_tokens
                        };
                    } else if (model.provider === 'openrouter') {
                        const apiKey = this.getApiKey(model);
                        const body: Record<string, unknown> = {
                            model: model.id,
                            messages: [
                                ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                                { role: 'user', content: fullPrompt }
                            ],
                            temperature: options.temperature ?? 0.7,
                            max_tokens: options.maxTokens,
                        };

                        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`,
                                'HTTP-Referer': 'http://localhost:3000',
                                'X-Title': 'Scasi-AI'
                            },
                            body: JSON.stringify(body)
                        });

                        if (!resp.ok) {
                            const errBody = await resp.text();
                            throw new Error(`OpenRouter Error: ${resp.status} ${errBody}`);
                        }

                        const data = await resp.json();
                        resultText = data.choices[0]?.message?.content || '';
                        const rawUsage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
                        usage = {
                            promptTokens: rawUsage.prompt_tokens,
                            completionTokens: rawUsage.completion_tokens,
                            totalTokens: rawUsage.total_tokens
                        };
                    } else if (model.provider === 'sarvam') {
                        const apiKey = this.getApiKey(model);
                        const body: Record<string, unknown> = {
                            model: model.id,
                            messages: [
                                ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                                { role: 'user', content: fullPrompt }
                            ],
                            temperature: options.temperature ?? 0.7,
                            max_tokens: options.maxTokens,
                        };

                        const resp = await fetch('https://api.sarvam.ai/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'api-subscription-key': apiKey,
                            },
                            body: JSON.stringify(body)
                        });

                        if (!resp.ok) {
                            const errBody = await resp.text();
                            throw new Error(`Sarvam Error: ${resp.status} ${errBody}`);
                        }

                        const data = await resp.json();
                        resultText = data.choices[0]?.message?.content || '';
                        const rawUsage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
                        usage = {
                            promptTokens: rawUsage.prompt_tokens,
                            completionTokens: rawUsage.completion_tokens,
                            totalTokens: rawUsage.total_tokens
                        };
                    }

                    rateLimiter.recordActualTokens(model.apiKeyEnv, usage.totalTokens, estTokens);

                    if (schema) {
                        const jsonString = this.parseJsonResponse(resultText);
                        try {
                            const parsedInput = JSON.parse(jsonString);
                            const validatedData = schema.parse(parsedInput);

                            const finalResult: GenerationResult<T> = { data: validatedData, usage, model: model.id };
                            traceLLMCall(traceId, 'generateText', model.id, startTime, finalResult as GenerationResult);

                            if (cacheKey) await llmCache.set(`gen:${cacheKey}`, finalResult);
                            return finalResult;
                        } catch (err: unknown) {
                            errorContext = err instanceof Error ? err.message : String(err);
                            repairAttempt++;
                            console.warn(`[LLMRouter] Schema validation failed on ${model.id} (attempt ${repairAttempt}/${retries}). Raw response: ${resultText.slice(0, 300)}`);
                            console.warn(`[LLMRouter] Parsed JSON string: ${jsonString.slice(0, 300)}`);
                            console.warn(`[LLMRouter] Error: ${errorContext}`);
                            continue;
                        }
                    }

                    const finalResult: GenerationResult<T> = { text: resultText, usage, model: model.id };
                    traceLLMCall(traceId, 'generateText', model.id, startTime, finalResult as GenerationResult);

                    if (cacheKey) await llmCache.set(`gen:${cacheKey}`, finalResult);
                    return finalResult;

                } catch (err: unknown) {
                    const errMsg = err instanceof Error ? err.message : String(err);
                    console.error(`[LLMRouter] API call failed on ${model.id} for task ${task}: ${errMsg}`);
                    traceLLMCall(traceId, 'generateText', model.id, startTime, undefined, err);
                    break;
                }
            }

            attempt++;
        }

        console.error(`[LLMRouter] All models exhausted for task: ${task}`);
        throw new Error(`All models failed for task: ${task}.`);
    }

    async *streamText(
        task: LLMTaskType,
        prompt: string,
        options: GenerationOptions = {}
    ): AsyncIterable<string> {
        const policy = taskPolicies[task];
        const modelChain = [policy.primary, ...policy.fallbackChain];
        const estPromptTokens = Math.ceil(
            (prompt.length + (options.systemPrompt?.length || 0)) / 4
        );

        for (let attempt = 0; attempt < modelChain.length; attempt++) {
            const model = modelChain[attempt];
            const startTime = Date.now();
            let collectedText = '';
            let lastError: unknown;

            try {
                yield* this.streamFromModel(model, prompt, options, (text) => { collectedText += text; });
                // Success — trace and return
                const estCompletionTokens = Math.ceil(collectedText.length / 4);
                traceLLMCall(options.traceId, 'streamText', model.id, startTime, {
                    text: collectedText,
                    usage: { promptTokens: estPromptTokens, completionTokens: estCompletionTokens, totalTokens: estPromptTokens + estCompletionTokens },
                    model: model.id,
                });
                return;
            } catch (err) {
                lastError = err;
                const errMsg = err instanceof Error ? err.message : String(err);
                console.warn(`[LLMRouter] streamText failed on ${model.id} (attempt ${attempt + 1}/${modelChain.length}): ${errMsg}`);
                traceLLMCall(options.traceId, 'streamText', model.id, startTime, undefined, lastError);

                if (attempt < modelChain.length - 1) {
                    console.warn(`[LLMRouter] streamText falling back to ${modelChain[attempt + 1].id}`);
                    continue;
                }
                throw new Error(`All models failed for streamText task: ${task}. Last error: ${errMsg}`);
            }
        }
    }

    private async *streamFromModel(
        model: ModelConfig,
        prompt: string,
        options: GenerationOptions,
        onToken: (text: string) => void
    ): AsyncIterable<string> {
        if (model.provider === 'groq') {
            const groq = this.getGroqClient(model.apiKeyEnv);
            const stream = await groq.chat.completions.create({
                model: model.id,
                messages: [
                    ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
                    { role: 'user' as const, content: prompt }
                ],
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens,
                stream: true
            });

            for await (const chunk of stream) {
                const text = chunk.choices[0]?.delta?.content || '';
                if (text) { onToken(text); yield text; }
            }

        } else if (model.provider === 'openrouter') {
            const apiKey = this.getApiKey(model);
            const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'Scasi-AI'
                },
                body: JSON.stringify({
                    model: model.id,
                    messages: [
                        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ],
                    temperature: options.temperature ?? 0.7,
                    max_tokens: options.maxTokens,
                    stream: true
                })
            });

            if (!resp.ok) throw new Error(`OpenRouter Stream Error: ${resp.status}`);
            if (!resp.body) throw new Error('No body returned from streaming API');

            const reader = resp.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                let boundary = buffer.indexOf('\n');

                while (boundary !== -1) {
                    const line = buffer.slice(0, boundary).trim();
                    buffer = buffer.slice(boundary + 1);
                    boundary = buffer.indexOf('\n');

                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') return;
                        try {
                            const data = JSON.parse(dataStr);
                            const content = data.choices[0]?.delta?.content || '';
                            if (content) { onToken(content); yield content; }
                        } catch {
                            // Incomplete SSE chunk, skip
                        }
                    }
                }
            }
        } else if (model.provider === 'sarvam') {
            const apiKey = this.getApiKey(model);
            const resp = await fetch('https://api.sarvam.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-subscription-key': apiKey,
                },
                body: JSON.stringify({
                    model: model.id,
                    messages: [
                        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ],
                    temperature: options.temperature ?? 0.7,
                    max_tokens: options.maxTokens,
                    stream: true
                })
            });

            if (!resp.ok) throw new Error(`Sarvam Stream Error: ${resp.status}`);
            if (!resp.body) throw new Error('No body returned from Sarvam streaming API');

            const reader = resp.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                let boundary = buffer.indexOf('\n');

                while (boundary !== -1) {
                    const line = buffer.slice(0, boundary).trim();
                    buffer = buffer.slice(boundary + 1);
                    boundary = buffer.indexOf('\n');

                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') return;
                        try {
                            const data = JSON.parse(dataStr);
                            const content = data.choices[0]?.delta?.content || '';
                            if (content) { onToken(content); yield content; }
                        } catch {
                            // Incomplete SSE chunk, skip
                        }
                    }
                }
            }
        }
    }

    async embed(texts: string[], options: EmbedOptions = {}): Promise<EmbedResult> {
        const startTime = Date.now();
        const { traceId } = options;
        const model = taskPolicies['embed'].primary;
        
        try {
            if (model.provider === 'local') {
                return await this.embedViaLocal(texts, model, traceId, startTime);
            }
            
            const apiKey = this.getApiKey(model);
            if (!apiKey) {
                throw new Error(`${model.apiKeyEnv} not set — embeddings disabled, FTS search will be used instead.`);
            }

            if (model.provider === 'google') {
                return await this.embedViaGemini(texts, model, apiKey, traceId, startTime);
            }
            return await this.embedViaOpenRouter(texts, model, apiKey, traceId, startTime);
        } catch (err: unknown) {
            traceLLMCall(traceId, 'embed', model.id, startTime, undefined, err);
            throw err;
        }
    }

    /**
     * Gemini batchEmbedContents API.
     * Endpoint: POST /v1beta/models/{model}:batchEmbedContents?key={apiKey}
     * Uses outputDimensionality to produce 768-dim vectors matching the DB schema.
     */
    private async embedViaGemini(
        texts: string[],
        model: ModelConfig,
        apiKey: string,
        traceId: string | undefined,
        startTime: number
    ): Promise<EmbedResult> {
        const batchSize = 100; // Gemini batch limit
        const allEmbeddings: number[][] = [];
        let totalTokens = 0;

        for (let i = 0; i < texts.length; i += batchSize) {
            const batchTexts = texts.slice(i, i + batchSize);

            const resp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:batchEmbedContents?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requests: batchTexts.map(text => ({
                            model: `models/${model.id}`,
                            content: { parts: [{ text }] },
                            outputDimensionality: EMBED_DIM,
                        })),
                    }),
                }
            );

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(`Gemini Embed Error: ${resp.status} - ${errText}`);
            }

            const data = await resp.json();
            const embeddings = (data.embeddings as Array<{ values: number[] }>).map(e => e.values);
            allEmbeddings.push(...embeddings);

            // Gemini doesn't return token counts; estimate from char length
            totalTokens += batchTexts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0);
        }

        const result: EmbedResult = {
            embeddings: allEmbeddings,
            usage: { promptTokens: totalTokens },
            model: model.id,
        };

        traceLLMCall(traceId, 'embed', model.id, startTime, result);
        return result;
    }

    /** OpenRouter /v1/embeddings (OpenAI-compatible). Kept as fallback path. */
    private async embedViaOpenRouter(
        texts: string[],
        model: ModelConfig,
        apiKey: string,
        traceId: string | undefined,
        startTime: number
    ): Promise<EmbedResult> {
        const batchSize = 100;
        const allEmbeddings: number[][] = [];
        let totalTokens = 0;

        for (let i = 0; i < texts.length; i += batchSize) {
            const batchTexts = texts.slice(i, i + batchSize);

            const resp = await fetch('https://openrouter.ai/api/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'Scasi-AI',
                },
                body: JSON.stringify({
                    model: model.id,
                    input: batchTexts,
                    dimensions: EMBED_DIM,
                }),
            });

            if (!resp.ok) {
                const errText = await resp.text();
                throw new Error(`OpenRouter Embed Error: ${resp.status} - ${errText}`);
            }

            const data = await resp.json();
            const sorted = [...(data.data as Array<{ embedding: number[]; index: number }>)]
                .sort((a, b) => a.index - b.index);
            allEmbeddings.push(...sorted.map(d => d.embedding));

            totalTokens += data.usage?.prompt_tokens ?? batchTexts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0);
        }

        const result: EmbedResult = {
            embeddings: allEmbeddings,
            usage: { promptTokens: totalTokens },
            model: model.id,
        };

        traceLLMCall(traceId, 'embed', model.id, startTime, result);
        return result;
    }

    /** Local embeddings using Transformers.js (100% Free and Offline) */
    private async embedViaLocal(
        texts: string[],
        model: ModelConfig,
        traceId: string | undefined,
        startTime: number
    ): Promise<EmbedResult> {
        if (!this.localEmbedder) {
            const { pipeline, env } = await import('@xenova/transformers');
            // Disable local models checking since we'll download from HF hub the first time
            env.allowLocalModels = false;
            // Use quantized for highly efficient CPU execution
            this.localEmbedder = await pipeline('feature-extraction', model.id, {
                quantized: true,
            });
        }
        
        let totalTokens = 0;
        const allEmbeddings: number[][] = [];

        const batchSize = 100;
        for (let i = 0; i < texts.length; i += batchSize) {
             const batchTexts = texts.slice(i, i + batchSize);
             
             const output = await this.localEmbedder(batchTexts, { pooling: 'mean', normalize: true });
             
             // The output tensor is shape [batchSize, dim]
             const data = output.tolist();
             
             if (batchTexts.length === 1 && typeof data[0] === 'number') {
                 allEmbeddings.push(data as unknown as number[]);
             } else {
                 allEmbeddings.push(...(data as unknown as number[][]));
             }
             
             // Estimate tokens based on char length
             totalTokens += batchTexts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0);
        }

        const result: EmbedResult = {
            embeddings: allEmbeddings,
            usage: { promptTokens: totalTokens },
            model: model.id,
        };

        traceLLMCall(traceId, 'embed', model.id, startTime, result);
        return result;
    }
}

export const llmRouter = new LLMRouter();
