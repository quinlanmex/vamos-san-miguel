-- Rich, AI-facing notes per pick: a synthesized profile (what it's known for, vibe,
-- standout dishes/features, who it's best for, caveats) distilled from public reviews +
-- the place's own site. Used by the trip planner and Q&A, not necessarily shown on the
-- site. We store a SYNTHESIS, never raw third-party review text. Run once in Supabase.
alter table public.places add column if not exists ai_notes    text;
alter table public.places add column if not exists ai_notes_at timestamptz;
