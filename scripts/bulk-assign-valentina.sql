-- Add Valentina (id 7) to all tasks where assignees is exactly [{id:6, name:'Andres Villamizar'}]
-- Adjust workspace_id as needed with a WHERE clause if you want to scope it

-- Preview what will change
SELECT id, workspace_id, assignees
FROM public.tasks
WHERE jsonb_typeof(assignees) = 'array'
  AND assignees @> '[{"id": 6, "name": "Andres Villamizar"}]'
  AND jsonb_array_length(assignees) = 1;

-- Perform update: push Valentina if not already included
UPDATE public.tasks
SET assignees = (
  CASE
    WHEN assignees @> '[{"id": 7, "name": "Valentina Castillo"}]'::jsonb THEN assignees
    ELSE assignees || '[{"id": 7, "name": "Valentina Castillo"}]'::jsonb
  END
)
WHERE jsonb_typeof(assignees) = 'array'
  AND assignees @> '[{"id": 6, "name": "Andres Villamizar"}]'
  AND jsonb_array_length(assignees) = 1;

-- Verify
SELECT id, workspace_id, assignees
FROM public.tasks
WHERE assignees @> '[{"id": 6, "name": "Andres Villamizar"}]'
ORDER BY id;
