import { Router } from 'express';
import { db, WorkspaceContext } from '../services/supabase-workspace';
import { requireWorkspaceContext } from '../middleware/workspace';

const router = Router();

// Health check para autenticación
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth service is running (workspace-enabled)',
    timestamp: new Date().toISOString()
  });
});

// Obtener información del usuario y workspace
router.get('/user', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext || !req.clerkUserId) {
      res.status(401).json({ 
        success: false, 
        error: 'No workspace context available' 
      });
      return;
    }

    const user = await db.getUserByClerkId(req.clerkUserId);
    const workspace = await db.getWorkspace(req.workspaceContext.workspaceId);
    
    res.json({ 
      success: true, 
      data: {
        user,
        workspace,
        context: {
          workspaceId: req.workspaceContext.workspaceId,
          userId: req.workspaceContext.userId
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Error getting user info:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Compatibility endpoint: obtener "cliente" (workspace) por Clerk ID
router.get('/client', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.clerkUserId) {
      res.status(401).json({ 
        success: false, 
        error: 'Missing Clerk user ID' 
      });
      return;
    }

    // Use compatibility method to get "client" data
    const client = await db.getClientByClerkId(req.clerkUserId);
    
    res.json({ 
      success: true, 
      data: client 
    });
  } catch (error: any) {
    console.error('❌ Error getting client by Clerk ID:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Crear nuevo usuario (para onboarding)
router.post('/user', async (req, res): Promise<void> => {
  try {
    const { email, clerk_user_id, first_name, last_name } = req.body;
    
    if (!email || !clerk_user_id) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: email, clerk_user_id' 
      });
      return;
    }

    // Create user
    const user = await db.createUser({
      email,
      clerk_user_id,
      first_name,
      last_name
    });
    
    res.json({ 
      success: true, 
      data: user 
    });
  } catch (error: any) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;