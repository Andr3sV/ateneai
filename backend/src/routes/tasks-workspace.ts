import { Router } from 'express'
import { requireWorkspaceContext } from '../middleware/workspace'
import { db, supabase } from '../services/supabase-workspace'

const router = Router()

// List tasks with filters
router.get('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    const ctx = req.workspaceContext!
    const { q, assignee_id, from, to, page = '1', limit = '20' } = req.query as any
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (p - 1) * l;

    let countQuery = supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ctx.workspaceId)

    if (q) countQuery = countQuery.ilike('title', `%${q}%`)
    if (assignee_id) countQuery = countQuery.contains('assignees', [{ id: Number(assignee_id) }]) as any
    if (from && to) countQuery = countQuery.gte('due_date', from).lte('due_date', to)

    const { count, error: countError } = await countQuery
    if (countError) throw countError

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', ctx.workspaceId)
      .order('due_date', { ascending: true })

    if (q) query = query.ilike('title', `%${q}%`)
    if (assignee_id) query = query.contains('assignees', [{ id: Number(assignee_id) }]) as any
    if (from && to) query = query.gte('due_date', from).lte('due_date', to)

    if (offset || l) query = query.range(offset, offset + l - 1)

    const { data, error } = await query
    if (error) throw error

    res.json({ success: true, data, pagination: { page: p, limit: l, total: count || 0, totalPages: Math.ceil((count || 0) / l) } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
    return
  }
})

// Create task
router.post('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    const ctx = req.workspaceContext!
    const { title, due_date, assignees = [], contacts = [] } = req.body || {}
    if (!title) { res.status(400).json({ success: false, error: 'title required' }); return }
    const { data, error } = await supabase
      .from('tasks')
      .insert({ workspace_id: ctx.workspaceId, title, due_date: due_date || null, assignees, contacts })
      .select('*')
      .single()
    if (error) throw error
    res.json({ success: true, data })
    return
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
    return
  }
})

// Update task
router.put('/:id', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    const ctx = req.workspaceContext!
    const id = parseInt(req.params.id)
    const { title, due_date, assignees, contacts } = req.body || {}
    const { data, error } = await supabase
      .from('tasks')
      .update({ title, due_date, assignees, contacts })
      .eq('workspace_id', ctx.workspaceId)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    res.json({ success: true, data })
    return
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
    return
  }
})

// Delete task
router.delete('/:id', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    const ctx = req.workspaceContext!
    const id = parseInt(req.params.id)
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('workspace_id', ctx.workspaceId)
      .eq('id', id)
    if (error) throw error
    res.json({ success: true })
    return
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
    return
  }
})

// Get tasks linked to a specific contact (by contact_id inside contacts[])
router.get('/by-contact/:contactId', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    const ctx = req.workspaceContext!
    const contactId = parseInt(req.params.contactId)
    if (!Number.isFinite(contactId)) {
      res.status(400).json({ success: false, error: 'Invalid contact id' });
      return
    }
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', ctx.workspaceId)
      .order('due_date', { ascending: true })
      .limit(200)
    if (error) throw error
    const filtered = (data || []).filter((row: any) => {
      const arr = Array.isArray(row.contacts) ? row.contacts : []
      return arr.some((c: any) => String(c?.id) === String(contactId))
    })
    res.json({ success: true, data: filtered })
    return
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
    return
  }
})

export default router

// Helper endpoint: list workspace members (assignees)
router.get('/helpers/members', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    const ctx = req.workspaceContext!
    
    // First get workspace users
    const { data: workspaceUsers, error: workspaceError } = await supabase
      .from('workspace_users')
      .select('user_id')
      .eq('workspace_id', ctx.workspaceId)
    
    if (workspaceError) throw workspaceError
    
    if (!workspaceUsers || workspaceUsers.length === 0) {
      res.json({ success: true, data: [] })
      return
    }
    
    const userIds = workspaceUsers.map(wu => wu.user_id)
    
    // Then get user details
    const { data: users, error: usersError } = await supabase
      .from('users_new')
      .select('id, first_name, last_name')
      .in('id', userIds)
    
    if (usersError) throw usersError
    
    const members = (users || []).map((user: any) => ({ 
      id: user.id, 
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || `User ${user.id}` 
    }))
    
    res.json({ success: true, data: members })
    return
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
    return
  }
})


