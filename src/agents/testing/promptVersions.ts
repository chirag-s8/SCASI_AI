/**
 * @file src/agents/testing/promptVersions.ts
 * Tracks NLP prompt template versions via content hashing.
 * Used by the eval system to detect prompt regressions between runs.
 */

import { createHash } from 'crypto';
import { CLASSIFY_SYSTEM_V1 } from '../nlp/prompts/classify.v1';
import { SUMMARIZE_SYSTEM_V1 } from '../nlp/prompts/summarize.v1';
import { REPLY_SYSTEM_V1 } from '../nlp/prompts/reply.v1';
import {
    EXPLAIN_SYSTEM_V1,
    EXTRACT_TASKS_SYSTEM_V1,
    EXTRACT_ENTITIES_SYSTEM_V1,
} from '../nlp/prompts/extract.v1';

export type PromptVersionMap = Record<string, string>;

/** Compute a short (12-char) SHA-256 fingerprint of a prompt template. */
function sha256Short(text: string): string {
    return createHash('sha256').update(text).digest('hex').slice(0, 12);
}

/**
 * Returns a map of prompt name → content hash for every versioned NLP prompt.
 * When a prompt template changes, its hash changes — enabling regression detection.
 */
export function getPromptVersions(): PromptVersionMap {
    return {
        'classify.v1': sha256Short(CLASSIFY_SYSTEM_V1),
        'summarize.v1': sha256Short(SUMMARIZE_SYSTEM_V1),
        'reply.v1': sha256Short(REPLY_SYSTEM_V1),
        'explain.v1': sha256Short(EXPLAIN_SYSTEM_V1),
        'extract_tasks.v1': sha256Short(EXTRACT_TASKS_SYSTEM_V1),
        'extract_entities.v1': sha256Short(EXTRACT_ENTITIES_SYSTEM_V1),
    };
}

/**
 * Compare two prompt version maps and return the names of prompts that changed,
 * were added, or were removed.
 *
 * Change types:
 *  - "<name>"          — hash changed (prompt template was modified)
 *  - "<name> (added)"   — key exists in current but not previous (new prompt)
 *  - "<name> (removed)" — key exists in previous but not current (deleted prompt)
 *
 * Returns an empty array if no differences are detected.
 */
export function detectPromptChanges(
    current: PromptVersionMap,
    previous: PromptVersionMap,
): string[] {
    const changed: string[] = [];
    // Sort keys for deterministic output order (helps UI diffing and test assertions)
    const allKeys = [...new Set([...Object.keys(current), ...Object.keys(previous)])].sort();

    for (const key of allKeys) {
        const curHash = current[key];
        const prevHash = previous[key];

        if (curHash === undefined) {
            // Key removed
            changed.push(`${key} (removed)`);
        } else if (prevHash === undefined) {
            // Key added
            changed.push(`${key} (added)`);
        } else if (curHash !== prevHash) {
            // Hash changed
            changed.push(key);
        }
    }

    return changed;
}
