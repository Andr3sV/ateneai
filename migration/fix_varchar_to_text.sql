-- ===============================================
-- ATENEAI CRM - FIX VARCHAR TO TEXT MIGRATION
-- ===============================================
-- Purpose: Convert VARCHAR fields to TEXT following PostgreSQL best practices
-- Reference: https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_varchar.28n.29_by_default
-- ===============================================

-- 🏢 WORKSPACE TABLES
-- ===============================================

-- Workspaces table
ALTER TABLE workspaces 
  ALTER COLUMN name TYPE text,
  ALTER COLUMN domain TYPE text,
  ALTER COLUMN slug TYPE text;

-- Users table  
ALTER TABLE users_new
  ALTER COLUMN email TYPE text,
  ALTER COLUMN clerk_user_id TYPE text,
  ALTER COLUMN first_name TYPE text,
  ALTER COLUMN last_name TYPE text;

-- Workspace Users table
ALTER TABLE workspace_users
  ALTER COLUMN role TYPE text;

-- 📞 CRM TABLES
-- ===============================================

-- Contacts table
ALTER TABLE contacts_new
  ALTER COLUMN phone TYPE text,
  ALTER COLUMN name TYPE text,
  ALTER COLUMN email TYPE text,
  ALTER COLUMN country TYPE text,
  ALTER COLUMN status TYPE text;

-- Conversations table  
ALTER TABLE conversations_new
  ALTER COLUMN assigned_to TYPE text,
  ALTER COLUMN status TYPE text;

-- Messages table
ALTER TABLE messages_new
  ALTER COLUMN role TYPE text,
  ALTER COLUMN sender_type TYPE text;

-- ===============================================
-- PHILOSOPHY: SIMPLICITY OVER PERFECTION
-- ===============================================

-- ✅ CONVERTED EVERYTHING TO TEXT:
-- Rationale: 
-- 1. Simple rule: "Always use text"
-- 2. No arbitrary limits to remember
-- 3. CHECK constraints still provide validation
-- 4. PostgreSQL optimizes text better than varchar
-- 5. Future-proof (no migrations needed later)
-- 6. Consistent approach across all string fields

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- Check all column types after migration
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('workspaces', 'users_new', 'contacts_new', 'conversations_new', 'messages_new')
    AND data_type IN ('text', 'character varying')
ORDER BY table_name, column_name;