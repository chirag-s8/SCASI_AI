/**
 * @file src/agents/_shared/index.ts
 * Barrel export for the _shared agent infrastructure.
 * Import everything the agent system needs from this single entry-point.
 */

// Branded type constructors (also re-export their companion types)
export { TraceId, SessionId, UserId } from './types';

// Zod schemas (also re-export their companion types)
export { AgentName, ErrorCode } from './types';

// Pure types & interfaces
export type { AgentContext, Agent } from './types';

// Zod validation schema
export { AgentContextSchema } from './types';

// Custom error class
export { MailMindError } from './types';

// Supabase helpers
export {
    getAnonClient,
    getServiceRoleClient,
    getAnonClientForUser,
} from './supabase';
export type { SupabaseClient } from './supabase';

// Tool bridge
export { getTools, getToolByName, getToolDescriptionsForLLM } from './tool-bridge';
export type { ToolDefinition } from './tool-bridge';

// Shared utilities
export { estimateTokens, pMap, pMapSettled } from './utils';
