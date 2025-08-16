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

    const { from, to, status, interest, type, start_date, end_date, contact_id } = req.query as Record<string, string>;

    const filterPayload = {
      from: from || undefined,
      to: to || undefined,
      status: (status as any) || undefined,
      interest: (interest as any) || undefined,
      type: (type as any) || undefined,
      contact_id: contact_id ? Number(contact_id) : undefined,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      limit,
      offset,
    } as const;

    const result = await db.getCalls(req.workspaceContext.workspaceId, filterPayload);

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
    const allowed = ['mql','client','lead']
    const next = (body.status || '').toLowerCase()
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
      callType = 'bulk'
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
    };

    if (!agents || !Array.isArray(agents) || agents.length === 0 || !agentPhoneNumberId || !fromNumber || !Array.isArray(calls) || calls.length === 0) {
      res.status(400).json({ success: false, error: 'Missing fields: agents, agentPhoneNumberId, fromNumber, calls' });
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

    // Prepare payload for voice orchestrator
    const payload = {
      workspaceId: String(req.workspaceContext.workspaceId),
      agents: agents, // Support multiple agents
      agentPhoneNumberId,
      fromNumber,
      calls: calls.map(r => ({ 
        toNumber: r.toNumber, 
        variables: r.variables || {}, 
        metadata: r.metadata || {} 
      })),
      // AMD Configuration
      "x-gate-mode": "twilio_amd_bridge",
      machineDetectionTimeout,
      enableMachineDetection,
      concurrency
    };

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
    let orchestratorCampaignId: string | null = null;
    
    for (let i = 0; i < payload.calls.length; i += CHUNK) {
      const body = { ...payload, calls: payload.calls.slice(i, i + CHUNK) };
      
      console.log('📞 Sending batch call to voice orchestrator:', { 
        url: `${VOICE_URL}/calls/bulk`, 
        workspaceId: body.workspaceId,
        callType,
        callsCount: body.calls.length,
        machineDetectionTimeout,
        enableMachineDetection,
        concurrency
      });
    
      const { data } = await axios.post(
        `${VOICE_URL}/calls/bulk`,
        body,
        { headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' } }
      );
      
      enqueuedTotal += Number(data?.enqueued || 0);
      if (!orchestratorCampaignId) {
        orchestratorCampaignId = (data?.campaignId || data?.campaign_id || data?.id || null) as string | null;
      }
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
        campaign_id: orchestratorCampaignId,
        // Store additional metadata
        metadata: {
          callType,
          agents: agents.map(a => a.agentId),
          machineDetectionTimeout,
          enableMachineDetection,
          concurrency
        }
      });
    } catch (persistErr: any) {
      console.warn('⚠️ Could not persist batch metadata:', persistErr?.message);
    }

    res.json({ success: true, enqueued: enqueuedTotal, campaignId: orchestratorCampaignId });
  } catch (error: any) {
    console.error('❌ Error in POST /calls/bulk:', error.response?.data || error.message);
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


