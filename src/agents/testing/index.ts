/**
 * @file src/agents/testing/index.ts
 * Testing Agent
 *
 * Responsible for:
 *  - Generating synthetic test fixtures (emails, users, sessions)
 *  - Running agent health checks and assertion utilities
 *  - Providing mock data pipelines for CI/CD workflows
 *
 * TODO: Implement TestingAgent class conforming to Agent<TestingRequest, TestingResponse>
 */

export * from './types';
export * from './promptVersions';
export { EvalAgent } from './evalAgent';
export type { EvalRun, EvalResult, EvalScore, EvalCategory } from './evalAgent';
