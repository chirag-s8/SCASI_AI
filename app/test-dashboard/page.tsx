'use client';

import { useEffect, useState } from 'react';
import type { EvalRun, EvalResult, EvalScore } from '@/src/agents/testing/evalAgent';

// ─── Types for history entries (lighter than full EvalRun) ────────────────────
interface EvalHistoryEntry {
  runId: string;
  timestamp: string;
  promptVersions: Record<string, string>;
  summary: EvalRun['summary'];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  priority_accuracy: 'Priority Accuracy',
  reply_quality: 'Reply Quality',
  summary_completeness: 'Summary Completeness',
  rag_retrieval_precision: 'RAG Retrieval',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  priority_accuracy: 'Is the AI-assigned priority score reasonable for each email?',
  reply_quality: 'Professional tone, no hallucinated commitments, addresses all points',
  summary_completeness: 'Captures from/date/deadline/key info from the original email',
  rag_retrieval_precision: 'Are retrieved chunks relevant to the query email?',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBadge({ score, passed, skipped }: { score: number; passed: boolean; skipped?: boolean }) {
  // Skipped scores get a neutral gray badge with dash instead of 0
  if (skipped) {
    return (
      <span style={{
        background: '#9ca3af', color: 'white', borderRadius: 6,
        padding: '2px 10px', fontSize: 12, fontWeight: 700,
        display: 'inline-block',
      }}>
        —
      </span>
    );
  }
  const bg = passed ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  return (
    <span style={{
      background: bg, color: 'white', borderRadius: 6,
      padding: '2px 10px', fontSize: 12, fontWeight: 700,
      display: 'inline-block',
    }}>
      {score}
    </span>
  );
}

function CategoryRow({ s }: { s: EvalScore }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      gap: 8, padding: '8px 0', borderBottom: '1px solid #f1f5f9',
      opacity: s.skipped ? 0.6 : 1,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
          {CATEGORY_LABELS[s.category] ?? s.category}
          {s.skipped && (
            <span style={{
              fontSize: 10, marginLeft: 6, background: '#9ca3af', color: 'white',
              borderRadius: 4, padding: '1px 5px', fontWeight: 700,
            }}>
              SKIPPED
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>
          {s.reasoning}
        </div>
      </div>
      <ScoreBadge score={s.score} passed={s.passed} skipped={s.skipped} />
    </div>
  );
}

function EmailCard({ result, index }: { result: EvalResult; index: number }) {
  const [open, setOpen] = useState(false);
  const borderColor = result.passed ? '#16a34a' : '#dc2626';

  return (
    <div style={{
      border: `1.5px solid ${borderColor}`, borderRadius: 10,
      overflow: 'hidden', background: 'white',
      transition: 'box-shadow 0.2s',
      boxShadow: open ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', textAlign: 'left', padding: '12px 16px',
          background: result.passed ? '#f0fdf4' : '#fef2f2',
          border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: '#9ca3af', marginRight: 8 }}>#{index + 1}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{result.subject}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#6b7280' }}>{result.durationMs}ms</span>
          <ScoreBadge score={result.overallScore} passed={result.passed} />
          <span style={{ fontSize: 12, color: '#6b7280' }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding: '12px 16px' }}>
          {result.scores.map((s) => <CategoryRow key={s.category} s={s} />)}
        </div>
      )}
    </div>
  );
}

function PromptVersionsCard({
  current,
  previous,
}: {
  current: Record<string, string>;
  previous?: Record<string, string>;
}) {
  // Build a merged list of all prompt names (current + previous)
  // so removed prompts are visible in the UI
  const allNames = [...new Set([
    ...Object.keys(current),
    ...(previous ? Object.keys(previous) : []),
  ])].sort();

  if (allNames.length === 0) return null;

  // Detect removed prompts: exist in previous but not in current
  const removedNames = previous
    ? Object.keys(previous).filter(name => !(name in current))
    : [];

  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: 20,
      marginBottom: 20, border: '1px solid #e5e7eb',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
        🔑 Prompt Version Fingerprints
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
        {allNames.map((name) => {
          const hash = current[name];
          const prevHash = previous?.[name];
          const isRemoved = hash === undefined && prevHash !== undefined;
          const changed = prevHash !== undefined && hash !== undefined && prevHash !== hash;
          const isNew = prevHash === undefined && previous !== undefined && hash !== undefined;
          const isUnchanged = prevHash !== undefined && hash !== undefined && prevHash === hash;

          return (
            <div
              key={name}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 8,
                background: isRemoved ? '#fef2f2' : changed ? '#fef3c7' : '#f8fafc',
                border: `1px solid ${isRemoved ? '#fca5a5' : changed ? '#f59e0b' : '#e5e7eb'}`,
                opacity: isRemoved ? 0.7 : 1,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: isRemoved ? '#9ca3af' : '#374151' }}>{name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {hash && (
                  <code style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>
                    {hash}
                  </code>
                )}
                {isRemoved && (
                  <>
                    <code style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', textDecoration: 'line-through' }}>
                      {prevHash}
                    </code>
                    <span style={{ fontSize: 10, background: '#dc2626', color: 'white', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
                      REMOVED
                    </span>
                  </>
                )}
                {changed && (
                  <>
                    <code style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', textDecoration: 'line-through' }}>
                      {prevHash}
                    </code>
                    <span style={{ fontSize: 9, color: '#6b7280', margin: '0 2px' }}>→</span>
                    <span style={{ fontSize: 10, background: '#f59e0b', color: 'white', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
                      CHANGED
                    </span>
                  </>
                )}
                {isNew && (
                  <span style={{ fontSize: 10, background: '#6d28d9', color: 'white', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
                    NEW
                  </span>
                )}
                {isUnchanged && (
                  <span style={{ fontSize: 10, color: '#16a34a' }}>✓</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {previous && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>
          Compared against previous eval run
          {removedNames.length > 0 && (
            <span style={{ color: '#dc2626', marginLeft: 8 }}>
              ⚠ {removedNames.length} prompt{removedNames.length > 1 ? 's' : ''} removed
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryPanel({
  runs,
  loading,
  selectedRunId,
  onSelect,
}: {
  runs: EvalHistoryEntry[];
  loading: boolean;
  selectedRunId: string | null;
  onSelect: (run: EvalHistoryEntry) => void;
}) {
  if (loading) {
    return (
      <div style={{ fontSize: 12, color: '#9ca3af', padding: '12px 0' }}>
        Loading eval history…
      </div>
    );
  }

  if (runs.length === 0) return null;

  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: 16,
      marginBottom: 20, border: '1px solid #e5e7eb',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
        📋 Previous Eval Runs
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {runs.map((run) => {
          const isSelected = run.runId === selectedRunId;
          return (
            <button
              key={run.runId}
              onClick={() => onSelect(run)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 8,
                border: isSelected ? '2px solid #6d28d9' : '1px solid #e5e7eb',
                background: isSelected ? '#f5f3ff' : '#f8fafc',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                  {new Date(run.timestamp).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {run.runId}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 14, fontWeight: 800,
                  color: (run.summary?.passRate ?? 0) >= 70 ? '#16a34a' : '#dc2626',
                }}>
                  {run.summary?.passRate ?? 0}%
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>
                  {run.summary?.passed ?? 0}/{run.summary?.total ?? 0} passed
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ evalRun, previousRun }: { evalRun: EvalRun; previousRun?: EvalHistoryEntry }) {
  const s = evalRun.summary;
  const prev = previousRun?.summary;

  function delta(current: number, previous: number | undefined): string {
    if (previous === undefined) return '';
    const diff = current - previous;
    if (diff === 0) return '';
    return diff > 0 ? ` ↑${diff}` : ` ↓${Math.abs(diff)}`;
  }

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #e5e7eb' }}>
      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 'clamp(12px, 3vw, 24px)', marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          {
            label: 'Pass Rate',
            value: `${s.passRate}%`,
            color: s.passRate >= 70 ? '#16a34a' : '#dc2626',
            deltaStr: delta(s.passRate, prev?.passRate),
          },
          {
            label: 'Avg Score',
            value: s.avgScore,
            color: '#2563eb',
            deltaStr: delta(s.avgScore, prev?.avgScore),
          },
          {
            label: 'Passed',
            value: s.passed,
            color: '#16a34a',
            deltaStr: delta(s.passed, prev?.passed),
          },
          {
            label: 'Failed',
            value: s.failed,
            color: '#dc2626',
            deltaStr: delta(s.failed, prev?.failed),
          },
        ].map(({ label, value, color, deltaStr }) => (
          <div key={label} style={{ textAlign: 'center', minWidth: 60, flex: '1 1 auto' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>
              {value}
              {deltaStr && (
                <span style={{
                  fontSize: 11, fontWeight: 600, marginLeft: 4,
                  color: deltaStr.includes('↑') ? '#16a34a' : '#dc2626',
                }}>
                  {deltaStr}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Per-category bars */}
      {Object.entries(s.byCategory).map(([cat, stats]) => {
        const prevCat = prev?.byCategory?.[cat];
        return (
          <div key={cat} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <div>
                <span style={{ fontWeight: 600, color: '#374151' }}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
                <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6 }}>
                  {CATEGORY_DESCRIPTIONS[cat] ?? ''}
                </span>
              </div>
              <span style={{ color: '#6b7280', fontWeight: 600 }}>
                avg {stats.avg}
                {prevCat && prevCat.avg !== stats.avg && (
                  <span style={{
                    marginLeft: 4, fontSize: 10,
                    color: stats.avg > prevCat.avg ? '#16a34a' : '#dc2626',
                  }}>
                    {stats.avg > prevCat.avg ? '↑' : '↓'}{Math.abs(stats.avg - prevCat.avg)}
                  </span>
                )}
                {' · '}{stats.passRate}% pass
              </span>
            </div>
            <div style={{ height: 6, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              {prevCat && (
                <div style={{
                  position: 'absolute', height: '100%',
                  width: `${prevCat.passRate}%`,
                  background: '#d1d5db', borderRadius: 4,
                }} />
              )}
              <div style={{
                position: 'relative', height: '100%',
                width: `${stats.passRate}%`,
                background: stats.passRate >= 70 ? '#16a34a' : stats.passRate >= 40 ? '#d97706' : '#dc2626',
                borderRadius: 4,
                transition: 'width 0.5s ease-out',
              }} />
            </div>
          </div>
        );
      })}

      {/* Metadata */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginTop: 14 }}>
        <span>Run ID: {evalRun.runId}</span>
        <span>{new Date(evalRun.timestamp).toLocaleString()}</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TestDashboardPage() {
  const [evalRun, setEvalRun] = useState<EvalRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<EvalHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedPreviousRun, setSelectedPreviousRun] = useState<EvalHistoryEntry | null>(null);

  // Load eval history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory(excludeRunId?: string) {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/actions/run-evals');
      if (res.ok) {
        const data = await res.json();
        const runs: EvalHistoryEntry[] = data.runs ?? [];
        setHistory(runs);
        // Auto-select the most recent previous run, excluding the current one
        const previous = excludeRunId
          ? runs.find((r: EvalHistoryEntry) => r.runId !== excludeRunId)
          : runs[0];
        if (previous) {
          setSelectedPreviousRun(previous);
        }
      }
    } catch {
      // History loading is best-effort
    } finally {
      setLoadingHistory(false);
    }
  }

  async function runEvals() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/actions/run-evals', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data: EvalRun = await res.json();
      setEvalRun(data);
      // Refresh history after a successful run, excluding the just-created run
      loadHistory(data.runId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 'clamp(16px, 4vw, 32px) clamp(12px, 3vw, 24px)', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 28, flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: '#0f172a' }}>
              🧪 Scasi Eval Dashboard
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              LLM-as-judge evaluation · 4 categories · Qwen3 VL 235B judge · 15 test emails
            </p>
          </div>
          <button
            onClick={runEvals}
            disabled={loading}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #6d28d9, #2563eb)',
              color: 'white', fontWeight: 700, fontSize: 14,
              boxShadow: loading ? 'none' : '0 2px 8px rgba(109,40,217,0.3)',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            {loading ? '⏳ Running…' : '▶ Run Evals'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
            padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 13,
          }}>
            ❌ {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{
            textAlign: 'center', padding: 60, color: '#6b7280', fontSize: 14,
            background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔬</div>
            Running evaluations across 15 emails × 4 categories…
            <br />
            <span style={{ fontSize: 12, color: '#9ca3af' }}>This may take 1–2 minutes. NLP pipeline → Qwen3 judge.</span>
          </div>
        )}

        {/* Results */}
        {evalRun && !loading && (
          <>
            {/* Prompt Versions */}
            <PromptVersionsCard
              current={evalRun.promptVersions}
              previous={selectedPreviousRun?.promptVersions}
            />

            {/* Summary card with regression deltas */}
            <SummaryCard evalRun={evalRun} previousRun={selectedPreviousRun ?? undefined} />

            {/* Per-email cards */}
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
              📧 Per-Email Results ({evalRun.results.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {evalRun.results.map((r, i) => <EmailCard key={r.emailId} result={r} index={i} />)}
            </div>
          </>
        )}

        {/* History panel (always visible) */}
        <HistoryPanel
          runs={history}
          loading={loadingHistory}
          selectedRunId={selectedPreviousRun?.runId ?? null}
          onSelect={setSelectedPreviousRun}
        />

        {/* Empty state */}
        {!evalRun && !loading && !error && history.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 80, color: '#9ca3af', fontSize: 14,
            background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧪</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
              No eval runs yet
            </div>
            Click &quot;Run Evals&quot; to evaluate the NLP pipeline across 15 sample emails.
            <br />
            <span style={{ fontSize: 12 }}>
              Judge: Qwen3 VL 235B · Categories: Priority, Reply, Summary, RAG
            </span>
          </div>
        )}

        {/* Architecture note */}
        <div style={{
          marginTop: 24, padding: 'clamp(12px, 2vw, 16px)', background: '#f5f3ff', borderRadius: 10,
          border: '1px solid #ddd6fe', fontSize: 12, color: '#6b7280', lineHeight: 1.6,
        }}>
          <span style={{ fontWeight: 700, color: '#6d28d9' }}>Architecture:</span>{' '}
          NLP pipeline (Groq Llama / Sarvam) generates outputs → Qwen3 VL 235B via OpenRouter judges quality.
          Different model families prevent self-evaluation bias. Prompt version hashes enable regression detection across runs.
        </div>
      </div>
    </div>
  );
}
