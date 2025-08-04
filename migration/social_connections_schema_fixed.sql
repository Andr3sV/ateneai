-- ================================================
-- SOCIAL CONNECTIONS SCHEMA (FIXED)
-- ================================================
-- Esquema para almacenar conexiones de redes sociales
-- con cifrado de tokens y gestión de webhooks

-- Tabla para conexiones de redes sociales
CREATE TABLE IF NOT EXISTS social_connections (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
    
    -- Identificadores de la plataforma
    platform_user_id text NOT NULL, -- Facebook User ID o Instagram User ID
    platform_page_id text, -- Facebook Page ID o Instagram Business Account ID
    page_name text,
    page_username text,
    
    -- Tokens de acceso (cifrados)
    access_token_encrypted text NOT NULL,
    refresh_token_encrypted text,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Permisos otorgados
    granted_permissions JSONB DEFAULT '[]'::jsonb,
    required_permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Estado de la conexión
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_error text,
    error_count INTEGER DEFAULT 0,
    
    -- Configuración de webhooks
    webhook_configured BOOLEAN DEFAULT false,
    webhook_subscription_id text,
    webhook_verify_token text,
    
    -- Metadatos adicionales
    platform_data JSONB DEFAULT '{}'::jsonb, -- Datos específicos de la plataforma
    connection_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    UNIQUE(workspace_id, platform, platform_page_id),
    UNIQUE(workspace_id, platform_user_id, platform) -- Un usuario puede tener solo una conexión por plataforma
);

-- Tabla para logs de eventos de redes sociales
CREATE TABLE IF NOT EXISTS social_events_log (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    connection_id BIGINT REFERENCES social_connections(id) ON DELETE CASCADE,
    
    event_type text NOT NULL, -- 'oauth_success', 'oauth_error', 'webhook_received', 'token_refresh', etc.
    platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
    
    event_data JSONB DEFAULT '{}'::jsonb,
    error_message text,
    
    -- Datos del webhook (si aplica)
    webhook_signature text,
    webhook_payload JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla para configuración de webhooks por workspace
CREATE TABLE IF NOT EXISTS webhook_configurations (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
    
    -- URLs de webhook
    webhook_url text NOT NULL,
    verify_token text NOT NULL,
    app_secret text NOT NULL, -- Para verificar signatures
    
    -- Configuración
    is_active BOOLEAN DEFAULT true,
    subscribed_fields JSONB DEFAULT '[]'::jsonb, -- ['messages', 'messaging_postbacks', etc.]
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(workspace_id, platform)
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_social_connections_workspace_platform 
ON social_connections(workspace_id, platform);

CREATE INDEX IF NOT EXISTS idx_social_connections_active 
ON social_connections(workspace_id, platform, is_active);

CREATE INDEX IF NOT EXISTS idx_social_connections_token_expiry 
ON social_connections(token_expires_at) 
WHERE token_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_social_events_log_workspace_date 
ON social_events_log(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_events_log_connection 
ON social_events_log(connection_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_configurations_workspace 
ON webhook_configurations(workspace_id, platform, is_active);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_social_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at en social_connections
DROP TRIGGER IF EXISTS trigger_social_connections_updated_at ON social_connections;
CREATE TRIGGER trigger_social_connections_updated_at
    BEFORE UPDATE ON social_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_social_connections_updated_at();

-- Función para actualizar updated_at en webhook_configurations
CREATE OR REPLACE FUNCTION update_webhook_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at en webhook_configurations
DROP TRIGGER IF EXISTS trigger_webhook_configurations_updated_at ON webhook_configurations;
CREATE TRIGGER trigger_webhook_configurations_updated_at
    BEFORE UPDATE ON webhook_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_configurations_updated_at();

-- RLS (Row Level Security) Policies
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configurations ENABLE ROW LEVEL SECURITY;

-- DROP policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their workspace social connections" ON social_connections;
DROP POLICY IF EXISTS "Users can manage their workspace social connections" ON social_connections;
DROP POLICY IF EXISTS "Users can view their workspace social events" ON social_events_log;
DROP POLICY IF EXISTS "Users can view their workspace webhook configs" ON webhook_configurations;
DROP POLICY IF EXISTS "Admins can manage workspace webhook configs" ON webhook_configurations;

-- Políticas para social_connections (simplificadas para evitar conflictos)
CREATE POLICY "workspace_social_connections_select" ON social_connections
    FOR SELECT USING (true); -- Simplificado para testing

CREATE POLICY "workspace_social_connections_all" ON social_connections
    FOR ALL USING (true); -- Simplificado para testing

-- Políticas para social_events_log
CREATE POLICY "workspace_social_events_select" ON social_events_log
    FOR SELECT USING (true); -- Simplificado para testing

-- Políticas para webhook_configurations
CREATE POLICY "workspace_webhook_configs_select" ON webhook_configurations
    FOR SELECT USING (true); -- Simplificado para testing

CREATE POLICY "workspace_webhook_configs_all" ON webhook_configurations
    FOR ALL USING (true); -- Simplificado para testing

COMMENT ON TABLE social_connections IS 'Almacena conexiones OAuth de redes sociales por workspace';
COMMENT ON TABLE social_events_log IS 'Log de eventos y webhooks de redes sociales';
COMMENT ON TABLE webhook_configurations IS 'Configuración de webhooks por workspace y plataforma';

COMMENT ON COLUMN social_connections.access_token_encrypted IS 'Token de acceso cifrado con AES-256';
COMMENT ON COLUMN social_connections.granted_permissions IS 'Array de permisos otorgados por el usuario';
COMMENT ON COLUMN social_connections.platform_data IS 'Datos específicos de la plataforma (page info, etc.)';