import { Router } from 'express';
import { db } from '../services/supabase-workspace';
import { requireWorkspaceContext } from '../middleware/workspace';

const router = Router();

// List agents for workspace
router.get('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    const agents = await db.getAgents(req.workspaceContext.workspaceId);
    res.json({ success: true, data: agents });
  } catch (error: any) {
    console.error('❌ Error listing agents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create agent
router.post('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    const agent = await db.createAgent(req.body, req.workspaceContext.workspaceId);
    res.json({ success: true, data: agent });
  } catch (error: any) {
    console.error('❌ Error creating agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update agent
router.put('/:id', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    const agentId = parseInt(req.params.id);
    if (isNaN(agentId)) {
      res.status(400).json({ success: false, error: 'Invalid agent ID' });
      return;
    }
    const agent = await db.updateAgent(agentId, req.body, req.workspaceContext.workspaceId);
    res.json({ success: true, data: agent });
  } catch (error: any) {
    console.error('❌ Error updating agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

