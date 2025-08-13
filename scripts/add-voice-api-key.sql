-- Per-workspace voice API key storage
-- Safe nullable column; no data changes except schema

ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS voice_api_key TEXT;

-- Optional: index if querying frequently (not strictly needed)
-- CREATE INDEX IF NOT EXISTS idx_workspaces_voice_api_key ON public.workspaces(voice_api_key);


