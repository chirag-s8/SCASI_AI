import { LLMTaskType, TaskModelPolicy } from './types';
import { MODELS } from './registry';

/*
 * Task → Model assignment (each API key has dedicated responsibilities):
 *
 * GROQ_API_KEY  (fast, real-time)
 *   route   → primary: Llama 3.1 8B      fallback: Nemotron 30B
 *   reply   → primary: Llama 3.3 70B      fallback: GPT-OSS 120B
 *
 * OPENROUTER_API_KEY_GPT_OSS  (heavy extraction / summarisation / ranking)
 *   extract   → primary: GPT-OSS 120B     fallback: Groq Llama 3.3 70B
 *   summarize → primary: Gemini Flash      fallback: GPT-OSS 120B
 *   rerank    → primary: DeepSeek V3       fallback: Qwen 32B
 *
 * OPENROUTER_API_KEY_NEMOTRON  (lightweight classification)
 *   classify  → primary: Nemotron 30B      fallback: Groq Llama 3.1 8B
 *
 * OPENROUTER_API_KEY_QWEN3  (reasoning / evaluation)
 *   judge     → primary: Qwen3 VL 235B     fallback: Gemini Pro
 *
 * OPENROUTER_API_KEY_HUNTER  (universal fallback)
 *   (added to fallback chains for classify, extract, summarize, reply)
 *
 * GEMINI_API_KEY  (embeddings — free tier)
 *   embed     → gemini-embedding-001 via Gemini API (768 dims via outputDimensionality)
 */

export const taskPolicies: Record<LLMTaskType, TaskModelPolicy> = {
    route: {
        task: 'route',
        primary: MODELS.GROQ_LLAMA_3_1_8B,
        fallbackChain: [MODELS.OR_NEMOTRON_30B],
    },
    classify: {
        task: 'classify',
        primary: MODELS.OR_NEMOTRON_30B,
        fallbackChain: [MODELS.GROQ_LLAMA_3_1_8B, MODELS.OR_HUNTER_ALPHA],
    },
    extract: {
        task: 'extract',
        primary: MODELS.OR_GPT_OSS_120B,
        fallbackChain: [MODELS.GROQ_LLAMA_3_3_70B, MODELS.OR_HUNTER_ALPHA],
    },
    summarize: {
        task: 'summarize',
        primary: MODELS.OR_GEMINI_FLASH,
        fallbackChain: [MODELS.OR_GPT_OSS_120B, MODELS.OR_HUNTER_ALPHA],
    },
    reply: {
        task: 'reply',
        primary: MODELS.GROQ_LLAMA_3_3_70B,
        fallbackChain: [MODELS.OR_GPT_OSS_120B, MODELS.OR_HUNTER_ALPHA],
    },
    rerank: {
        task: 'rerank',
        primary: MODELS.OR_DEEPSEEK_V3,
        fallbackChain: [MODELS.OR_QWEN_32B, MODELS.OR_HUNTER_ALPHA],
    },
    judge: {
        task: 'judge',
        primary: MODELS.OR_QWEN3_VL_235B,
        fallbackChain: [MODELS.OR_GEMINI_PRO, MODELS.OR_HUNTER_ALPHA],
    },
    embed: {
        task: 'embed',
        primary: MODELS.GEMINI_EMBED_001,
        fallbackChain: [],
    },
};
