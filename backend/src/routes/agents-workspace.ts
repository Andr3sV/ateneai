import { Router } from 'express';
import { db } from '../services/supabase-workspace';
import { requireWorkspaceContext } from '../middleware/workspace';
import { getElevenLabsAgent, updateElevenLabsAgent } from '../services/elevenlabs';

const router = Router();

// List agents for workspace (optional filter by type and external_id)
router.get('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    const type = (req.query.type as string) || undefined;
    const externalId = (req.query.external_id as string) || undefined;
    const agents = await db.getAgents(req.workspaceContext.workspaceId, { type, externalId });
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

// Get ElevenLabs agent details by database agent ID
router.get('/:id/elevenlabs', requireWorkspaceContext, async (req, res): Promise<void> => {
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

    // Get agent from database to retrieve external_id
    const agents = await db.getAgents(req.workspaceContext.workspaceId, {});
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
      res.status(404).json({ success: false, error: 'Agent not found' });
      return;
    }

    if (!agent.external_id) {
      res.status(400).json({ success: false, error: 'Agent does not have an external_id' });
      return;
    }

    // Get details from ElevenLabs
    const elevenLabsAgent = await getElevenLabsAgent(agent.external_id);
    
    res.json({ 
      success: true, 
      data: {
        agent: agent,
        elevenlabs: elevenLabsAgent
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching ElevenLabs agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update ElevenLabs agent configuration
router.patch('/:id/elevenlabs', requireWorkspaceContext, async (req, res): Promise<void> => {
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

    // Get agent from database to retrieve external_id
    const agents = await db.getAgents(req.workspaceContext.workspaceId, {});
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
      res.status(404).json({ success: false, error: 'Agent not found' });
      return;
    }

    if (!agent.external_id) {
      res.status(400).json({ success: false, error: 'Agent does not have an external_id' });
      return;
    }

    const { first_message, prompt, evaluation_criteria } = req.body;

    // Update agent in ElevenLabs
    const updatedAgent = await updateElevenLabsAgent(agent.external_id, {
      first_message,
      prompt,
      evaluation_criteria
    });
    
    res.json({ 
      success: true, 
      data: updatedAgent
    });
  } catch (error: any) {
    console.error('❌ Error updating ElevenLabs agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

