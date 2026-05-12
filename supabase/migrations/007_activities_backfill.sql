-- Migration 007: Extend activities table for historical backfill
-- Adds activity_date, rep_name (text), and source columns
-- so historical Sheet data can be imported without requiring a profiles FK

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS activity_date date,
  ADD COLUMN IF NOT EXISTS rep_name      text,
  ADD COLUMN IF NOT EXISTS source        text DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS activities_activity_date_idx ON public.activities (activity_date DESC);

-- Backfill activity_date from created_at for existing rows
UPDATE public.activities
SET activity_date = created_at::date
WHERE activity_date IS NULL;
