-- Add new columns to recordings table for normalized metadata
-- Run this in Supabase SQL editor if you don't run migrations from repo

alter table if exists public.recordings
  add column if not exists sentence_mozilla_id text,
  add column if not exists contributor_age text,
  add column if not exists contributor_gender text;

-- Optional indexes for lookups/analytics
create index if not exists idx_recordings_sentence_mozilla_id on public.recordings (sentence_mozilla_id);
create index if not exists idx_recordings_contributor_age on public.recordings (contributor_age);
create index if not exists idx_recordings_contributor_gender on public.recordings (contributor_gender);

