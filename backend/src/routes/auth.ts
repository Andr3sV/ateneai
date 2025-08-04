import { Router } from 'express';
import { db } from '../services/supabase';

const router = Router();

// Health check para autenticación
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
});

// Obtener cliente por Clerk ID
router.get('/me', async (req, res): Promise<void> => {
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

export default router; 