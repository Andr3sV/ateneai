-- Add GIN index for tasks.contacts JSONB field to optimize contains queries
-- This will significantly improve performance when searching for tasks by contact_id

-- Check if index already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_tasks_contacts_gin' 
        AND tablename = 'tasks'
    ) THEN
        -- Create the GIN index
        CREATE INDEX idx_tasks_contacts_gin ON public.tasks USING gin(contacts);
        RAISE NOTICE 'Created GIN index idx_tasks_contacts_gin on tasks.contacts';
    ELSE
        RAISE NOTICE 'Index idx_tasks_contacts_gin already exists on tasks.contacts';
    END IF;
END $$;

-- Verify the index was created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'tasks' 
AND indexname = 'idx_tasks_contacts_gin';
