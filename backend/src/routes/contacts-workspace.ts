import { Router } from 'express';
import { db } from '../services/supabase-workspace';
import { requireWorkspaceContext } from '../middleware/workspace';

const router = Router();

// Obtener contactos del workspace con paginación y filtros
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
    const phoneSearch = req.query.phone as string;

    const contacts = await db.getContacts(req.workspaceContext.workspaceId, {
      limit,
      offset,
      status: statusFilter,
      search: phoneSearch
    });
    
    // Get total count for pagination
    const totalContacts = await db.getContacts(req.workspaceContext.workspaceId, {
      status: statusFilter,
      search: phoneSearch
      // No limit/offset for count
    });
    
    const totalCount = totalContacts.length;
    const totalPages = Math.ceil(totalCount / limit);
    
    console.log(`📞 Contactos encontrados para workspace ${req.workspaceContext.workspaceId}: ${contacts.length} de ${totalCount} total (página ${page}/${totalPages})`);
    
    res.json({ 
      success: true, 
      data: contacts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore: contacts.length === limit
      }
    });
  } catch (error: any) {
    console.error('❌ Error en /contacts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// Crear nuevo contacto
router.post('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const contactData = req.body;
    const newContact = await db.createContact(contactData, req.workspaceContext.workspaceId);
    
    console.log(`✅ Contacto creado en workspace ${req.workspaceContext.workspaceId}: ${newContact.id}`);
    
    res.status(201).json({ 
      success: true, 
      data: newContact 
    });
  } catch (error: any) {
    console.error('❌ Error creating contact:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener métricas de contactos del workspace
router.get('/metrics', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    // Obtener métricas del workspace
    const metrics = await db.getContactMetrics(req.workspaceContext.workspaceId);
    
    res.json({ 
      success: true, 
      data: metrics 
    });
  } catch (error: any) {
    console.error('❌ Error getting contact metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener contacto específico
router.get('/:id', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid contact ID' 
      });
      return;
    }

    const contact = await db.getContact(contactId, req.workspaceContext.workspaceId);
    
    res.json({ 
      success: true, 
      data: contact 
    });
  } catch (error: any) {
    console.error('❌ Error getting contact:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Actualizar contacto
router.put('/:id', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid contact ID' 
      });
      return;
    }

    const updates = req.body;
    const updatedContact = await db.updateContact(contactId, updates, req.workspaceContext.workspaceId);
    
    console.log(`✅ Contacto actualizado en workspace ${req.workspaceContext.workspaceId}: ${contactId}`);
    
    res.json({ 
      success: true, 
      data: updatedContact 
    });
  } catch (error: any) {
    console.error('❌ Error updating contact:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener conversaciones de un contacto específico
router.get('/:id/conversations', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid contact ID' 
      });
      return;
    }

    // Get conversations for this specific contact
    const conversations = await db.getConversations(req.workspaceContext.workspaceId, {
      contact_id: contactId,
      limit: 100 // Get all conversations for this contact
    });
    
    res.json({ 
      success: true, 
      data: conversations 
    });
  } catch (error: any) {
    console.error('❌ Error getting contact conversations:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Crear nuevo contacto
router.post('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const { phone, name, email, instagram_url, country, status } = req.body;
    
    if (!phone && !email) {
      res.status(400).json({ 
        success: false, 
        error: 'At least phone or email is required' 
      });
      return;
    }

    const contact = await db.createContact({
      phone,
      name,
      email,
      instagram_url,
      country,
      status: status || 'Lead'
    }, req.workspaceContext.workspaceId);
    
    res.json({ 
      success: true, 
      data: contact 
    });
  } catch (error: any) {
    console.error('❌ Error creating contact:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Actualizar contacto
router.put('/:id', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const contactId = parseInt(req.params.id);
    if (isNaN(contactId)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid contact ID' 
      });
      return;
    }

    const updates = req.body;
    const contact = await db.updateContact(contactId, updates, req.workspaceContext.workspaceId);
    
    res.json({ 
      success: true, 
      data: contact 
    });
  } catch (error: any) {
    console.error('❌ Error updating contact:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;