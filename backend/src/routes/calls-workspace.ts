import { Router } from 'express';
import { db } from '../services/supabase-workspace';
import { requireWorkspaceContext } from '../middleware/workspace';

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

    const { from, to, status, interest, type, start_date, end_date } = req.query as Record<string, string>;

    const filterPayload = {
      from: from || undefined,
      to: to || undefined,
      status: (status as any) || undefined,
      interest: (interest as any) || undefined,
      type: (type as any) || undefined,
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


