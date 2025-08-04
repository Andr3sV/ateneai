-- ===============================================
-- ATENEAI CRM - NEW WORKSPACE-BASED SCHEMA
-- ===============================================
-- Migration Date: 2025-08-02
-- Purpose: Transform single-tenant to multi-tenant CRM
-- ===============================================

-- 🏢 WORKSPACE MANAGEMENT TABLES
-- ===============================================

-- Workspaces (Companies/Organizations)
CREATE TABLE IF NOT EXISTS workspaces (
    id BIGSERIAL PRIMARY KEY,
    name text NOT NULL,
    domain text UNIQUE NOT NULL,
    slug text UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true
);

-- Users (Team Members)
CREATE TABLE IF NOT EXISTS users_new (
    id BIGSERIAL PRIMARY KEY,
    email text UNIQUE NOT NULL,
    clerk_user_id text UNIQUE NOT NULL,
    first_name text,
    last_name text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Workspace Users (Many-to-Many with Roles)
CREATE TABLE IF NOT EXISTS workspace_users (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users_new(id) ON DELETE CASCADE,
    role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by BIGINT REFERENCES users_new(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(workspace_id, user_id)
);

-- 📞 CRM DATA TABLES (Workspace-Scoped)
-- ===============================================

-- Contacts (Customers/Leads) - Workspace Scoped
CREATE TABLE IF NOT EXISTS contacts_new (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    phone text,
    name text,
    email text,
    instagram_url text,
    country text,
    status text CHECK (status IN ('Lead', 'Client', 'Prospect')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    instagram_id text,
    instagram_followers text
);

-- Conversations - Workspace Scoped
CREATE TABLE IF NOT EXISTS conversations_new (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contact_id BIGINT NOT NULL REFERENCES contacts_new(id) ON DELETE CASCADE,
    status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'closed_timeout', 'closed_human')),
    assigned_to text DEFAULT 'agent_1',
    assigned_user_id BIGINT REFERENCES users_new(id), -- Para asignación a humanos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Messages - Workspace Scoped
CREATE TABLE IF NOT EXISTS messages_new (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    conversation_id BIGINT NOT NULL REFERENCES conversations_new(id) ON DELETE CASCADE,
    content text NOT NULL,
    role text NOT NULL CHECK (role IN ('user', 'assistant')),
    sender_type text CHECK (sender_type IN ('ai', 'human', 'contact')),
    sent_by BIGINT REFERENCES users_new(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    contact_id BIGINT REFERENCES contacts_new(id) ON DELETE CASCADE
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Workspace-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_id ON contacts_new(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations_new(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_workspace_id ON messages_new(workspace_id);

-- Contact relationships
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations_new(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages_new(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages_new(contact_id);

-- Status queries
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts_new(status);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations_new(status);

-- Date-based queries
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts_new(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations_new(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages_new(created_at);

-- User lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users_new(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace ON workspace_users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_user ON workspace_users(user_id);

-- Domain lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_domain ON workspaces(domain);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);

-- ===============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===============================================

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_new ENABLE ROW LEVEL SECURITY;

-- Workspace isolation policies (users can only see data from their workspace)
CREATE POLICY workspace_isolation_contacts ON contacts_new
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_users 
            WHERE user_id = (
                SELECT id FROM users_new WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

CREATE POLICY workspace_isolation_conversations ON conversations_new
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_users 
            WHERE user_id = (
                SELECT id FROM users_new WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

CREATE POLICY workspace_isolation_messages ON messages_new
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_users 
            WHERE user_id = (
                SELECT id FROM users_new WHERE clerk_user_id = auth.jwt() ->> 'sub'
            )
        )
    );

-- ===============================================
-- UPDATE TRIGGERS
-- ===============================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users_new
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts_new
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations_new
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- COMMENTS FOR DOCUMENTATION
-- ===============================================

COMMENT ON TABLE workspaces IS 'Organizations/Companies using the CRM';
COMMENT ON TABLE users_new IS 'Team members who can access workspaces';
COMMENT ON TABLE workspace_users IS 'Many-to-many relationship between users and workspaces with roles';
COMMENT ON TABLE contacts_new IS 'Customers and leads belonging to a workspace';
COMMENT ON TABLE conversations_new IS 'Chat conversations with contacts';
COMMENT ON TABLE messages_new IS 'Individual messages within conversations';

COMMENT ON COLUMN workspaces.domain IS 'Email domain for automatic workspace assignment (@company.com)';
COMMENT ON COLUMN workspace_users.role IS 'User role within workspace: owner, admin, member, viewer';
COMMENT ON COLUMN conversations_new.assigned_user_id IS 'User ID when conversation is assigned to human agent';
COMMENT ON COLUMN messages_new.sent_by IS 'User ID when message is sent by human agent';