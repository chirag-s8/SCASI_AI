/**
 * @file src/agents/orchestrator/index.ts
 * Orchestrator Agent
 *
 * Responsible for:
 *  - Receiving top-level user requests and routing them to the correct agent(s)
 *  - Managing agent invocation order and composing multi-agent pipelines
 *  - Propagating TraceId / SessionId across all downstream agent calls
 *  - Aggregating results and returning a unified response
 *
 * TODO: Implement OrchestratorAgent class conforming to Agent<OrchestratorRequest, OrchestratorResponse>
 */

export * from './types';
