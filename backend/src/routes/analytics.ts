import { Router } from 'express';
import { db } from '../services/supabase';

const router = Router();

// Obtener analytics del cliente
router.get('/', async (req, res): Promise<void> => {
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
    const filters = {
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
    };
    
    const analytics = await db.getAnalytics(client.id, filters);
    
    res.json({ 
      success: true, 
      data: analytics 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener estadísticas de escalación
router.get('/escalation-stats', async (req, res): Promise<void> => {
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
    const allConversations = await db.getConversationsByClient(client.id);
    const escalatedConversations = await db.getEscalatedConversations(client.id);
    
    const stats = {
      total_conversations: allConversations.length,
      escalated_conversations: escalatedConversations.length,
      escalation_rate: allConversations.length > 0 
        ? (escalatedConversations.length / allConversations.length) * 100 
        : 0
    };
    
    res.json({ 
      success: true, 
      data: stats 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener estadísticas del dashboard
router.get('/dashboard-stats', async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Usuario no autenticado' 
      });
      return;
    }

    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    
    let clientId: number;
    
    try {
      const client = await db.getClientByClerkId(req.user.clerk_user_id);
      clientId = client.id;
    } catch (error) {
      // FALLBACK: Si no encontramos cliente para este Clerk ID, usar cliente ID=1
      console.log(`⚠️  Cliente no encontrado para Clerk ID: ${req.user.clerk_user_id}, usando cliente ID=1 como fallback`);
      clientId = 1;
    }

    const stats = await db.getDashboardStats(clientId, startDate, endDate);
    
    res.json({ 
      success: true, 
      data: stats 
    });
  } catch (error: any) {
    console.error('❌ Error en /dashboard-stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener datos evolutivos de conversaciones
router.get('/conversations-evolution', async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Usuario no autenticado' 
      });
      return;
    }

    const period = (req.query.period as 'daily' | 'monthly' | 'yearly') || 'daily';
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    
    let clientId: number;
    
    try {
      const client = await db.getClientByClerkId(req.user.clerk_user_id);
      clientId = client.id;
    } catch (error) {
      // FALLBACK: Si no encontramos cliente para este Clerk ID, usar cliente ID=1
      console.log(`⚠️  Cliente no encontrado para Clerk ID: ${req.user.clerk_user_id}, usando cliente ID=1 como fallback`);
      clientId = 1;
    }

    const evolution = await db.getConversationsEvolution(clientId, period, startDate, endDate);
    
    res.json({ 
      success: true, 
      data: evolution 
    });
  } catch (error: any) {
    console.error('❌ Error en /conversations-evolution:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener datos evolutivos de contactos
router.get('/contacts-evolution', async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Usuario no autenticado' 
      });
      return;
    }

    const period = (req.query.period as 'daily' | 'monthly' | 'yearly') || 'daily';
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    
    let clientId: number;
    
    try {
      const client = await db.getClientByClerkId(req.user.clerk_user_id);
      clientId = client.id;
    } catch (error) {
      // FALLBACK: Si no encontramos cliente para este Clerk ID, usar cliente ID=1
      console.log(`⚠️  Cliente no encontrado para Clerk ID: ${req.user.clerk_user_id}, usando cliente ID=1 como fallback`);
      clientId = 1;
    }

    const evolutionData = await db.getContactsEvolution(clientId, period, startDate, endDate);
    
    res.json({ 
      success: true, 
      data: evolutionData 
    });
  } catch (error: any) {
    console.error('❌ Error en /contacts-evolution:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router; 