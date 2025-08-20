import { Router } from 'express';
import { db } from '../services/supabase-workspace';
import { requireWorkspaceContext } from '../middleware/workspace';
import axios from 'axios';

const router = Router();

// List calls with filters and pagination
router.get('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { from, to, status, interest, type, start_date, end_date, contact_id, assigned_user_id, unassigned } = req.query as Record<string, string>;

    const filterPayload = {
      from: from || undefined,
      to: to || undefined,
      status: (status as any) || undefined,
      interest: (interest as any) || undefined,
      type: (type as any) || undefined,
      contact_id: contact_id ? Number(contact_id) : undefined,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      assigned_user_id: assigned_user_id ? Number(assigned_user_id) : undefined,
      unassigned: unassigned === 'true' ? true : undefined,
      limit,
      offset,
    } as const;

    // RBAC: member/viewer restricted to own assigned calls
    const role = await db.getUserRole(req.workspaceContext.workspaceId, req.workspaceContext.userId!)
    const effectiveFilters = { ...filterPayload } as any
    if (role === 'member' || role === 'viewer') {
      effectiveFilters.assigned_user_id = req.workspaceContext.userId
      delete effectiveFilters.unassigned
    }
    const result = await db.getCalls(req.workspaceContext.workspaceId, effectiveFilters);

    console.log(`📞 Calls list for workspace ${req.workspaceContext.workspaceId}: ${result.data.length} of ${result.total} (page ${page})`, filterPayload);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil((result.total || 0) / limit),
        hasMore: result.data.length === limit,
      },
    });
  } catch (error: any) {
    console.error('❌ Error in GET /calls:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single call by id with transcript and criteria_evaluation
router.get('/:id', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    const id = parseInt(req.params.id as string)
    if (!Number.isFinite(id)) {
      res.status(400).json({ success: false, error: 'Invalid id' })
      return;
    }
    const result = await db.getCallById?.(req.workspaceContext.workspaceId, id)
    if (!result) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    res.json({ success: true, data: result })
  } catch (error: any) {
    console.error('❌ Error in GET /calls/:id:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update call status
router.put('/:id/status', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    const id = parseInt(req.params.id as string)
    if (!Number.isFinite(id)) {
      res.status(400).json({ success: false, error: 'Invalid id' })
      return;
    }
    
    const body = req.body as { status?: string }
    const next = (body.status || '').toLowerCase()
    
    const allowed = ['mql','client','lead']
    if (!allowed.includes(next)) {
      res.status(400).json({ success: false, error: `Invalid status. Allowed: ${allowed.join(', ')}` })
      return;
    }
    
    const updated = await db.updateCallStatus(req.workspaceContext.workspaceId, id, next as any)
    res.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('❌ Error in PUT /calls/:id/status:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Assign call to a workspace user
router.put('/:id/assignee', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    
    // RBAC: Only admin/owner can change assignees
    const role = await db.getUserRole(req.workspaceContext.workspaceId, req.workspaceContext.userId!)
    if (role === 'member' || role === 'viewer') {
      res.status(403).json({ 
        success: false, 
        error: 'Member/Viewer cannot change call assignees' 
      })
      return;
    }
    
    const id = parseInt(req.params.id as string)
    if (!Number.isFinite(id)) {
      res.status(400).json({ success: false, error: 'Invalid id' })
      return;
    }
    const { assigned_user_id } = req.body as { assigned_user_id?: number | null }
    const updated = await db.updateCallAssignee(req.workspaceContext.workspaceId, id, assigned_user_id ?? null)
    res.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('❌ Error in PUT /calls/:id/assignee:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Dashboard stats for calls
router.get('/dashboard/stats', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }

    const { start_date, end_date } = req.query as Record<string, string>;
    const stats = await db.getCallsStats(req.workspaceContext.workspaceId, start_date, end_date);

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('❌ Error in GET /calls/dashboard/stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Evolution data for calls (supports optional status filter e.g., mql)
router.get('/dashboard/evolution', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }

    const { period, start_date, end_date, status } = req.query as Record<string, string>;
    const resolvedPeriod = (period === 'monthly' || period === 'yearly') ? period : 'daily';

    const evo = await db.getCallsEvolution(
      req.workspaceContext.workspaceId,
      resolvedPeriod,
      start_date,
      end_date,
      (status as any) || undefined
    );

    res.json({ success: true, data: evo });
  } catch (error: any) {
    console.error('❌ Error in GET /calls/dashboard/evolution:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Agent leaderboard
router.get('/dashboard/agents', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    const { start_date, end_date, limit } = req.query as Record<string, string>;
    const result = await db.getAgentLeaderboard(
      req.workspaceContext.workspaceId,
      start_date,
      end_date,
      limit ? parseInt(limit, 10) : 5
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error fetching agent leaderboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// MQLs by city
router.get('/dashboard/mqls-by-city', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    const { start_date, end_date } = req.query as Record<string, string>;
    const result = await db.getMqlsByCity(
      req.workspaceContext.workspaceId,
      start_date,
      end_date,
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error fetching mqls by city:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Contact repetition and averages
router.get('/dashboard/contact-repetition', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    const { start_date, end_date, limit } = req.query as Record<string, string>;
    const result = await db.getContactRepetition(
      req.workspaceContext.workspaceId,
      start_date,
      end_date,
      limit ? parseInt(limit, 10) : 10
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error fetching contact repetition:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

// Bulk calling integration (voice orchestrator)
// POST /api/calls/bulk
// Body: {
//   campaignName?: string,
//   campaignId?: string,
//   agents: Array<{ agentId: string }>, // Updated: support multiple agents
//   agentPhoneNumberId: string, // Updated: renamed from agentPhoneExternalId
//   fromNumber: string,
//   calls: Array<{ toNumber: string; variables?: Record<string, string>; metadata?: Record<string, any> }>, // Updated: renamed from rows
//   // New AMD Configuration
//   machineDetectionTimeout?: number,
//   enableMachineDetection?: boolean,
//   concurrency?: number,
//   // New call type
//   callType?: 'bulk' | 'priority'
// }
router.post('/bulk', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }

    const {
      campaignName,
      campaignId,
      agents,
      agentPhoneNumberId,
      fromNumber,
      calls,
      // New AMD Configuration
      machineDetectionTimeout = 6,
      enableMachineDetection = true,
      concurrency = 50,
      // New call type
      callType = 'bulk',
      // New time window configuration
      timeWindow
    } = req.body as {
      campaignName?: string
      campaignId?: string
      agents: Array<{ agentId: string }>
      agentPhoneNumberId: string
      fromNumber: string
      calls: Array<{ toNumber: string; variables?: Record<string, string>; metadata?: Record<string, any> }>
      machineDetectionTimeout?: number
      enableMachineDetection?: boolean
      concurrency?: number
      callType?: 'bulk' | 'priority'
      timeWindow?: {
        startTime: string
        endTime: string
        timezone: string
        daysOfWeek: number[]
      }
    };

    if (!agents || !Array.isArray(agents) || agents.length === 0 || !Array.isArray(calls) || calls.length === 0) {
      res.status(400).json({ success: false, error: 'Missing fields: agents, calls' });
      return;
    }

    // Validate AMD configuration
    if (machineDetectionTimeout < 1 || machineDetectionTimeout > 30) {
      res.status(400).json({ success: false, error: 'machineDetectionTimeout must be between 1 and 30 seconds' });
      return;
    }

    if (concurrency < 1 || concurrency > 100) {
      res.status(400).json({ success: false, error: 'concurrency must be between 1 and 100' });
      return;
    }

    // Validate time window configuration
    if (timeWindow) {
      if (!timeWindow.startTime || !timeWindow.endTime || !timeWindow.timezone || !Array.isArray(timeWindow.daysOfWeek)) {
        res.status(400).json({ success: false, error: 'Invalid time window configuration' });
        return;
      }
      
      if (timeWindow.startTime >= timeWindow.endTime) {
        res.status(400).json({ success: false, error: 'Start time must be before end time' });
        return;
      }
      
      if (timeWindow.daysOfWeek.length === 0) {
        res.status(400).json({ success: false, error: 'At least one day of the week must be selected' });
        return;
      }
      
      // Validate days are between 1-7
      if (timeWindow.daysOfWeek.some(day => day < 1 || day > 7)) {
        res.status(400).json({ success: false, error: 'Days of week must be between 1 (Monday) and 7 (Sunday)' });
        return;
      }
    }

    // Normalize agents to include phone configuration per new orchestrator contract
    const normalizedAgents = agents.map((a: any) => ({
      agentId: a.agentId,
      agentPhoneNumberId: a.agentPhoneNumberId ?? agentPhoneNumberId,
      fromNumber: a.fromNumber ?? fromNumber,
    }));

    // Validate that each agent has required phone configuration
    const invalidAgent = normalizedAgents.find(a => !a.agentId || !a.agentPhoneNumberId || !a.fromNumber);
    if (invalidAgent) {
      res.status(400).json({ success: false, error: 'Each agent must include agentId, agentPhoneNumberId and fromNumber (either per agent or via top-level agentPhoneNumberId/fromNumber)' });
      return;
    }

    // Ensure we use our own campaignId (provided or generated)
    const finalCampaignId = campaignId || `batch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    console.log(`📞 Using campaignId: ${finalCampaignId} (${campaignId ? 'provided' : 'generated'})`)

    // Prepare payload for voice orchestrator (trunking mode)
    const payload = {
      workspaceId: String(req.workspaceContext.workspaceId),
      agents: normalizedAgents,
      campaignId: finalCampaignId,
      concurrency,
      calls: calls.map(r => ({
        toNumber: r.toNumber,
        variables: r.variables || {},
        metadata: r.metadata || {}
      })),
    } as any;

    const VOICE_URL = process.env.VOICE_ORCHESTRATOR_URL || 'https://voice.ateneai.com';
    // Per workspace API key with env fallback
    const workspaceApiKey = await db.getWorkspaceVoiceApiKey(req.workspaceContext.workspaceId).catch(() => null);
    const API_KEY = workspaceApiKey || process.env.VOICE_ORCHESTRATOR_API_KEY;
    if (!API_KEY) {
      res.status(500).json({ success: false, error: 'Missing voice API key (workspace.voice_api_key or VOICE_ORCHESTRATOR_API_KEY)' });
      return;
    }

    // Batch in chunks of up to 5000
    const CHUNK = 5000;
    let enqueuedTotal = 0;
    
    for (let i = 0; i < payload.calls.length; i += CHUNK) {
      const body = { ...payload, calls: payload.calls.slice(i, i + CHUNK) };
      
      console.log('📞 Sending batch call to voice orchestrator:', { 
        url: `${VOICE_URL}/calls/bulk`, 
        workspaceId: body.workspaceId,
        callsCount: body.calls.length,
        concurrency
      });
    
      const { data } = await axios.post(
        `${VOICE_URL}/calls/bulk`,
        body,
        { headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', 'x-gate-mode': 'elevenlabs_direct' } }
      );
      
      enqueuedTotal += Number(data?.enqueued || 0);
    }

    // Best-effort: persist batch metadata for listing
    try {
      await db.createBatchCall(req.workspaceContext.workspaceId, {
        name: campaignName || 'Untitled Batch',
        phone_external_id: agentPhoneNumberId,
        agent_external_id: agents[0]?.agentId, // Store first agent for backward compatibility
        status: 'processing',
        total_recipients: payload.calls.length,
        processed_recipients: 0,
        campaign_id: finalCampaignId,
        // Store additional metadata in file_url field
        metadata: {
          callType,
          agents: normalizedAgents.map(a => a.agentId),
          concurrency,
          gateMode: 'elevenlabs_direct',
          // Add time window configuration (local metadata only)
          timeWindow
        }
      });
    } catch (persistErr: any) {
      console.warn('⚠️ Could not persist batch metadata:', persistErr?.message);
    }

    res.json({ success: true, enqueued: enqueuedTotal, campaignId: finalCampaignId });
  } catch (error: any) {
    console.error('❌ Error in POST /calls/bulk:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.response?.data || error.message });
  }
});

// Priority call (immediate 1:1) per new orchestrator contract
router.post('/priority', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }

    const {
      agentId,
      agentPhoneNumberId,
      fromNumber,
      toNumber,
      variables,
      campaignId,
      concurrency
    } = req.body as {
      agentId: string
      agentPhoneNumberId: string
      fromNumber: string
      toNumber: string
      variables?: Record<string, string>
      campaignId?: string
      concurrency?: number
    };

    if (!agentId || !agentPhoneNumberId || !fromNumber || !toNumber) {
      res.status(400).json({ success: false, error: 'Missing required fields: agentId, agentPhoneNumberId, fromNumber, toNumber' });
      return;
    }

    const VOICE_URL = process.env.VOICE_ORCHESTRATOR_URL || 'https://voice.ateneai.com';
    const workspaceApiKey = await db.getWorkspaceVoiceApiKey(req.workspaceContext.workspaceId).catch(() => null);
    const API_KEY = workspaceApiKey || process.env.VOICE_ORCHESTRATOR_API_KEY;
    if (!API_KEY) {
      res.status(500).json({ success: false, error: 'Missing voice API key (workspace.voice_api_key or VOICE_ORCHESTRATOR_API_KEY)' });
      return;
    }

    const body = {
      workspaceId: String(req.workspaceContext.workspaceId),
      agentId,
      agentPhoneNumberId,
      fromNumber,
      toNumber,
      variables: variables || {},
      campaignId,
      concurrency
    } as any;

    console.log('📞 Sending priority call to voice orchestrator:', {
      url: `${VOICE_URL}/calls/priority`,
      workspaceId: body.workspaceId,
      agentId,
      toNumber,
    });

    const { data } = await axios.post(
      `${VOICE_URL}/calls/priority`,
      body,
      { headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', 'x-gate-mode': 'elevenlabs_direct' } }
    );

    res.status(201).json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in POST /calls/priority:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.response?.data || error.message });
  }
});

// Poll progress proxy
router.get('/bulk/progress', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    const { campaignId } = req.query as { campaignId?: string };
    if (!campaignId) {
      res.status(400).json({ success: false, error: 'campaignId is required' });
      return;
    }
    const VOICE_URL = process.env.VOICE_ORCHESTRATOR_URL || 'https://voice.ateneai.com';
    const workspaceApiKey = await db.getWorkspaceVoiceApiKey(req.workspaceContext.workspaceId).catch(() => null);
    const API_KEY = workspaceApiKey || process.env.VOICE_ORCHESTRATOR_API_KEY;
    if (!API_KEY) {
      res.status(500).json({ success: false, error: 'Missing voice API key (workspace.voice_api_key or VOICE_ORCHESTRATOR_API_KEY)' });
      return;
    }
    const { data } = await axios.get(
      `${VOICE_URL}/calls/progress`,
      { params: { workspaceId: req.workspaceContext.workspaceId, campaignId }, headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in GET /calls/bulk/progress:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.response?.data || error.message });
  }
});

// List batch calls for workspace (basic metadata)
router.get('/bulk/list', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    const items = await db.listBatchCalls(req.workspaceContext.workspaceId, { limit: 100 });
    // expose campaignId parsed from file_url if stored as cid:<id>
    const data = items.map((row: any) => ({
      ...row,
      campaign_id: typeof row.file_url === 'string' && row.file_url.startsWith('cid:') ? row.file_url.slice(4) : null,
    }));
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in GET /calls/bulk/list:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Usage proxy (minutes/seconds consumed) from voice orchestrator
router.get('/bulk/usage', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }
    const { campaignId, from, to } = req.query as { campaignId?: string; from?: string; to?: string };
    if (!campaignId || !from || !to) {
      res.status(400).json({ success: false, error: 'campaignId, from and to are required' });
      return;
    }
    const VOICE_URL = process.env.VOICE_ORCHESTRATOR_URL || 'https://voice.ateneai.com';
    const workspaceApiKey = await db.getWorkspaceVoiceApiKey(req.workspaceContext.workspaceId).catch(() => null);
    const API_KEY = workspaceApiKey || process.env.VOICE_ORCHESTRATOR_API_KEY;
    if (!API_KEY) {
      res.status(500).json({ success: false, error: 'Missing voice API key (workspace.voice_api_key or VOICE_ORCHESTRATOR_API_KEY)' });
      return;
    }
    const { data } = await axios.get(`${VOICE_URL}/calls/usage`, {
      params: { workspaceId: String(req.workspaceContext.workspaceId), campaignId, from, to },
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in GET /calls/bulk/usage:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.response?.data || error.message });
  }
});


// Voice Orchestrator: Report proxy (totals and grouped stats)
router.get('/vo/report', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }

    const { from, to, groupBy, campaignId } = req.query as { from?: string; to?: string; groupBy?: string; campaignId?: string };
    if (!from || !to) {
      res.status(400).json({ success: false, error: 'from and to are required (YYYY-MM-DD)' });
      return;
    }

    const VOICE_URL = process.env.VOICE_ORCHESTRATOR_URL || 'https://voice.ateneai.com';
    const workspaceApiKey = await db.getWorkspaceVoiceApiKey(req.workspaceContext.workspaceId).catch(() => null);
    const API_KEY = workspaceApiKey || process.env.VOICE_ORCHESTRATOR_API_KEY;
    if (!API_KEY) {
      res.status(500).json({ success: false, error: 'Missing voice API key (workspace.voice_api_key or VOICE_ORCHESTRATOR_API_KEY)' });
      return;
    }

    const params: Record<string, string> = {
      workspaceId: String(req.workspaceContext.workspaceId),
      from,
      to,
    };
    if (groupBy) params.groupBy = String(groupBy);
    if (campaignId) params.campaignId = String(campaignId);

    const { data } = await axios.get(`${VOICE_URL}/calls/report`, {
      params,
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in GET /calls/vo/report:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({ success: false, error: error.response?.data || error.message });
  }
});


