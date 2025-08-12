-- Add transcript and criteria_evaluation columns to calls table
alter table if exists public.calls
  add column if not exists transcript text,
  add column if not exists criteria_evaluation text[];

-- Optional: backfill sample data for workspace 1 if empty values
update public.calls
set transcript = coalesce(transcript, 'Sample transcript for call ' || id),
    criteria_evaluation = coalesce(criteria_evaluation, ARRAY['Qualified','Callback requested'])
where workspace_id = 1;


