/**
 * @file src/agents/_shared/index.ts
 * Barrel export for the _shared agent infrastructure.
 * Import everything the agent system needs from this single entry-point.
 */

// Core types & interfaces
export type {
    TraceId,
    SessionId,
    UserId,
    AgentName,
    ErrorCode,
    AgentContext,
    Agent,
} from './types';

// Named value constructors for branded types
export { TraceId, SessionId, UserId } from './types';

// Zod schemas
export { AgentContextSchema, AgentName, ErrorCode } from './types';

// Custom error class
export { MailMindError } from './types';

// Supabase helpers
export {
    getAnonClient,
    getServiceRoleClient,
    getAnonClientForUser,
} from './supabase';
export type { SupabaseClient } from './supabase';
