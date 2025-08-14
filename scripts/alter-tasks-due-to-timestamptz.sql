-- Alter tasks.due_date from DATE to TIMESTAMPTZ to support time-of-day
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE public.tasks
    ALTER COLUMN due_date TYPE timestamptz
    USING (
      CASE
        WHEN due_date IS NULL THEN NULL
        ELSE (due_date::timestamp AT TIME ZONE 'UTC')
      END
    );
  END IF;
END
$$;

-- Optional index for ordering/filtering by due_date
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_ts ON public.tasks(due_date);


