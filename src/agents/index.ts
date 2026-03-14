/**
 * @file src/agents/index.ts
 * Top-level barrel export for the entire agents layer.
 *
 * Usage:
 *   import { MailMindError, getServiceRoleClient, type Agent } from '@/src/agents';
 */

// Shared infrastructure (types, errors, supabase helpers)
export * from './_shared';

// Tool bridge
export { getTools, getToolByName, getToolDescriptionsForLLM } from './_shared/tool-bridge';

// Per-agent type re-exports
export * from './rag/types';
export * from './nlp/types';
export * from './testing/types';
export * from './voice/types';
export * from './orchestrator/types';
