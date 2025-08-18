import { Router } from 'express';
import { db, supabase, TABLES } from '../services/supabase-workspace';
import { requireWorkspaceContext } from '../middleware/workspace';
import { createClerkClient } from '@clerk/backend';

const router = Router();

// Obtener conversaciones del workspace con paginación y filtros
router.get('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Filtros
    const statusFilter = req.query.status as string;
    const assignedToFilter = req.query.assigned_to as string;

    const searchTerm = req.query.search as string;

    // RBAC: if member/viewer, restrict by assigned_user_id
    const role = await db.getUserRole(req.workspaceContext.workspaceId, req.workspaceContext.userId!)
    const result = await db.getConversations(req.workspaceContext.workspaceId, {
      limit,
      offset,
      status: statusFilter,
      assigned_to: assignedToFilter,
      search: searchTerm,
      ...(role === 'member' || role === 'viewer' ? { assigned_user_id: req.workspaceContext.userId } as any : {})
    });
    
    console.log(`📊 Conversaciones encontradas para workspace ${req.workspaceContext.workspaceId}: ${result.data.length} de ${result.total} (página ${page})`);
    
    res.json({ 
      success: true, 
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasMore: result.data.length === limit
      }
    });
  } catch (error: any) {
    console.error('❌ Error en /conversations:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// Obtener conversación específica con mensajes
router.get('/:id', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid conversation ID' 
      });
      return;
    }

    const conversation = await db.getConversation(conversationId, req.workspaceContext.workspaceId);
    
    res.json({ 
      success: true, 
      data: conversation 
    });
  } catch (error: any) {
    console.error('❌ Error getting conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener mensajes de una conversación
router.get('/:id/messages', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid conversation ID' 
      });
      return;
    }

    const messages = await db.getConversationMessages(conversationId, req.workspaceContext.workspaceId);
    
    res.json({ 
      success: true, 
      data: messages 
    });
  } catch (error: any) {
    console.error('❌ Error getting messages:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Crear nueva conversación
router.post('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const { contact_id, status, assigned_to } = req.body;
    
    if (!contact_id) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required field: contact_id' 
      });
      return;
    }

    const conversation = await db.createConversation({
      contact_id,
      status: status || 'open',
      assigned_to: assigned_to || 'agent_1'
    }, req.workspaceContext.workspaceId);
    
    res.json({ 
      success: true, 
      data: conversation 
    });
  } catch (error: any) {
    console.error('❌ Error creating conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Actualizar conversación (ej: cambiar status)
router.put('/:id', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid conversation ID' 
      });
      return;
    }

    const updates = req.body;
    const conversation = await db.updateConversation(conversationId, updates, req.workspaceContext.workspaceId);
    
    res.json({ 
      success: true, 
      data: conversation 
    });
  } catch (error: any) {
    console.error('❌ Error updating conversation:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Actualizar status específicamente
router.put('/:id/status', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid conversation ID' 
      });
      return;
    }

    const { status } = req.body;
    const conversation = await db.updateConversation(conversationId, { status }, req.workspaceContext.workspaceId);
    
    res.json({ 
      success: true, 
      data: conversation 
    });
  } catch (error: any) {
    console.error('❌ Error updating conversation status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Actualizar assigned_to específicamente
router.put('/:id/assigned-to', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid conversation ID' 
      });
      return;
    }

    const { assigned_to } = req.body;
    const conversation = await db.updateConversation(conversationId, { assigned_to }, req.workspaceContext.workspaceId);
    
    res.json({ 
      success: true, 
      data: conversation 
    });
  } catch (error: any) {
    console.error('❌ Error updating conversation assigned_to:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Asignar conversación a un usuario del workspace (assigned_user_id)
router.put('/:id/assignee', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid conversation ID' 
      });
      return;
    }

    const { assigned_user_id } = req.body as { assigned_user_id?: number | null };
    const updated = await db.updateConversationAssignee(conversationId, assigned_user_id ?? null, req.workspaceContext.workspaceId);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('❌ Error updating conversation assignee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crear mensaje en una conversación
router.post('/:id/messages', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid conversation ID' 
      });
      return;
    }

    const messageData = req.body;
    const message = await db.createMessage(messageData, conversationId, req.workspaceContext.workspaceId);
    
    res.json({ 
      success: true, 
      data: message 
    });
  } catch (error: any) {
    console.error('❌ Error creating message:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Enviar mensaje a través del servicio externo y registrar en DB
router.post('/:id/messages/send', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      res.status(400).json({ success: false, error: 'Invalid conversation ID' });
      return;
    }

    const { content, metadata } = req.body || {};
    if (!content || typeof content !== 'string') {
      res.status(400).json({ success: false, error: 'Missing content' });
      return;
    }

    // Lookup conversation to get contact_id and channel_type (when present)
    const conversation = await db.getConversation(conversationId, req.workspaceContext.workspaceId);
    const contactId = (conversation as any)?.contact?.id || (conversation as any)?.contact_id;
    const contactPhone = (conversation as any)?.contact?.phone;
    const channelType = (conversation as any)?.channel_type || (conversation as any)?.metadata?.platform || null;

    // Insert message as human (agent) in DB first
    const inserted = await db.createMessage({
      content,
      role: 'assistant',
      sender_type: 'human',
      sent_by: req.workspaceContext.userId,
      metadata: { origin: 'app', ...(metadata || {}) }
    }, conversationId, req.workspaceContext.workspaceId);

    // Prefer WhatsApp-specific dispatcher if enabled and channel matches
    const waUrl = process.env.WHATSAPP_SEND_TEXT_URL; // full endpoint e.g. https://webhook.ateneai.com/api/whatsapp/send/text
    const waToken = process.env.WHATSAPP_SERVICE_TOKEN;
    const enabledWorkspacesEnv = process.env.WHATSAPP_ENABLED_WORKSPACES || '';
    const enabledWorkspaces = enabledWorkspacesEnv
      .split(',')
      .map(v => parseInt(v.trim()))
      .filter(n => !Number.isNaN(n));
    const isWorkspaceEnabled = enabledWorkspaces.length === 0 || enabledWorkspaces.includes(req.workspaceContext.workspaceId);

    // Normalize platform and add fallback when channel is unknown but phone looks valid
    const platformSource = (channelType || (conversation as any)?.metadata?.platform || '') as string;
    const platformNormalized = typeof platformSource === 'string' ? platformSource.toLowerCase().trim() : '';
    const looksLikePhone = typeof contactPhone === 'string' && /^[+]?[\d\s-]{6,}$/.test(contactPhone);
    const shouldUseWhatsApp = Boolean(
      waUrl && isWorkspaceEnabled && contactPhone && (
        platformNormalized === 'whatsapp' || (platformNormalized === '' && looksLikePhone)
      )
    );

    console.log('📨 Send debug →', {
      conversationId,
      workspaceId: req.workspaceContext.workspaceId,
      contactId,
      contactPhone,
      channelType,
      platformNormalized,
      enabledWorkspaces,
      isWorkspaceEnabled,
      hasWaUrl: Boolean(waUrl),
      shouldUseWhatsApp
    });

    if (shouldUseWhatsApp) {
      try {
        const resp = await fetch(waUrl as string, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(waToken ? { Authorization: `Bearer ${waToken}` } : {})
          },
          body: JSON.stringify({
            to: contactPhone,
            text: content,
            workspace_id: req.workspaceContext.workspaceId,
            conversation_id: conversationId,
            contact_id: contactId,
            agent_id: req.workspaceContext.userId,
            metadata: { message_id: inserted.id }
          })
        });
        console.log('✅ WhatsApp send response:', {
          ok: resp.ok,
          status: resp.status,
          statusText: resp.statusText
        });
      } catch (waErr) {
        console.error('❌ WhatsApp service send failed:', waErr);
      }
    } else {
      // Generic external messaging dispatch (optional)
      const externalUrl = process.env.EXTERNAL_MESSAGING_URL;
      const externalToken = process.env.EXTERNAL_MESSAGING_TOKEN;
      if (!externalUrl) {
        console.warn('⚠️ EXTERNAL_MESSAGING_URL not configured; skipping external dispatch');
      } else {
        try {
          await fetch(`${externalUrl.replace(/\/$/, '')}/send-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(externalToken ? { 'Authorization': `Bearer ${externalToken}` } : {})
            },
            body: JSON.stringify({
              workspace_id: req.workspaceContext.workspaceId,
              conversation_id: conversationId,
              contact_id: contactId,
              message: content,
              channel_type: channelType,
              agent_id: req.workspaceContext.userId,
            })
          });
        } catch (dispatchError) {
          console.error('❌ External send failed:', dispatchError);
        }
      }
    }

    res.json({ success: true, data: inserted });
  } catch (error: any) {
    console.error('❌ Error sending message via external service:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

// ==============================
// SSE: Real-time message stream
// ==============================
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

router.get('/:id/stream', async (req, res): Promise<void> => {
  try {
    const conversationId = parseInt(req.params.id);
    if (isNaN(conversationId)) {
      res.status(400).json({ success: false, error: 'Invalid conversation ID' });
      return;
    }

    // Support token as query param (since EventSource cannot set headers)
    const token = (req.query.token as string) || '';
    if (!token) {
      res.status(401).json({ success: false, error: 'Missing token' });
      return;
    }

    // Verify Clerk token to get user and workspace context (simulate request with Authorization header)
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token}`);
    const fetchRequest = new Request(url, { method: 'GET', headers });

    const authResult = await clerkClient.authenticateRequest(fetchRequest, {
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });
    if (!authResult.isAuthenticated) {
      res.status(401).json({ success: false, error: 'Authentication failed', reason: authResult.reason });
      return;
    }

    const auth = authResult.toAuth();
    const clerkUserId = 'userId' in auth ? auth.userId : null;
    if (!clerkUserId) {
      res.status(401).json({ success: false, error: 'User session required' });
      return;
    }

    // Build workspace context
    const { WorkspaceContext } = await import('../services/supabase-workspace');
    const workspaceContext = await WorkspaceContext.fromClerkUserId(clerkUserId);

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Initial ping
    res.write(`event: ping\n`);
    res.write(`data: {"ok":true}\n\n`);

    // Heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.write(`event: ping\n`);
        res.write(`data: {"ts":${Date.now()}}\n\n`);
      } catch {
        // ignore
      }
    }, 25000);

    // Subscribe to Supabase realtime for this conversation
    const channel = supabase
      .channel(`messages_convo_${workspaceContext.workspaceId}_${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABLES.MESSAGES,
        filter: `workspace_id=eq.${workspaceContext.workspaceId}`
      }, (payload) => {
        // Filter by conversation ID
        const record: any = (payload as any).new || (payload as any).old || {};
        if (record.conversation_id !== conversationId) return;

        const eventPayload = {
          type: (payload as any).eventType,
          record,
        };
        res.write(`event: message\n`);
        res.write(`data: ${JSON.stringify(eventPayload)}\n\n`);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          res.write(`event: subscribed\n`);
          res.write(`data: {"room":"messages","conversation_id":${conversationId}}\n\n`);
        }
      });

    // Cleanup on close
    req.on('close', () => {
      clearInterval(heartbeat);
      try { supabase.removeChannel(channel); } catch {}
      res.end();
    });
  } catch (error: any) {
    console.error('❌ SSE stream error:', error);
    try {
      res.status(500).json({ success: false, error: error.message });
    } catch {}
  }
});