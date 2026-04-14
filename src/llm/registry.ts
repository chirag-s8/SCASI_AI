import { ModelConfig, ModelProvider } from './types';

/*
 * API Key → Model Group assignments:
 *
 * GROQ_API_KEY                    → Llama 3.1 8B, Llama 3.3 70B       (real-time / fast tasks)
 * SARVAM_API_KEY                  → Sarvam-2B, Sarvam-M               (primary: route / reply, multilingual)
 * OPENROUTER_API_KEY_GPT_OSS      → GPT-OSS 120B, Gemma 3 27B, Llama 3.3 70B Instruct  (extraction / summarization / reranking)
 * GEMINI_API_KEY                   → gemini-embedding-001  (embeddings, free tier)
 * OPENROUTER_API_KEY_NEMOTRON     → Nemotron 30B, Qwen3 Coder, Qwen3 Next 80B  (classification / lightweight routing)
 * OPENROUTER_API_KEY_QWEN3        → Qwen3 VL 235B Thinking, Hermes 3 Llama 3.1 405B (reasoning / judging)
 * OPENROUTER_API_KEY_HUNTER       → Hunter Alpha  (universal fallback)
 */

export const MODELS = {
    // ── Groq Models (GROQ_API_KEY) ─────────────────────────────────────
    GROQ_LLAMA_3_1_8B: {
        id: 'llama-3.1-8b-instant',
        provider: 'groq' as ModelProvider,
        apiKeyEnv: 'GROQ_API_KEY',
        contextWindow: 8192,
    },
    GROQ_LLAMA_3_3_70B: {
        id: 'llama-3.3-70b-versatile',
        provider: 'groq' as ModelProvider,
        apiKeyEnv: 'GROQ_API_KEY',
        contextWindow: 32768,
    },

    // ── Sarvam Models (SARVAM_API_KEY) — primary alongside Groq ────────
    SARVAM_2B: {
        id: 'sarvam-2b-v0.5',
        provider: 'sarvam' as ModelProvider,
        apiKeyEnv: 'SARVAM_API_KEY',
        contextWindow: 4096,
    },
    SARVAM_M: {
        id: 'sarvam-m',
        provider: 'sarvam' as ModelProvider,
        apiKeyEnv: 'SARVAM_API_KEY',
        contextWindow: 32768,
    },

    // ── OpenRouter Key 1: GPT-OSS group (OPENROUTER_API_KEY_GPT_OSS) ──
    OR_GPT_OSS_120B: {
        id: 'openai/gpt-oss-120b:free',
        provider: 'openrouter' as ModelProvider,
        apiKeyEnv: 'OPENROUTER_API_KEY_GPT_OSS',
        contextWindow: 128000,
    },
    OR_GEMINI_FLASH: {
        id: 'google/gemma-3-27b-it:free',
        provider: 'openrouter' as ModelProvider,
        apiKeyEnv: 'OPENROUTER_API_KEY_GPT_OSS',
        contextWindow: 1048576,
    },
    OR_DEEPSEEK_V3: {
        id: 'meta-llama/llama-3.3-70b-instruct:free',
        provider: 'openrouter' as ModelProvider,
        apiKeyEnv: 'OPENROUTER_API_KEY_GPT_OSS',
        contextWindow: 65536,
    },

    // ── OpenRouter Key 2: Nemotron group (OPENROUTER_API_KEY_NEMOTRON) ─
    OR_NEMOTRON_30B: {
        id: 'nvidia/nemotron-3-nano-30b-a3b:free',
        provider: 'openrouter' as ModelProvider,
        apiKeyEnv: 'OPENROUTER_API_KEY_NEMOTRON',
        contextWindow: 4096,
    },
    OR_QWEN_32B: {
        id: 'qwen/qwen3-coder:free',
        provider: 'openrouter' as ModelProvider,
        apiKeyEnv: 'OPENROUTER_API_KEY_NEMOTRON',
        contextWindow: 32768,
    },
    OR_QWEN_72B: {
        id: 'qwen/qwen3-next-80b-a3b-instruct:free',
        provider: 'openrouter' as ModelProvider,
        apiKeyEnv: 'OPENROUTER_API_KEY_NEMOTRON',
        contextWindow: 32768,
    },

    // ── OpenRouter Key 3: Qwen3 Thinking group (OPENROUTER_API_KEY_QWEN3)
    OR_QWEN3_VL_235B: {
        id: 'qwen/qwen3-vl-235b-a22b-thinking',
        provider: 'openrouter' as ModelProvider,
        apiKeyEnv: 'OPENROUTER_API_KEY_QWEN3',
        contextWindow: 32768,
    },
    OR_GEMINI_PRO: {
        id: 'nousresearch/hermes-3-llama-3.1-405b:free',
        provider: 'openrouter' as ModelProvider,
        apiKeyEnv: 'OPENROUTER_API_KEY_QWEN3',
        contextWindow: 131072,
    },

    // ── OpenRouter Key 4: Universal fallback (OPENROUTER_API_KEY_HUNTER) ─
    OR_HUNTER_ALPHA: {
        id: 'meta-llama/llama-3.1-8b-instruct:free',
        provider: 'openrouter' as ModelProvider,
        apiKeyEnv: 'OPENROUTER_API_KEY_HUNTER',
        contextWindow: 131072,
    },

    // ── Embedding Model (GEMINI_API_KEY) ────────────────────────────────
    // Google gemini-embedding-001: free tier, 768 dims via outputDimensionality (matches DB schema).
    GEMINI_EMBED_001: {
        id: 'gemini-embedding-001',
        provider: 'google' as ModelProvider,
        apiKeyEnv: 'GEMINI_API_KEY',
        contextWindow: 8192,
    },

    // ── Embedding Model (LOCAL) ─────────────────────────────────────────
    // Xenova/bge-base-en-v1.5: 768 dims (matches DB schema). 100% Free & Offline.
    LOCAL_EMBED: {
        id: 'Xenova/bge-base-en-v1.5',
        provider: 'local' as ModelProvider,
        apiKeyEnv: 'NONE',
        contextWindow: 8192,
    },
} as const satisfies Record<string, ModelConfig>;
