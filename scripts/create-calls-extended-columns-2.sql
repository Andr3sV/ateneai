-- Add duration (in seconds) and dinamic_variables (text[]) to calls
alter table if exists public.calls
  add column if not exists duration integer,
  add column if not exists dinamic_variables text[];

-- Optional backfill for workspace 1
update public.calls
set 
  duration = coalesce(duration, (30 + floor(random()*570))::int), -- 30s to ~10min
  dinamic_variables = coalesce(dinamic_variables, ARRAY['budget','callback','priority'])
where workspace_id = 1;


