import { Router } from 'express';
import { db } from '../services/supabase';

const router = Router();

// Obtener conversaciones del cliente con paginación
router.get('/', async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Usuario no autenticado' 
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Filtros
    const statusFilter = req.query.status as string;
    const assignedToFilter = req.query.assigned_to as string;

    let clientId: number;
    
    try {
      const client = await db.getClientByClerkId(req.user.clerk_user_id);
      clientId = client.id;
      console.log(`✅ Cliente encontrado: ${clientId} para Clerk ID: ${req.user.clerk_user_id}`);
    } catch (error) {
      // FALLBACK: Si no encontramos cliente para este Clerk ID, usar cliente ID=1 (datos existentes)
      console.log(`⚠️  Cliente no encontrado para Clerk ID: ${req.user.clerk_user_id}, usando cliente ID=1 como fallback`);
      clientId = 1;
    }

    const conversations = await db.getConversationsByClientPaginated(clientId, limit, offset, statusFilter, assignedToFilter);
    console.log(`📊 Conversaciones encontradas para cliente ${clientId}: ${conversations.length} (página ${page})`);
    
    res.json({ 
      success: true, 
      data: conversations,
      pagination: {
        page,
        limit,
        hasMore: conversations.length === limit
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

// Obtener conversación específica
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const conversationId = parseInt(req.params.id);
    const conversation = await db.getConversationWithMessages(conversationId);
    
    res.json({ 
      success: true, 
      data: conversation 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener TODAS las conversaciones con paginación (para demo cuando usuario no tiene datos)
router.get('/all', async (req, res): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    console.log(`🔍 Obteniendo conversaciones de fallback para cliente ID=1 (página ${page})...`);
    
    // Usar directamente cliente ID=1 para el fallback (asegurar que es número)
    const clientId = 1;
    const conversations = await db.getConversationsByClientPaginated(clientId, limit, offset);
    console.log(`📊 Conversaciones encontradas: ${conversations.length} (página ${page})`);
    
    res.json({ 
      success: true, 
      data: conversations,
      pagination: {
        page,
        limit,
        hasMore: conversations.length === limit
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching all conversations:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener conversaciones escaladas
router.get('/escalated/all', async (req, res): Promise<void> => {
  try {
    const clerkUserId = req.headers['clerk-user-id'] as string;
    
    if (!clerkUserId) {
      res.status(401).json({ 
        success: false, 
        error: 'Missing clerk-user-id header' 
      });
      return;
    }

    const client = await db.getClientByClerkId(clerkUserId);
    const escalatedConversations = await db.getEscalatedConversations(client.id);
    
    res.json({ 
      success: true, 
      data: escalatedConversations 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// PUT /api/v1/conversations/:id/status - Actualizar status de conversación
router.put('/:id/status', async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
      return;
    }

    const conversationId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(conversationId) || !status) {
      res.status(400).json({
        success: false,
        error: 'ID de conversación o status inválido'
      });
      return;
    }

    // Validar status permitidos
    const allowedStatuses = ['open', 'closed', 'closed_timeout', 'closed_human'];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Status no válido'
      });
      return;
    }

    let clientId: number;
    
    try {
      const client = await db.getClientByClerkId(req.user.clerk_user_id);
      clientId = client.id;
    } catch (error) {
      clientId = 1;
    }

    // Actualizar status
    const updated = await db.updateConversationStatus(conversationId, status, clientId);
    
    res.json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    console.error('❌ Error actualizando status de conversación:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router; 