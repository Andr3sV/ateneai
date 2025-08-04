# 🏗️ MANUAL MIGRATION STEPS - WORKSPACE CRM

## ✅ COMPLETED:

- [x] **Backup completo creado** (1,092 records respaldados)

## 📋 NEXT STEPS - MANUAL CREATION:

### STEP 1: Create Tables in Supabase Dashboard

**Ve a: https://supabase.com/dashboard → tu proyecto → SQL Editor**

#### 1.1 Workspaces Table

```sql
CREATE TABLE workspaces (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true
);
```

#### 1.2 Users New Table

```sql
CREATE TABLE users_new (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);
```

#### 1.3 Workspace Users (Junction Table)

```sql
CREATE TABLE workspace_users (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users_new(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by BIGINT REFERENCES users_new(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(workspace_id, user_id)
);
```

#### 1.4 Contacts New Table

```sql
CREATE TABLE contacts_new (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    phone VARCHAR(50),
    name VARCHAR(255),
    email VARCHAR(255),
    instagram_url TEXT,
    country VARCHAR(10),
    status VARCHAR(50) DEFAULT 'Lead' CHECK (status IN ('Lead', 'Client', 'Prospect')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);
```

#### 1.5 Conversations New Table

```sql
CREATE TABLE conversations_new (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contact_id BIGINT NOT NULL REFERENCES contacts_new(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'closed_timeout', 'closed_human')),
    assigned_to VARCHAR(100) DEFAULT 'agent_1',
    assigned_user_id BIGINT REFERENCES users_new(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);
```

#### 1.6 Messages New Table

```sql
CREATE TABLE messages_new (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    conversation_id BIGINT NOT NULL REFERENCES conversations_new(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
    sender_type VARCHAR(50) DEFAULT 'ai' CHECK (sender_type IN ('ai', 'human', 'contact')),
    sent_by BIGINT REFERENCES users_new(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);
```

### STEP 2: Create Indexes

```sql
-- Performance indexes
CREATE INDEX idx_contacts_workspace_id ON contacts_new(workspace_id);
CREATE INDEX idx_conversations_workspace_id ON conversations_new(workspace_id);
CREATE INDEX idx_messages_workspace_id ON messages_new(workspace_id);
CREATE INDEX idx_conversations_contact_id ON conversations_new(contact_id);
CREATE INDEX idx_messages_conversation_id ON messages_new(conversation_id);
CREATE INDEX idx_contacts_status ON contacts_new(status);
CREATE INDEX idx_conversations_status ON conversations_new(status);
CREATE INDEX idx_contacts_created_at ON contacts_new(created_at);
CREATE INDEX idx_conversations_created_at ON conversations_new(created_at);
CREATE INDEX idx_messages_created_at ON messages_new(created_at);
CREATE INDEX idx_users_clerk_id ON users_new(clerk_user_id);
CREATE INDEX idx_workspace_users_workspace ON workspace_users(workspace_id);
CREATE INDEX idx_workspace_users_user ON workspace_users(user_id);
CREATE INDEX idx_workspaces_domain ON workspaces(domain);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
```

## ⚠️ IMPORTANTE:

- **NO toques las tablas originales** hasta que confirmemos que todo funciona
- **Las tablas nuevas tienen sufijo `_new`** para coexistir con las originales
- **Después de crear las tablas**, ejecutaremos el script de migración de datos

## 🔄 AFTER TABLE CREATION:

Cuando hayas creado todas las tablas en Supabase, me confirmas y continuamos con la migración de datos.
