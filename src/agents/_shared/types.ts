/**
 * @file src/agents/_shared/types.ts
 * Core shared types, branded primitives, and the Agent interface
 * used across ALL agent modules in the Scasi system.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Branded primitive types
// Prevent accidental mixing of IDs that are structurally identical strings.
// ---------------------------------------------------------------------------

declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

/** Opaque trace identifier — one per top-level request/invocation */
export type TraceId = Brand<string, 'TraceId'>;

/** Opaque session identifier — ties together a multi-turn conversation */
export type SessionId = Brand<string, 'SessionId'>;

/** Opaque user identifier — maps to the authenticated user in the DB */
export type UserId = Brand<string, 'UserId'>;

// Constructors — use these instead of plain string casts
export const TraceId = (id: string): TraceId => id as TraceId;
export const SessionId = (id: string): SessionId => id as SessionId;
export const UserId = (id: string): UserId => id as UserId;

// ---------------------------------------------------------------------------
// Agent names (exhaustive union — add new agents here as the system grows)
// ---------------------------------------------------------------------------

export const AgentName = z.enum([
    'rag',
    'nlp',
    'testing',
    'voice',
    'orchestrator',
]);
export type AgentName = z.infer<typeof AgentName>;

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const ErrorCode = z.enum([
    // Generic
    'UNKNOWN_ERROR',
    'VALIDATION_ERROR',
    'NOT_FOUND',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'RATE_LIMITED',
    'TIMEOUT',

    // Agent-specific
    'AGENT_INIT_FAILED',
    'AGENT_EXECUTION_FAILED',
    'AGENT_NOT_FOUND',

    // RAG
    'EMBEDDING_ERROR',
    'RETRIEVAL_ERROR',
    'CHUNK_ERROR',

    // NLP
    'NLP_PARSE_ERROR',
    'INTENT_UNRECOGNIZED',

    // Voice
    'STT_ERROR',
    'TTS_ERROR',
    'AUDIO_PROCESSING_ERROR',

    // Orchestrator
    'PIPELINE_ERROR',
    'DISPATCH_ERROR',

    // Supabase / DB
    'DB_READ_ERROR',
    'DB_WRITE_ERROR',
    'DB_CONNECTION_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

// ---------------------------------------------------------------------------
// ScasiError — structured error class used throughout the agent system
// ---------------------------------------------------------------------------

export class ScasiError extends Error {
    public readonly code: ErrorCode;
    public readonly traceId?: TraceId;
    public readonly details?: unknown;

    constructor(opts: {
        code: ErrorCode;
        message: string;
        traceId?: TraceId;
        details?: unknown;
        cause?: Error;
    }) {
        super(opts.message);
        this.name = 'ScasiError';
        this.code = opts.code;
        this.traceId = opts.traceId;
        this.details = opts.details;

        // Preserve original stack trace via Error.cause (Node 16.9+)
        if (opts.cause) {
            this.cause = opts.cause;
        }

        // Fix prototype chain for instanceof checks in transpiled environments
        Object.setPrototypeOf(this, new.target.prototype);
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            traceId: this.traceId,
            details: this.details,
        };
    }
}

// ---------------------------------------------------------------------------
// AgentContext — passed to every agent.execute() call
// ---------------------------------------------------------------------------

export interface AgentContext {
    /** High-level trace across multiple agent hops */
    traceId: TraceId;

    /** Authenticated user performing the request */
    userId: UserId;

    /** Optional session that groups multi-turn interactions */
    sessionId?: SessionId;

    /**
     * ISO 8601 timestamp of when the outermost request was received.
     * Use this rather than Date.now() when you need deterministic timestamps.
     */
    requestedAt: string;

    /** Which agent is currently executing (set by the orchestrator) */
    agentName: AgentName;

    /** AbortSignal from the incoming HTTP request — allows cancellation on client disconnect.
     *  NOT serializable — must never be persisted to DB or included in JSON responses.
     */
    signal?: AbortSignal;

    /** Arbitrary metadata bag for cross-agent data sharing */
    metadata?: Record<string, unknown>;
}

// Zod schema for runtime validation of AgentContext
export const AgentContextSchema = z.object({
    traceId: z.string().min(1).transform(TraceId),
    userId: z.string().min(1).transform(UserId),
    sessionId: z.string().min(1).transform(SessionId).optional(),
    requestedAt: z.string().datetime(),
    agentName: AgentName,
    // Note: `signal` is deliberately excluded from the Zod schema because
    // AbortSignal is not serializable and cannot be validated at runtime.
    metadata: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Agent<Req, Res> — the universal agent interface every agent must implement
// ---------------------------------------------------------------------------

/**
 * Every agent module should export a class/object that satisfies this interface.
 *
 * @typeParam Req  - The input payload type (e.g. validated with Zod)
 * @typeParam Res  - The output payload type
 */
export interface Agent<Req, Res> {
    /** Unique name for this agent within the system */
    readonly name: AgentName;

    /**
     * Execute the agent's primary logic.
     *
     * Implementations must:
     *  - Throw `ScasiError` (or subclasses) on failure
     *  - Never throw raw Error objects — always wrap them
     *  - Not mutate `ctx`
     */
    execute(ctx: AgentContext, req: Req): Promise<Res>;

    /**
     * Optional health-check hook called by the orchestrator on startup.
     * Should resolve with `true` if the agent is ready to accept requests.
     */
    healthCheck?(): Promise<boolean>;
}
