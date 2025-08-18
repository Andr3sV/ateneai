import { Router } from 'express'
import { requireWorkspaceContext } from '../middleware/workspace'
import { db, supabase } from '../services/supabase-workspace'

const router = Router()

// List tasks with filters
router.get('/', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    const ctx = req.workspaceContext!
    const { q, assignee_id, from, to, page = '1', limit = '20', show_all, unassigned } = req.query as any
    console.log('🔍 Tasks API - ctx:', { workspaceId: ctx.workspaceId, userId: ctx.userId, q, assignee_id, from, to, page, limit, show_all, unassigned })
    const search = q as string | undefined
    const showAll = show_all === 'true' || show_all === '1'
    const unassignedOnly = unassigned === 'true' || unassigned === '1'
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (p - 1) * l;

    // Build base filters
    const baseFilter = (qb: any) => {
      let qq = qb.eq('workspace_id', ctx.workspaceId)
      if (search) qq = qq.ilike('title', `%${search}%`)
      if (from && to) qq = qq.gte('due_date', from).lte('due_date', to)
      return qq
    }

    let totalCount = 0
    let rows: any[] = []

    if (assignee_id) {
      // When filtering by specific assignee, support numeric and string ids
      const assigneeNum = Number(assignee_id)
      try {
        const numericQuery = baseFilter(
          supabase.from('tasks').select('*').order('due_date', { ascending: true })
        ).contains('assignees', [{ id: assigneeNum }] as any)

        const stringQuery = baseFilter(
          supabase.from('tasks').select('*').order('due_date', { ascending: true })
        ).contains('assignees', [{ id: String(assignee_id) }] as any)

        const [{ data: numData, error: numErr }, { data: strData, error: strErr }] = await Promise.all([
          numericQuery,
          stringQuery
        ])
        if (numErr) throw numErr
        if (strErr) throw strErr

        const merged: any[] = []
        const seen = new Set<number>()
        for (const r of [...(numData || []), ...(strData || [])]) {
          if (seen.has(r.id)) continue
          seen.add(r.id)
          merged.push(r)
        }
        totalCount = merged.length
        rows = merged.slice(offset, offset + l)
      } catch (err) {
        console.warn('⚠️ Assignee filter query failed; falling back to in-memory filter:', (err as any)?.message)
        // Fallback: fetch a larger page and filter in memory for stability
        const { data, error } = await baseFilter(
          supabase.from('tasks').select('*').order('due_date', { ascending: true })
        ).limit(1000)
        if (error) throw error
        const all = Array.isArray(data) ? data : []
        const filtered = all.filter((t: any) => {
          const arr = Array.isArray(t.assignees) ? t.assignees : []
          return arr.some((a: any) => String(a?.id) === String(assignee_id))
        })
        totalCount = filtered.length
        rows = filtered.slice(offset, offset + l)
      }
    } else if (unassignedOnly) {
      // Unassigned: robust fallback filter (JSONB null or empty array)
      try {
        const { data, error } = await baseFilter(
          supabase.from('tasks').select('*').order('due_date', { ascending: true })
        ).limit(1000)
        if (error) throw error
        const all = Array.isArray(data) ? data : []
        const filtered = all.filter((t: any) => {
          const arr = Array.isArray(t.assignees) ? t.assignees : []
          return arr.length === 0
        })
        totalCount = filtered.length
        rows = filtered.slice(offset, offset + l)
      } catch (err) {
        console.error('❌ Unassigned filter failed:', (err as any)?.message)
        rows = []
        totalCount = 0
      }
    } else if (showAll) {
      // Show all tasks in workspace (admin view)
      let countQuery = baseFilter(
        supabase.from('tasks').select('id', { count: 'exact', head: true })
      )
      const { count, error: countError } = await countQuery
      if (countError) throw countError
      totalCount = count || 0

      let query = baseFilter(
        supabase.from('tasks').select('*').order('due_date', { ascending: true })
      )
      if (offset || l) query = query.range(offset, offset + l - 1)
      const { data, error } = await query
      if (error) throw error
      rows = data || []
      console.log('📋 Tasks query result (show_all):', { totalCount, returned: rows.length, workspaceId: ctx.workspaceId, firstFew: rows.slice(0, 3).map(r => ({ id: r.id, workspace_id: r.workspace_id, title: r.title, assigneesLen: Array.isArray(r.assignees) ? r.assignees.length : null })) })
    } else {
      // Default: show all tasks (frontend controls assignee filter explicitly)
      let countQuery = baseFilter(
        supabase.from('tasks').select('id', { count: 'exact', head: true })
      )
      const { count, error: countError } = await countQuery
      if (countError) throw countError
      totalCount = count || 0

      let query = baseFilter(
        supabase.from('tasks').select('*').order('due_date', { ascending: true })
      )
      if (offset || l) query = query.range(offset, offset + l - 1)
      const { data, error } = await query
      if (error) throw error
      rows = data || []
      console.log('📋 Tasks query result (default all):', { totalCount, returned: rows.length, workspaceId: ctx.workspaceId })
    }

    res.json({ success: true, data: rows, pagination: { page: p, limit: l, total: totalCount, totalPages: Math.ceil((totalCount) / l) } })
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
    // Prefer server-side filtering using JSONB contains. Try numeric id first.
    const containsNumeric = [{ id: contactId }]
    const { data: numericMatches, error: numericErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', ctx.workspaceId)
      .contains('contacts', containsNumeric as any)
      .order('due_date', { ascending: true })
      .limit(200)
    if (numericErr) throw numericErr

    // Fallback: some rows might have stored the id as a string
    const containsString = [{ id: String(contactId) }]
    const { data: stringMatches, error: stringErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', ctx.workspaceId)
      .contains('contacts', containsString as any)
      .order('due_date', { ascending: true })
      .limit(200)
    if (stringErr) throw stringErr

    // Merge unique by id keeping order by due_date asc
    const seen = new Set<number>()
    const merged = [...(numericMatches || []), ...(stringMatches || [])].filter((t: any) => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
    res.json({ success: true, data: merged })
    return
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
    return
  }
})

// Debug endpoint to check workspace context
router.get('/debug/context', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    const ctx = req.workspaceContext!
    res.json({ 
      success: true, 
      workspaceId: ctx.workspaceId, 
      userId: ctx.userId,
      timestamp: new Date().toISOString()
    })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

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

export default router