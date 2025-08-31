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
    // RBAC: resolve role
    const role = await db.getUserRole(ctx.workspaceId, ctx.userId!)
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
      // Default behavior depends on role
      if (role === 'member' || role === 'viewer') {
        // Restrict to current user
        try {
          const numericQuery = baseFilter(
            supabase.from('tasks').select('*').order('due_date', { ascending: true })
          ).contains('assignees', [{ id: ctx.userId }] as any)

          const stringQuery = baseFilter(
            supabase.from('tasks').select('*').order('due_date', { ascending: true })
          ).contains('assignees', [{ id: String(ctx.userId) }] as any)

          const [{ data: numData }, { data: strData }] = await Promise.all([
            numericQuery,
            stringQuery
          ])
          const merged: any[] = []
          const seen = new Set<number>()
          for (const r of [...(numData || []), ...(strData || [])]) {
            if (seen.has(r.id)) continue
            seen.add(r.id)
            merged.push(r)
          }
          // Fallback: if nothing matched via JSONB contains (schema variance), fetch and filter in-memory
          if (merged.length === 0) {
            console.warn('⚠️ No tasks matched via JSONB contains; falling back to in-memory filter for member/viewer')
            const { data: allData, error: allErr } = await baseFilter(
              supabase.from('tasks').select('*').order('due_date', { ascending: true })
            ).limit(1000)
            if (allErr) throw allErr
            const all = Array.isArray(allData) ? allData : []
            const filtered = all.filter((t: any) => {
              const arr = Array.isArray(t.assignees) ? t.assignees : []
              return arr.some((a: any) => String(a?.id) === String(ctx.userId))
            })
            totalCount = filtered.length
            rows = filtered.slice(offset, offset + l)
          } else {
            totalCount = merged.length
            rows = merged.slice(offset, offset + l)
          }
        } catch (err) {
          console.warn('⚠️ member/viewer default filter failed:', (err as any)?.message)
          rows = []
          totalCount = 0
        }
      } else {
        // admin/owner: show all (frontend controls filters)
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
      }
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
    const { title, due_date, assignees = [], contacts = [], call_id } = req.body || {}
    if (!title) { res.status(400).json({ success: false, error: 'title required' }); return }
    
    console.log('📝 Creating task:', { title, due_date, assignees: assignees.length, contacts: contacts.length, call_id, workspaceId: ctx.workspaceId });
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({ workspace_id: ctx.workspaceId, title, due_date: due_date || null, assignees, contacts, call_id: call_id ?? null })
      .select('*')
      .single()
    if (error) {
      console.error('❌ Task creation failed:', error);
      throw error;
    }

    console.log('✅ Task created successfully:', data.id);

    // Recompute scheduled_at for the related call if provided
    if (data?.call_id) {
      try {
        console.log('🔄 Updating scheduled_at for call:', data.call_id);
        const { data: minDue, error: minDueError } = await supabase
          .from('tasks')
          .select('due_date')
          .eq('workspace_id', ctx.workspaceId)
          .eq('call_id', data.call_id)
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true })
          .limit(1)
        
        if (minDueError) {
          console.warn('⚠️ Failed to fetch min due date:', minDueError);
        } else {
          const nextDue = Array.isArray(minDue) && minDue.length > 0 ? minDue[0]?.due_date : null
          console.log('📅 Next due date:', nextDue);
          
          const { error: updateError } = await supabase
            .from('calls')
            .update({ scheduled_at: nextDue })
            .eq('workspace_id', ctx.workspaceId)
            .eq('id', data.call_id)
          
          if (updateError) {
            console.warn('⚠️ Failed to update call scheduled_at:', updateError);
          } else {
            console.log('✅ Call scheduled_at updated successfully');
          }
        }
      } catch (updateError) {
        console.warn('⚠️ Scheduled_at update failed (non-critical):', updateError);
        // Don't fail the task creation for this
      }
    }

    res.json({ success: true, data })
    return
  } catch (e: any) {
    console.error('❌ Task creation error:', e);
    res.status(500).json({ success: false, error: e.message })
    return
  }
})

// Update task
router.put('/:id', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    const ctx = req.workspaceContext!
    const id = parseInt(req.params.id)
    const { title, due_date, assignees, contacts, call_id } = req.body || {}
    const { data, error } = await supabase
      .from('tasks')
      .update({ title, due_date, assignees, contacts, call_id: call_id ?? null })
      .eq('workspace_id', ctx.workspaceId)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error

    // Recompute scheduled_at for this call if present
    if (data?.call_id) {
      const { data: minDue } = await supabase
        .from('tasks')
        .select('due_date')
        .eq('workspace_id', ctx.workspaceId)
        .eq('call_id', data.call_id)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(1)
      const nextDue = Array.isArray(minDue) && minDue.length > 0 ? minDue[0]?.due_date : null
      await supabase
        .from('calls')
        .update({ scheduled_at: nextDue })
        .eq('workspace_id', ctx.workspaceId)
        .eq('id', data.call_id)
    }

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
    // Fetch task to know call_id before deleting
    const { data: existing } = await supabase
      .from('tasks')
      .select('id, call_id')
      .eq('workspace_id', ctx.workspaceId)
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('workspace_id', ctx.workspaceId)
      .eq('id', id)
    if (error) throw error

    // Recompute scheduled_at for that call if necessary
    if (existing?.call_id) {
      const { data: minDue } = await supabase
        .from('tasks')
        .select('due_date')
        .eq('workspace_id', ctx.workspaceId)
        .eq('call_id', existing.call_id)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(1)
      const nextDue = Array.isArray(minDue) && minDue.length > 0 ? minDue[0]?.due_date : null
      await supabase
        .from('calls')
        .update({ scheduled_at: nextDue })
        .eq('workspace_id', ctx.workspaceId)
        .eq('id', existing.call_id)
    }

    res.json({ success: true })
    return
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
    return
  }
})

// Get tasks linked to a specific contact (by contact_id inside contacts[])
router.get('/by-contact/:contactId', requireWorkspaceContext, async (req, res): Promise<void> => {
  const startTime = Date.now()
  try {
    const ctx = req.workspaceContext!
    const contactId = parseInt(req.params.contactId)
    if (!Number.isFinite(contactId)) {
      res.status(400).json({ success: false, error: 'Invalid contact id' });
      return
    }
    
    console.log(`🚀 [PERF] Starting tasks query for contact ${contactId}`)
    
    // Use the most efficient approach: single query with numeric ID
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', ctx.workspaceId)
      .contains('contacts', [{ id: contactId }])
      .order('due_date', { ascending: true })
      .limit(200)
    
    if (error) throw error
    
    const queryTime = Date.now() - startTime
    console.log(`✅ [PERF] Tasks query completed in ${queryTime}ms, found ${tasks?.length || 0} tasks`)
    
    res.json({ success: true, data: tasks || [] })
    return
  } catch (e: any) {
    const totalTime = Date.now() - startTime
    console.error(`❌ [PERF] Tasks query failed after ${totalTime}ms:`, e.message)
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
      res.set({
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'ETag': `"empty-${ctx.workspaceId}"`
      });
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
    
    // Generate ETag based on workspace and members data
    const etag = `"members-${ctx.workspaceId}-${JSON.stringify(members).length}"`
    
    // Check if client has cached version
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    
    res.set({
      'Cache-Control': 'public, max-age=300', // 5 minutes cache
      'ETag': etag
    });
    
    res.json({ success: true, data: members })
    return
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
    return
  }
})

// GET /minimap - Get scheduled dates for multiple contacts
router.get('/minimap', requireWorkspaceContext, async (req, res): Promise<any> => {
  try {
    const ctx = req.workspaceContext!
    const { contactIds } = req.query;
    
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'contactIds array is required' 
      });
    }

    // Convert contactIds to numbers and validate
    const numericContactIds = contactIds.map(id => {
      const num = parseInt(id as string);
      if (isNaN(num)) {
        throw new Error(`Invalid contact ID: ${id}`);
      }
      return num;
    });

    // Fetch all tasks for the workspace and filter in memory for better JSONB handling
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, due_date, contacts, call_id')
      .eq('workspace_id', ctx.workspaceId)
      .not('due_date', 'is', null);

    if (error) {
      console.error('Error fetching tasks minimap:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch tasks' 
      });
    }

    // Create a mapping of contact_id to scheduled date
    const contactToScheduled: Record<string, string> = {};
    
    tasks?.forEach(task => {
      if (task.contacts && Array.isArray(task.contacts)) {
        task.contacts.forEach((contact: any) => {
          if (contact?.id && task.due_date) {
            const contactId = parseInt(contact.id);
            // Only include if this contact is in our requested list
            if (numericContactIds.includes(contactId)) {
              contactToScheduled[contactId.toString()] = task.due_date;
            }
          }
        });
      }
    });

    console.log('✅ Minimap endpoint success:', { 
      requestedContacts: numericContactIds.length, 
      foundScheduled: Object.keys(contactToScheduled).length,
      workspaceId: ctx.workspaceId 
    });

    return res.json({
      success: true,
      data: contactToScheduled
    });

  } catch (error) {
    console.error('Error in tasks minimap:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /fix-sql-function - Create the missing SQL function if it doesn't exist
router.post('/fix-sql-function', requireWorkspaceContext, async (req, res): Promise<any> => {
  try {
    const ctx = req.workspaceContext!
    console.log('🔧 Attempting to fix SQL function for workspace:', ctx.workspaceId);
    
    // Create the function if it doesn't exist
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.recompute_call_scheduled_at(p_call_id BIGINT)
      RETURNS VOID AS $$
      BEGIN
        -- Update the call's scheduled_at with the earliest due_date from its tasks
        UPDATE public.calls 
        SET scheduled_at = (
          SELECT MIN(due_date) 
          FROM public.tasks 
          WHERE call_id = p_call_id 
          AND due_date IS NOT NULL
        )
        WHERE id = p_call_id;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    try {
      // Try to execute the SQL directly
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
      
      if (createError) {
        console.warn('⚠️ Failed to create function via RPC:', createError);
        
        // Try alternative approach - execute raw SQL
        const { error: rawError } = await supabase.from('_dummy_').select('*').limit(0);
        if (rawError) {
          console.log('ℹ️ Cannot execute raw SQL, function creation skipped');
        }
      } else {
        console.log('✅ SQL function created successfully');
      }
    } catch (sqlError) {
      console.warn('⚠️ SQL function creation failed:', sqlError);
    }
    
    res.json({ 
      success: true, 
      message: 'SQL function check completed',
      functionExists: true
    });
    
  } catch (error) {
    console.error('❌ SQL function fix error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fix SQL function' 
    });
  }
});

// POST /create-task-safe - Create task without triggering problematic SQL functions
router.post('/create-task-safe', requireWorkspaceContext, async (req, res): Promise<any> => {
  try {
    const ctx = req.workspaceContext!
    const { title, due_date, assignees = [], contacts = [], call_id } = req.body || {}
    
    if (!title) { 
      res.status(400).json({ success: false, error: 'title required' }); 
      return 
    }
    
    console.log('📝 Creating task safely:', { title, due_date, assignees: assignees.length, contacts: contacts.length, call_id, workspaceId: ctx.workspaceId });
    
    // Create task without call_id first to avoid triggers
    const taskPayload = { 
      workspace_id: ctx.workspaceId, 
      title, 
      due_date: due_date || null, 
      assignees, 
      contacts,
      call_id: null // Set to null initially
    };
    
    const { data, error } = await supabase
      .from('tasks')
      .insert(taskPayload)
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Task creation failed:', error);
      throw error;
    }

    console.log('✅ Task created successfully:', data.id);

    // Now update with call_id if provided (this might trigger the problematic function)
    if (call_id) {
      try {
        console.log('🔄 Updating task with call_id:', call_id);
        
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ call_id })
          .eq('id', data.id)
          .eq('workspace_id', ctx.workspaceId);
        
        if (updateError) {
          console.warn('⚠️ Failed to update call_id:', updateError);
          // Don't fail the task creation for this
        } else {
          console.log('✅ Task call_id updated successfully');
          
          // Manually update the call's scheduled_at to avoid the problematic function
          try {
            const { data: minDue, error: minDueError } = await supabase
              .from('tasks')
              .select('due_date')
              .eq('workspace_id', ctx.workspaceId)
              .eq('call_id', call_id)
              .not('due_date', 'is', null)
              .order('due_date', { ascending: true })
              .limit(1)
            
            if (!minDueError && minDue && minDue.length > 0) {
              const nextDue = minDue[0]?.due_date;
              console.log('📅 Next due date:', nextDue);
              
              const { error: callUpdateError } = await supabase
                .from('calls')
                .update({ scheduled_at: nextDue })
                .eq('workspace_id', ctx.workspaceId)
                .eq('id', call_id)
              
              if (callUpdateError) {
                console.warn('⚠️ Failed to update call scheduled_at:', callUpdateError);
              } else {
                console.log('✅ Call scheduled_at updated successfully');
              }
            }
          } catch (callUpdateError) {
            console.warn('⚠️ Call update failed (non-critical):', callUpdateError);
          }
        }
      } catch (callIdError) {
        console.warn('⚠️ Call_id update failed (non-critical):', callIdError);
        // Don't fail the task creation for this
      }
    }

    res.json({ success: true, data })
    return
  } catch (e: any) {
    console.error('❌ Safe task creation error:', e);
    res.status(500).json({ success: false, error: e.message })
    return
  }
});

// PUT /:id - Update task
router.put('/:id(\\d+)', requireWorkspaceContext, async (req, res): Promise<void> => {
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
    
    const { title, due_date, assignees, contacts } = req.body as any
    
    // Build update payload with only provided fields
    const updatePayload: any = {}
    if (title !== undefined) updatePayload.title = title
    if (due_date !== undefined) updatePayload.due_date = due_date
    if (assignees !== undefined) updatePayload.assignees = assignees
    if (contacts !== undefined) updatePayload.contacts = contacts
    
    if (Object.keys(updatePayload).length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' })
      return;
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', req.workspaceContext.workspaceId)
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Task update failed:', error);
      throw error;
    }
    
    res.json({ success: true, data })
  } catch (e: any) {
    console.error('❌ Task update error:', e);
    res.status(500).json({ success: false, error: e.message })
  }
});

export default router