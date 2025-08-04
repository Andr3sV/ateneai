import { Router } from 'express';
import { db } from '../services/supabase';

const router = Router();

// Obtener cliente actual
router.get('/', async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Usuario no autenticado' 
      });
      return;
    }

    const client = await db.getClientByClerkId(req.user.clerk_user_id);
    
    res.json({ 
      success: true, 
      data: client 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Actualizar cliente
router.put('/', async (req, res): Promise<void> => {
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
    const updatedClient = await db.updateClient(client.id, req.body);
    
    res.json({ 
      success: true, 
      data: updatedClient 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router; 