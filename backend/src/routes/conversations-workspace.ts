import { Router } from 'express';
import { db } from '../services/supabase-workspace';
import { requireWorkspaceContext } from '../middleware/workspace';

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

    const result = await db.getConversations(req.workspaceContext.workspaceId, {
      limit,
      offset,
      status: statusFilter,
      assigned_to: assignedToFilter,
      search: searchTerm
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

export default router;