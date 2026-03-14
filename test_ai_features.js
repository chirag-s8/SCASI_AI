/**
 * test_ai_features.js
 * Directly tests the LLM providers and embedding endpoint used by Scasi-AI.
 * Run: node test_ai_features.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// ── Load .env.local ─────────────────────────────────────────────
function loadEnv() {
    const envPath = path.join(__dirname, '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env.local not found');
        process.exit(1);
    }
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (key && val) process.env[key] = val;
    }
}

loadEnv();

const TEST_EMAIL = {
    subject: 'Meeting Tomorrow at 3pm - Project Deadline',
    snippet: 'Hi team, just a reminder that we have an urgent meeting tomorrow at 3pm to discuss the project deadline. Please prepare your status reports.',
    from: 'manager@company.com',
    date: new Date().toISOString(),
};

async function testGroq(task) {
    const key = process.env.GROQ_API_KEY;
    if (!key) return { task, status: 'SKIP', message: 'GROQ_API_KEY not set' };

    const model = task === 'reply' ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';
    const prompt = task === 'reply'
        ? `Draft a professional reply to this email.\nSubject: ${TEST_EMAIL.subject}\nContent: ${TEST_EMAIL.snippet}\nReturn JSON: {"reply": "..."}`
        : `Classify this email.\nSubject: ${TEST_EMAIL.subject}\nSnippet: ${TEST_EMAIL.snippet}\nReturn JSON: {"category":"do_now","confidence":0.9,"priority":85,"reason":"urgent meeting"}`;

    try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 512,
                response_format: { type: 'json_object' },
            }),
        });
        if (!resp.ok) {
            const err = await resp.text();
            return { task, status: 'FAIL', message: `Groq ${model}: ${resp.status} ${err.slice(0, 200)}` };
        }
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content || '';
        return { task, status: 'PASS', model, response: content.slice(0, 200) };
    } catch (err) {
        return { task, status: 'FAIL', message: err.message };
    }
}

async function testOpenRouter(keyEnv, model, task, prompt) {
    const key = process.env[keyEnv];
    if (!key) return { task, status: 'SKIP', message: `${keyEnv} not set` };

    try {
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Scasi-AI',
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 512,
            }),
        });
        if (!resp.ok) {
            const err = await resp.text();
            return { task, status: 'FAIL', message: `${model}: ${resp.status} ${err.slice(0, 200)}` };
        }
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content || '';
        return { task, status: 'PASS', model, response: content.slice(0, 200) };
    } catch (err) {
        return { task, status: 'FAIL', message: err.message };
    }
}

async function testEmbedding() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { task: 'embed', status: 'SKIP', message: 'GEMINI_API_KEY not set' };

    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requests: [
                        { model: 'models/gemini-embedding-001', content: { parts: [{ text: 'Test embedding for email search' }] }, outputDimensionality: 768 },
                        { model: 'models/gemini-embedding-001', content: { parts: [{ text: 'Another test sentence' }] }, outputDimensionality: 768 },
                    ],
                }),
            }
        );
        if (!resp.ok) {
            const err = await resp.text();
            return { task: 'embed', status: 'FAIL', message: `${resp.status} ${err.slice(0, 300)}` };
        }
        const data = await resp.json();
        const dims = data.embeddings?.[0]?.values?.length || 0;
        const count = data.embeddings?.length || 0;
        return {
            task: 'embed',
            status: dims === 768 ? 'PASS' : 'WARN',
            model: 'gemini-embedding-001',
            message: `${count} embeddings, ${dims} dimensions${dims !== 768 ? ' (expected 768!)' : ''}`,
        };
    } catch (err) {
        return { task: 'embed', status: 'FAIL', message: err.message };
    }
}

async function main() {
    console.log('\n═══ Scasi-AI — AI Feature Test Suite ═══\n');

    const tests = [
        // Groq tasks (route, reply)
        testGroq('route'),
        testGroq('reply'),

        // OpenRouter: classify (Nemotron 30B)
        testOpenRouter(
            'OPENROUTER_API_KEY_NEMOTRON',
            'nvidia/nemotron-3-nano-30b-a3b:free',
            'classify',
            `Classify this email into a category. Subject: ${TEST_EMAIL.subject} Snippet: ${TEST_EMAIL.snippet}\nReturn JSON: {"category":"do_now","confidence":0.9,"priority":85,"reason":"urgent meeting"}`
        ),

        // OpenRouter: extract (GPT-OSS 120B)
        testOpenRouter(
            'OPENROUTER_API_KEY_GPT_OSS',
            'openai/gpt-oss-120b:free',
            'extract',
            `Extract tasks from this email. Subject: ${TEST_EMAIL.subject} Content: ${TEST_EMAIL.snippet}\nReturn JSON: {"tasks":[{"task":"Attend meeting","deadline":"tomorrow 3pm"}]}`
        ),

        // OpenRouter: summarize (Gemma 27B)
        testOpenRouter(
            'OPENROUTER_API_KEY_GPT_OSS',
            'google/gemma-3-27b-it:free',
            'summarize',
            `Summarize this email. From: ${TEST_EMAIL.from} Subject: ${TEST_EMAIL.subject} Content: ${TEST_EMAIL.snippet}\nReturn JSON: {"from":"manager@company.com","receivedDate":"today","deadline":"tomorrow 3pm","summary":"Meeting reminder for project deadline discussion"}`
        ),

        // OpenRouter: judge (Hermes 405B)
        testOpenRouter(
            'OPENROUTER_API_KEY_QWEN3',
            'nousresearch/hermes-3-llama-3.1-405b:free',
            'judge',
            `Is this email important? Subject: ${TEST_EMAIL.subject} Snippet: ${TEST_EMAIL.snippet}\nReturn JSON: {"important": true, "reason": "urgent deadline"}`
        ),

        // OpenRouter: Hunter Alpha (fallback)
        testOpenRouter(
            'OPENROUTER_API_KEY_HUNTER',
            'openrouter/hunter-alpha',
            'hunter-fallback',
            `Briefly explain why this email matters. Subject: ${TEST_EMAIL.subject}`
        ),

        // Embedding
        testEmbedding(),
    ];

    const results = await Promise.allSettled(tests);

    console.log('Task'.padEnd(18) + 'Status'.padEnd(8) + 'Model / Details');
    console.log('─'.repeat(70));

    let passed = 0, failed = 0, skipped = 0;

    for (const r of results) {
        const val = r.status === 'fulfilled' ? r.value : { task: '?', status: 'FAIL', message: r.reason?.message || 'Unknown' };
        const icon = val.status === 'PASS' ? '✅' : val.status === 'WARN' ? '⚠️' : val.status === 'SKIP' ? '⏭️' : '❌';
        const detail = val.model
            ? `${val.model}${val.message ? ' — ' + val.message : ''}`
            : (val.message || '');
        console.log(`${icon} ${val.task.padEnd(16)} ${val.status.padEnd(6)} ${detail}`);

        if (val.status === 'PASS') passed++;
        else if (val.status === 'FAIL') failed++;
        else skipped++;
    }

    console.log('─'.repeat(70));
    console.log(`\n✅ ${passed} passed  ❌ ${failed} failed  ⏭️ ${skipped} skipped\n`);

    if (failed > 0) {
        console.log('Failed test details:');
        for (const r of results) {
            const val = r.status === 'fulfilled' ? r.value : { task: '?', status: 'FAIL', message: r.reason?.message };
            if (val.status === 'FAIL') {
                console.log(`  ${val.task}: ${val.message}`);
            }
        }
        console.log();
    }
}

main().catch(console.error);
