-- ===============================================
-- Add channel_type to conversations_new
-- ===============================================

-- 1) Add column (TEXT as per Supabase recommendation)
ALTER TABLE conversations_new
ADD COLUMN IF NOT EXISTS channel_type text;

-- 2) Optional index if filtering by channel is common
CREATE INDEX IF NOT EXISTS idx_conversations_channel_type
  ON conversations_new(channel_type);

-- 3) Backfill from existing metadata.platform when present
--    Safe-guarded with WHERE clause to avoid overwriting
UPDATE conversations_new
SET channel_type = COALESCE(metadata->>'platform', channel_type)
WHERE (channel_type IS NULL OR channel_type = '')
  AND (metadata ? 'platform');

-- 4) Optional: Normalize some known values
UPDATE conversations_new
SET channel_type = 'instagram'
WHERE channel_type ILIKE 'insta%';

UPDATE conversations_new
SET channel_type = 'facebook'
WHERE channel_type ILIKE 'fb%' OR channel_type ILIKE 'face%';

-- Note: For WhatsApp or calls, channel_type may be set by upstream systems.
-- Leave NULL if unknown; UI and services should handle missing channel_type gracefully.

