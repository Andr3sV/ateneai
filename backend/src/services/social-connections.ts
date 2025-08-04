import { supabase } from './supabase';
import crypto from 'crypto';

// Configuración de Meta App
const META_CONFIG = {
  facebook: {
    appId: process.env.FACEBOOK_APP_ID!,
    appSecret: process.env.FACEBOOK_APP_SECRET!,
    baseUrl: 'https://graph.facebook.com/v18.0',
    redirectUri: `${process.env.BACKEND_URL}/api/v2/social-connections/facebook/callback`,
    scope: [
      'pages_messaging',
      'pages_manage_metadata', 
      'pages_read_engagement',
      'pages_show_list'
    ].join(',')
  },
  instagram: {
    appId: process.env.FACEBOOK_APP_ID!, // Instagram usa la misma app de Facebook
    appSecret: process.env.FACEBOOK_APP_SECRET!,
    baseUrl: 'https://graph.facebook.com/v18.0',
    redirectUri: `${process.env.BACKEND_URL}/api/v2/social-connections/instagram/callback`,
    scope: [
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_manage_insights',
      'pages_show_list'
    ].join(',')
  }
};

// Configuración de cifrado
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const ALGORITHM = 'aes-256-gcm';

interface SocialConnection {
  id: number;
  workspace_id: number;
  user_id: number;
  platform: 'facebook' | 'instagram';
  platform_user_id: string;
  platform_page_id?: string;
  page_name?: string;
  page_username?: string;
  access_token_encrypted: string;
  refresh_token_encrypted?: string;
  token_expires_at?: string;
  granted_permissions: string[];
  required_permissions: string[];
  is_active: boolean;
  last_sync_at?: string;
  last_error?: string;
  error_count: number;
  webhook_configured: boolean;
  webhook_subscription_id?: string;
  platform_data: any;
  connection_metadata: any;
  created_at: string;
  updated_at: string;
}

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface FacebookUserResponse {
  id: string;
  name: string;
  email?: string;
}

interface FacebookPageResponse {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    category: string;
    tasks: string[];
  }>;
}

class SocialConnectionsService {
  
  /**
   * Cifrar texto usando AES-256-GCM
   */
  private encryptText(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Descifrar texto usando AES-256-GCM
   */
  private decryptText(encryptedText: string): string {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Obtener todas las conexiones sociales de un workspace
   */
  async getConnections(workspaceId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('social_connections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapear los datos sin exponer tokens
      return (data || []).map(conn => ({
        id: conn.id,
        platform: conn.platform,
        isConnected: conn.is_active,
        connectedAt: conn.created_at,
        lastSync: conn.last_sync_at,
        pageId: conn.platform_page_id,
        pageName: conn.page_name,
        tokenExpiresAt: conn.token_expires_at,
        permissions: conn.granted_permissions,
        error: conn.last_error,
        webhookConfigured: conn.webhook_configured
      }));
    } catch (error) {
      console.error('Error fetching social connections:', error);
      throw error;
    }
  }

  /**
   * Generar URL de autorización OAuth
   */
  async generateAuthUrl(platform: 'facebook' | 'instagram', workspaceId: number, userId: number): Promise<string> {
    const config = META_CONFIG[platform];
    
    // State para prevenir CSRF attacks
    const state = `${workspaceId}_${userId}_${platform}`;
    
    const params = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      response_type: 'code',
      state: state
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Manejar callback de OAuth y guardar tokens
   */
  async handleOAuthCallback(
    platform: 'facebook' | 'instagram', 
    code: string, 
    workspaceId: number, 
    userId: number
  ): Promise<SocialConnection> {
    try {
      const config = META_CONFIG[platform];

      // 1. Intercambiar código por token de acceso
      const tokenResponse = await this.exchangeCodeForToken(code, config);
      
      // 2. Obtener información del usuario
      const userInfo = await this.getUserInfo(tokenResponse.access_token);
      
      // 3. Para Facebook, obtener páginas; para Instagram, obtener cuentas business
      let pageInfo = null;
      let pageToken = tokenResponse.access_token;
      
      if (platform === 'facebook') {
        const pages = await this.getUserPages(tokenResponse.access_token);
        if (pages.data.length > 0) {
          pageInfo = pages.data[0]; // Tomar la primera página por ahora
          pageToken = pageInfo.access_token;
        }
      }

      // 4. Cifrar tokens
      const encryptedAccessToken = this.encryptText(pageToken);
      const encryptedRefreshToken = (tokenResponse as any).refresh_token 
        ? this.encryptText((tokenResponse as any).refresh_token) 
        : null;

      // 5. Calcular fecha de expiración
      const expiresAt = tokenResponse.expires_in 
        ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        : null;

      // 6. Preparar datos para insertar/actualizar
      const connectionData = {
        workspace_id: workspaceId,
        user_id: userId,
        platform,
        platform_user_id: userInfo.id,
        platform_page_id: pageInfo?.id || userInfo.id,
        page_name: pageInfo?.name || userInfo.name,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: expiresAt,
        granted_permissions: config.scope.split(','),
        required_permissions: config.scope.split(','),
        is_active: true,
        last_sync_at: new Date().toISOString(),
        last_error: null,
        error_count: 0,
        platform_data: {
          user_info: userInfo,
          page_info: pageInfo,
          token_info: {
            expires_in: tokenResponse.expires_in,
            token_type: tokenResponse.token_type
          }
        },
        connection_metadata: {
          oauth_completed_at: new Date().toISOString(),
          user_agent: 'AteneAI-OAuth/1.0'
        }
      };

      // 7. Upsert en la base de datos
      const { data, error } = await supabase
        .from('social_connections')
        .upsert(connectionData, {
          onConflict: 'workspace_id,platform,platform_page_id'
        })
        .select()
        .single();

      if (error) throw error;

      // 8. Registrar evento de éxito
      await this.logEvent(workspaceId, data.id, 'oauth_success', platform, {
        user_id: userInfo.id,
        page_id: pageInfo?.id,
        permissions: config.scope.split(',')
      });

      // 9. Configurar webhook si no está configurado
      if (!data.webhook_configured) {
        try {
          await this.setupWebhook(data.id, platform, pageToken);
        } catch (webhookError) {
          console.warn(`Warning: Failed to setup webhook for ${platform}:`, webhookError);
          // No lanzar error, la conexión OAuth fue exitosa
        }
      }

      return data;
    } catch (error) {
      // Registrar evento de error
      await this.logEvent(workspaceId, null, 'oauth_error', platform, {
        error: (error as any).message,
        code
      }, (error as any).message);
      
      throw error;
    }
  }

  /**
   * Intercambiar código de autorización por token de acceso
   */
  private async exchangeCodeForToken(code: string, config: any): Promise<FacebookTokenResponse> {
    const params = new URLSearchParams({
      client_id: config.appId,
      client_secret: config.appSecret,
      redirect_uri: config.redirectUri,
      code: code
    });

    const response = await fetch(`${config.baseUrl}/oauth/access_token?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json() as any;
      throw new Error(`OAuth token exchange failed: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json() as any;
  }

  /**
   * Obtener información del usuario autenticado
   */
  private async getUserInfo(accessToken: string): Promise<FacebookUserResponse> {
    const response = await fetch(
      `${META_CONFIG.facebook.baseUrl}/me?fields=id,name,email&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return await response.json() as any;
  }

  /**
   * Obtener páginas del usuario para Facebook
   */
  private async getUserPages(accessToken: string): Promise<FacebookPageResponse> {
    const response = await fetch(
      `${META_CONFIG.facebook.baseUrl}/me/accounts?fields=id,name,access_token,category,tasks&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get user pages: ${response.statusText}`);
    }

    return await response.json() as any;
  }

  /**
   * Desconectar una plataforma
   */
  async disconnectPlatform(platform: 'facebook' | 'instagram', workspaceId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('social_connections')
        .update({ 
          is_active: false,
          last_sync_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId)
        .eq('platform', platform);

      if (error) throw error;

      // Registrar evento de desconexión
      await this.logEvent(workspaceId, null, 'platform_disconnected', platform, {
        disconnected_at: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Refrescar token de acceso
   */
  async refreshAccessToken(platform: 'facebook' | 'instagram', workspaceId: number): Promise<any> {
    try {
      // Obtener conexión actual
      const { data: connection, error } = await supabase
        .from('social_connections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)
        .eq('is_active', true)
        .single();

      if (error || !connection) {
        throw new Error(`No active ${platform} connection found`);
      }

      // Descifrar token actual
      const currentToken = this.decryptText(connection.access_token_encrypted);
      
      // Para tokens de página de larga duración, intentar renovar
      const config = META_CONFIG[platform];
      const response = await fetch(
        `${config.baseUrl}/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.appId}&client_secret=${config.appSecret}&fb_exchange_token=${currentToken}`
      );

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokenData = await response.json() as any;
      
      // Cifrar nuevo token
      const newEncryptedToken = this.encryptText(tokenData.access_token);
      const newExpiresAt = tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null;

      // Actualizar en base de datos
      const { data: updatedConnection, error: updateError } = await supabase
        .from('social_connections')
        .update({
          access_token_encrypted: newEncryptedToken,
          token_expires_at: newExpiresAt,
          last_sync_at: new Date().toISOString(),
          last_error: null,
          error_count: 0
        })
        .eq('id', connection.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Registrar evento de renovación exitosa
      await this.logEvent(workspaceId, connection.id, 'token_refreshed', platform, {
        expires_at: newExpiresAt,
        refreshed_at: new Date().toISOString()
      });

      return updatedConnection;
    } catch (error) {
      // Registrar evento de error
      await this.logEvent(workspaceId, null, 'token_refresh_error', platform, {
        error: (error as any).message
      }, (error as any).message);
      
      throw error;
    }
  }

  /**
   * Configurar webhook para la plataforma
   */
  private async setupWebhook(connectionId: number, platform: 'facebook' | 'instagram', pageToken: string): Promise<void> {
    try {
      const webhookUrl = `${process.env.BACKEND_URL}/api/webhooks/${platform}`;
      const verifyToken = crypto.randomBytes(32).toString('hex');
      
      // Configurar webhook según la plataforma
      let subscriptionId = null;
      
      if (platform === 'facebook') {
        // Para Facebook, suscribirse a eventos de la página
        const response = await fetch(
          `${META_CONFIG.facebook.baseUrl}/me/subscribed_apps?access_token=${pageToken}`,
          { method: 'POST' }
        );
        
        if (response.ok) {
          const result = await response.json() as any;
          subscriptionId = result.success ? 'facebook_page_subscription' : null;
        }
      }

      // Actualizar conexión con información de webhook
      await supabase
        .from('social_connections')
        .update({
          webhook_configured: true,
          webhook_subscription_id: subscriptionId,
          webhook_verify_token: verifyToken
        })
        .eq('id', connectionId);

      console.log(`✅ Webhook configured for ${platform} connection ${connectionId}`);
    } catch (error) {
      console.error(`❌ Failed to setup webhook for ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Registrar evento en el log
   */
  private async logEvent(
    workspaceId: number, 
    connectionId: number | null, 
    eventType: string, 
    platform: string, 
    eventData: any, 
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase
        .from('social_events_log')
        .insert({
          workspace_id: workspaceId,
          connection_id: connectionId,
          event_type: eventType,
          platform,
          event_data: eventData,
          error_message: errorMessage
        });
    } catch (error) {
      console.error('Failed to log social event:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  /**
   * Obtener logs de eventos
   */
  async getEventLogs(workspaceId: number, options: { platform?: string; limit?: number; offset?: number }): Promise<any[]> {
    try {
      let query = supabase
        .from('social_events_log')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (options.platform) {
        query = query.eq('platform', options.platform);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching event logs:', error);
      throw error;
    }
  }
}

export const socialConnectionsService = new SocialConnectionsService();