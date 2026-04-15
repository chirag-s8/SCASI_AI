-- Migration: 006_eval_prompt_versions
-- Adds prompt_versions column to eval_runs for tracking prompt regression across runs.
-- This is the authoritative migration for this column.

-- 1. Add column (nullable first to allow existing rows)
alter table eval_runs
  add column if not exists prompt_versions jsonb;

-- 2. Backfill any existing rows that don't have the column yet
update eval_runs
  set prompt_versions = '{}'::jsonb
  where prompt_versions is null;

-- 3. Set default and NOT NULL now that all rows are populated
alter table eval_runs
  alter column prompt_versions set default '{}'::jsonb;

alter table eval_runs
  alter column prompt_versions set not null;
