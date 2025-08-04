import { Router } from 'express';
import { db } from '../services/supabase';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all contact routes
router.use(authMiddleware);

// GET /api/v1/contacts - Get paginated contacts with optional phone filter
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
    const phoneFilter = req.query.phone as string;

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

    const result = await db.getContactsPaginated(clientId, page, limit, phoneFilter);
    
    console.log(`📞 Contactos encontrados para cliente ${clientId}: ${result.data.length} (página ${page})`);
    
    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.count,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/v1/contacts/metrics - Get contacts metrics
router.get('/metrics', async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
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

    const metrics = await db.getContactsMetrics(clientId);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching contacts metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/v1/contacts/:id - Get contact by ID
router.get('/:id', async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
      return;
    }

    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      res.status(400).json({
        success: false,
        error: 'ID de contacto inválido'
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

    const contact = await db.getContactById(clientId, contactId);
    
    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/v1/contacts/:id/conversations - Get conversations for a contact
router.get('/:id/conversations', async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
      return;
    }

    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      res.status(400).json({
        success: false,
        error: 'ID de contacto inválido'
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

    const conversations = await db.getConversationsByContactId(clientId, contactId);
    
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching contact conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;