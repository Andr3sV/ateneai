-- Debug script to check tasks workspace_id
-- Run this in Supabase SQL editor

-- Check all tasks with their workspace_id
SELECT 
  id,
  workspace_id,
  title,
  assignees,
  created_at
FROM public.tasks 
WHERE id IN (45, 46, 47, 48, 129)
ORDER BY id;

-- Check workspace_id distribution
SELECT 
  workspace_id,
  COUNT(*) as task_count
FROM public.tasks 
GROUP BY workspace_id
ORDER BY workspace_id;

-- Check if workspace 4 exists
SELECT id, name, domain FROM public.workspaces WHERE id = 4;

-- Check workspace_users for workspace 4
SELECT 
  wu.workspace_id,
  wu.user_id,
  u.email,
  u.clerk_user_id
FROM public.workspace_users wu
JOIN public.users_new u ON wu.user_id = u.id
WHERE wu.workspace_id = 4;
