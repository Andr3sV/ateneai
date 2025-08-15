-- Fix tasks with incorrect workspace_id
-- This script will update tasks that have workspace_id = 45 to workspace_id = 4

-- First, let's see what we're going to fix
SELECT 
  id,
  workspace_id,
  title,
  created_at
FROM public.tasks 
WHERE workspace_id = 45
ORDER BY id;

-- Update tasks with workspace_id = 45 to workspace_id = 4
UPDATE public.tasks 
SET workspace_id = 4
WHERE workspace_id = 45;

-- Verify the fix
SELECT 
  id,
  workspace_id,
  title,
  created_at
FROM public.tasks 
WHERE id IN (45, 46, 47, 48, 129)
ORDER BY id;

-- Check final distribution
SELECT 
  workspace_id,
  COUNT(*) as task_count
FROM public.tasks 
GROUP BY workspace_id
ORDER BY workspace_id;
