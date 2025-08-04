import { Router } from 'express';
import { db } from '../services/supabase-workspace';
import { requireWorkspaceContext } from '../middleware/workspace';

const router = Router();

// Obtener estadísticas del dashboard (workspace-scoped)
router.get('/dashboard-stats', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    
    const stats = await db.getDashboardStats(
      req.workspaceContext.workspaceId, 
      startDate, 
      endDate
    );
    
    console.log(`📊 Dashboard stats for workspace ${req.workspaceContext.workspaceId}:`, {
      conversations: stats.totalConversations,
      contacts: stats.contacts.totalContacts
    });
    
    res.json({ 
      success: true, 
      data: stats 
    });
  } catch (error: any) {
    console.error('❌ Error getting dashboard stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener evolución de conversaciones
router.get('/conversations-evolution', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const period = (req.query.period as 'daily' | 'monthly' | 'yearly') || 'daily';
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    
    const evolution = await db.getConversationsEvolution(
      req.workspaceContext.workspaceId, 
      period,
      startDate, 
      endDate
    );
    
    res.json({ 
      success: true, 
      data: evolution 
    });
  } catch (error: any) {
    console.error('❌ Error getting conversations evolution:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener evolución de contactos
router.get('/contacts-evolution', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const period = (req.query.period as 'daily' | 'monthly' | 'yearly') || 'daily';
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    
    const evolution = await db.getContactsEvolution(
      req.workspaceContext.workspaceId, 
      period,
      startDate, 
      endDate
    );
    
    res.json({ 
      success: true, 
      data: evolution 
    });
  } catch (error: any) {
    console.error('❌ Error getting contacts evolution:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Analytics service is running (workspace-enabled)',
    timestamp: new Date().toISOString()
  });
});

// Legacy compatibility endpoints
router.get('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  // Redirect to dashboard endpoint for compatibility
  if (!req.workspaceContext) {
    res.status(401).json({ 
      success: false, 
      error: 'No workspace context available' 
    });
    return;
  }

  const startDate = req.query.start_date as string;
  const endDate = req.query.end_date as string;
  
  const stats = await db.getDashboardStats(
    req.workspaceContext.workspaceId, 
    startDate, 
    endDate
  );
  
  res.json({ 
    success: true, 
    data: stats 
  });
});

export default router;