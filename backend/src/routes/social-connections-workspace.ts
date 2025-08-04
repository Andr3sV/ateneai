import express from 'express';
import { requireWorkspaceContext } from '../middleware/workspace';
import { socialConnectionsService } from '../services/social-connections';
import { validateSocialConnectionInput } from '../validators/social-connections';

const router = express.Router();

/**
 * GET /social-connections
 * Obtener todas las conexiones sociales del workspace
 */
router.get('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const connections = await socialConnectionsService.getConnections(
      req.workspaceContext.workspaceId
    );
    
    console.log(`📱 Found ${connections.length} social connections for workspace ${req.workspaceContext.workspaceId}`);
    
    res.json({ 
      success: true, 
      data: connections 
    });
  } catch (error: any) {
    console.error('❌ Error fetching social connections:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

/**
 * GET /social-connections/:platform/auth-url
 * Generar URL de autorización OAuth para la plataforma
 */
router.get('/:platform/auth-url', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const { platform } = req.params;
    
    if (!['facebook', 'instagram'].includes(platform)) {
      res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be facebook or instagram'
      });
      return;
    }

    const authUrl = await socialConnectionsService.generateAuthUrl(
      platform as 'facebook' | 'instagram',
      req.workspaceContext.workspaceId,
      req.workspaceContext.userId
    );
    
    console.log(`🔐 Generated OAuth URL for ${platform} - workspace ${req.workspaceContext.workspaceId}`);
    
    res.json({ 
      success: true, 
      data: { url: authUrl }
    });
  } catch (error: any) {
    console.error(`❌ Error generating ${req.params.platform} auth URL:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

/**
 * GET /social-connections/:platform/callback
 * Callback de OAuth después de la autorización
 */
router.get('/:platform/callback', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const { platform } = req.params;
    const { code, state, error, error_description } = req.query;
    
    if (error) {
      console.error(`❌ OAuth error for ${platform}:`, error_description);
      res.redirect(`${process.env.FRONTEND_URL}/social-connections?error=${encodeURIComponent(error_description as string)}`);
      return;
    }

    if (!code || !state) {
      res.status(400).json({
        success: false,
        error: 'Missing authorization code or state'
      });
      return;
    }

    // Verificar state para prevenir CSRF
    const expectedState = `${req.workspaceContext.workspaceId}_${req.workspaceContext.userId}_${platform}`;
    if (state !== expectedState) {
      res.status(400).json({
        success: false,
        error: 'Invalid state parameter'
      });
      return;
    }

    const connection = await socialConnectionsService.handleOAuthCallback(
      platform as 'facebook' | 'instagram',
      code as string,
      req.workspaceContext.workspaceId,
      req.workspaceContext.userId
    );
    
    console.log(`✅ OAuth successful for ${platform} - workspace ${req.workspaceContext.workspaceId}`);
    
    // Redirect al frontend con éxito
    res.redirect(`${process.env.FRONTEND_URL}/social-connections?success=${platform}&connected=true`);
  } catch (error: any) {
    console.error(`❌ Error in ${req.params.platform} OAuth callback:`, error);
    res.redirect(`${process.env.FRONTEND_URL}/social-connections?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * DELETE /social-connections/:platform/disconnect
 * Desconectar una plataforma social
 */
router.delete('/:platform/disconnect', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const { platform } = req.params;
    
    if (!['facebook', 'instagram'].includes(platform)) {
      res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be facebook or instagram'
      });
      return;
    }

    await socialConnectionsService.disconnectPlatform(
      platform as 'facebook' | 'instagram',
      req.workspaceContext.workspaceId
    );
    
    console.log(`🔌 Disconnected ${platform} for workspace ${req.workspaceContext.workspaceId}`);
    
    res.json({ 
      success: true, 
      message: `${platform} disconnected successfully`
    });
  } catch (error: any) {
    console.error(`❌ Error disconnecting ${req.params.platform}:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

/**
 * POST /social-connections/:platform/refresh-token
 * Renovar token de acceso
 */
router.post('/:platform/refresh-token', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const { platform } = req.params;
    
    if (!['facebook', 'instagram'].includes(platform)) {
      res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be facebook or instagram'
      });
      return;
    }

    const updatedConnection = await socialConnectionsService.refreshAccessToken(
      platform as 'facebook' | 'instagram',
      req.workspaceContext.workspaceId
    );
    
    console.log(`🔄 Refreshed ${platform} token for workspace ${req.workspaceContext.workspaceId}`);
    
    res.json({ 
      success: true, 
      data: updatedConnection
    });
  } catch (error: any) {
    console.error(`❌ Error refreshing ${req.params.platform} token:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

/**
 * GET /social-connections/events
 * Obtener logs de eventos de conexiones sociales
 */
router.get('/events', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const { platform, limit = 50, offset = 0 } = req.query;
    
    const events = await socialConnectionsService.getEventLogs(
      req.workspaceContext.workspaceId,
      {
        platform: platform as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    );
    
    res.json({ 
      success: true, 
      data: events 
    });
  } catch (error: any) {
    console.error('❌ Error fetching social events:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

export default router;