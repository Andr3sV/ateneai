import { Router } from 'express';
import { db } from '../services/supabase-workspace';
import { requireWorkspaceContext } from '../middleware/workspace';
import axios from 'axios';

const router = Router();
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

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

// Update agent status
router.put('/:id/status', requireWorkspaceContext, async (req, res): Promise<void> => {
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

    const { status } = req.body;
    if (!status || !['active', 'inactive'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status. Must be "active" or "inactive"' });
      return;
    }

    console.log(`📝 Updating agent ${agentId} status to: ${status}`);
    
    const agent = await db.updateAgent(agentId, { status }, req.workspaceContext.workspaceId);
    
    console.log(`✅ Agent ${agentId} status updated successfully`);
    res.json({ success: true, data: agent });
  } catch (error: any) {
    console.error('❌ Error updating agent status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ElevenLabs agent configuration
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

    // Get agent from database to get external_id
    const agent = await db.getAgent(agentId, req.workspaceContext.workspaceId);
    if (!agent) {
      res.status(404).json({ success: false, error: 'Agent not found' });
      return;
    }

    if (!agent.external_id) {
      res.status(400).json({ success: false, error: 'Agent does not have an ElevenLabs external_id' });
      return;
    }

    // Fetch agent configuration from ElevenLabs
    console.log('🔍 Fetching ElevenLabs agent configuration:', agent.external_id);
    const response = await axios.get(
      `${ELEVENLABS_API_URL}/convai/agents/${agent.external_id}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ ElevenLabs agent configuration retrieved successfully');
    res.json({ success: true, data: { elevenlabs: response.data } });
  } catch (error: any) {
    console.error('❌ Error fetching ElevenLabs agent configuration:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.message || 'Failed to fetch agent configuration';
    res.status(status).json({ success: false, error: message });
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

    // Get agent from database to get external_id
    const agent = await db.getAgent(agentId, req.workspaceContext.workspaceId);
    if (!agent) {
      res.status(404).json({ success: false, error: 'Agent not found' });
      return;
    }

    if (!agent.external_id) {
      res.status(400).json({ success: false, error: 'Agent does not have an ElevenLabs external_id' });
      return;
    }

    // Accept both camelCase and snake_case from frontend
    const firstMessage = req.body.firstMessage || req.body.first_message;
    const prompt = req.body.prompt;
    const evaluationCriteria = req.body.evaluationCriteria || req.body.evaluation_criteria;

    console.log('📥 Received update request:', {
      firstMessage: firstMessage !== undefined ? 'provided' : 'not provided',
      prompt: prompt !== undefined ? 'provided' : 'not provided',
      evaluationCriteria: evaluationCriteria !== undefined ? `${evaluationCriteria?.length || 0} criteria` : 'not provided'
    });

    // Fetch current configuration from ElevenLabs
    console.log('🔍 Fetching current ElevenLabs agent configuration:', agent.external_id);
    const currentConfig = await axios.get(
      `${ELEVENLABS_API_URL}/convai/agents/${agent.external_id}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    // Build the update payload preserving existing configuration
    const updatePayload: any = {
      ...currentConfig.data
    };

    // Update first_message if provided
    if (firstMessage !== undefined) {
      if (!updatePayload.conversation_config) {
        updatePayload.conversation_config = {};
      }
      if (!updatePayload.conversation_config.agent) {
        updatePayload.conversation_config.agent = {};
      }
      updatePayload.conversation_config.agent.first_message = firstMessage;
      console.log('📝 Updating first_message');
    }

    // Update prompt if provided
    if (prompt !== undefined) {
      if (!updatePayload.conversation_config) {
        updatePayload.conversation_config = {};
      }
      if (!updatePayload.conversation_config.agent) {
        updatePayload.conversation_config.agent = {};
      }
      if (!updatePayload.conversation_config.agent.prompt) {
        updatePayload.conversation_config.agent.prompt = {};
      }
      updatePayload.conversation_config.agent.prompt.prompt = prompt;
      console.log('📝 Updating agent prompt');
    }

    // Update evaluation criteria if provided
    if (evaluationCriteria !== undefined) {
      if (!updatePayload.platform_settings) {
        updatePayload.platform_settings = {};
      }
      if (!updatePayload.platform_settings.evaluation) {
        updatePayload.platform_settings.evaluation = {};
      }
      updatePayload.platform_settings.evaluation.criteria = evaluationCriteria;
      console.log('📝 Updating evaluation criteria:', evaluationCriteria.length, 'criteria');
    }

    // Send update to ElevenLabs
    console.log('📤 Sending update to ElevenLabs');
    console.log('🔍 Payload preview:', JSON.stringify({
      conversation_config: {
        agent: {
          first_message: updatePayload.conversation_config?.agent?.first_message ? 'SET' : 'NOT SET',
          prompt: updatePayload.conversation_config?.agent?.prompt?.prompt ? 'SET' : 'NOT SET'
        }
      },
      platform_settings: {
        evaluation: {
          criteria: updatePayload.platform_settings?.evaluation?.criteria?.length || 0
        }
      }
    }, null, 2));

    const response = await axios.patch(
      `${ELEVENLABS_API_URL}/convai/agents/${agent.external_id}`,
      updatePayload,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ ElevenLabs agent updated successfully');
    res.json({ success: true, data: { elevenlabs: response.data } });
  } catch (error: any) {
    console.error('❌ Error updating ElevenLabs agent:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.message || 'Failed to update agent configuration';
    res.status(status).json({ success: false, error: message });
  }
});

export default router;

