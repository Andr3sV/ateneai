-- Batch calls retention and cleanup
-- Goal: keep only minimal metadata for a batch once all calls finish.
-- We retain the row in public.batch_calls (name, counts, dates, status)
-- and purge recipients + temporary files after completion.

-- 1) Add expires_at column to batch_calls (when cleanup can occur)
ALTER TABLE public.batch_calls
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_batch_calls_expires_at
  ON public.batch_calls (expires_at);

-- 2) Trigger: when a batch is marked completed, schedule cleanup window (24h)
CREATE OR REPLACE FUNCTION public.set_expires_at_on_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'completed') THEN
    NEW.expires_at := COALESCE(NEW.expires_at, NOW() + INTERVAL '24 hours');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_expires_at_on_complete ON public.batch_calls;
CREATE TRIGGER trg_set_expires_at_on_complete
BEFORE UPDATE ON public.batch_calls
FOR EACH ROW
EXECUTE FUNCTION public.set_expires_at_on_complete();

-- 3) Cleanup procedure: removes recipients for completed/expired batches
--    and clears file_url to avoid keeping heavy artifacts.
CREATE OR REPLACE PROCEDURE public.cleanup_completed_batches(retention_hours INTEGER DEFAULT 24)
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff TIMESTAMPTZ;
BEGIN
  cutoff := NOW() - (retention_hours || ' hours')::INTERVAL;

  -- Select batches eligible for cleanup: completed and expired or older than cutoff
  WITH eligible AS (
    SELECT id
    FROM public.batch_calls
    WHERE status = 'completed'
      AND (
        (expires_at IS NOT NULL AND expires_at <= NOW())
        OR (expires_at IS NULL AND created_at <= cutoff)
      )
  )
  -- 3a) Delete recipients
  DELETE FROM public.batch_call_recipients r
  USING eligible e
  WHERE r.batch_call_id = e.id;

  -- 3b) Null the file_url to drop reference to any temporary storage
  UPDATE public.batch_calls b
  SET file_url = NULL
  FROM eligible e
  WHERE b.id = e.id;
END;
$$;

-- 4) Optional: run immediate cleanup for already completed old batches
CALL public.cleanup_completed_batches(24);


