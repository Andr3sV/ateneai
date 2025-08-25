import { Router } from 'express'
import { requireWorkspaceContext } from '../middleware/workspace'
import { supabase } from '../services/supabase-workspace'

const router = Router()

// List notes (workspace-scoped)
router.get('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    const ctx = req.workspaceContext!
    const { page = '1', limit = '20' } = req.query as any
    const p = Math.max(1, parseInt(String(page)))
    const l = Math.min(100, Math.max(1, parseInt(String(limit))))
    const offset = (p - 1) * l

    const { count, error: countErr } = await supabase
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspaceId)
    if (countErr) throw countErr

    let query = supabase
      .from('notes')
      .select('*')
      .eq('workspace_id', ctx.workspaceId)
      .order('created_at', { ascending: false })
    if (l) query = query.range(offset, offset + l - 1)
    const { data, error } = await query
    if (error) throw error

    res.json({ success: true, data: data || [], pagination: { page: p, limit: l, total: count || 0, totalPages: Math.ceil((count || 0) / l) } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// List notes by call id
router.get('/by-call/:callId', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    const ctx = req.workspaceContext!
    const callId = parseInt(req.params.callId)
    if (!Number.isFinite(callId)) { res.status(400).json({ success: false, error: 'Invalid call id' }); return }
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('workspace_id', ctx.workspaceId)
      .eq('call_id', callId)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Create note
router.post('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    const ctx = req.workspaceContext!
    const { content, call_id } = (req.body || {}) as { content?: string; call_id?: number | null }
    if (!content || String(content).trim().length === 0) { res.status(400).json({ success: false, error: 'content required' }); return }
    const payload: any = {
      workspace_id: ctx.workspaceId,
      author_id: ctx.userId ?? null,
      content: String(content).trim(),
      call_id: Number.isFinite(call_id as any) ? Number(call_id) : null,
    }
    const { data, error } = await supabase
      .from('notes')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router


