"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { getApiUrl } from '@/config/features'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserPlus, Link2 } from 'lucide-react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

type TaskRow = {
  id: number
  title: string
  due_date: string | null
  assignees: { id: number; name: string }[]
  contacts: { id: number; name: string }[]
  call_id?: number | null
}

export function TaskModal({ open, onOpenChange, task, onSaved, initialContacts, initialCallId }: { open: boolean; onOpenChange: (o: boolean) => void; task: TaskRow | null; onSaved: (saved?: TaskRow | null) => void; initialContacts?: { id: number; name: string }[]; initialCallId?: number }) {
  const authenticatedFetch = useAuthenticatedFetch()
  const { user, role } = useWorkspaceContext()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState<Date | undefined>()
  const [assignees, setAssignees] = useState<{ id: number; name: string }[]>([])
  const [contacts, setContacts] = useState<{ id: number; name: string }[]>([])
  const [members, setMembers] = useState<{ id: number; name: string }[]>([])
  const [contactsOpen, setContactsOpen] = useState(false)
  const [contactQuery, setContactQuery] = useState('')
  const [contactResults, setContactResults] = useState<{ id: number; name: string }[]>([])
  const [recordPickerOpen, setRecordPickerOpen] = useState(false)
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)
  const [memberQuery, setMemberQuery] = useState('')
  const [memberResults, setMemberResults] = useState<{ id: number; name: string }[]>([])
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [timeStr, setTimeStr] = useState<string>('12:00')

  // Check if user can edit assignees
  const canEditAssignees = role !== 'member' && role !== 'viewer'

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDue(task.due_date ? new Date(task.due_date) : undefined)
      setAssignees(task.assignees || [])
      setContacts(task.contacts || [])
    } else {
      // Prefill title when creating from a call/contact context
      if (initialContacts && initialContacts.length > 0) {
        const firstName = initialContacts[0]?.name || 'contacto'
        setTitle(`Llamar a ${firstName}`)
      } else {
        setTitle('')
      }
      setDue(undefined)
      setAssignees(user ? [{ id: user.id, name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email }] : [])
      setContacts(initialContacts && initialContacts.length ? initialContacts : [])
    }
  }, [task, open])

  useEffect(() => {
    async function loadMembers() {
      try {
        const data = await authenticatedFetch(getApiUrl('tasks/helpers/members'))
        if (data?.success) setMembers(data.data || [])
      } catch {}
    }
    if (open) loadMembers()
  }, [open])

  // Initialize defaults only when opening create modal
  useEffect(() => {
    if (open && !task) {
      setAssignees(user ? [{ id: user.id, name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email }] : [])
      setContacts(initialContacts && initialContacts.length ? initialContacts : [])
      if (initialContacts && initialContacts.length > 0) {
        const firstName = initialContacts[0]?.name || 'contacto'
        setTitle(prev => prev?.trim() ? prev : `Llamar a ${firstName}`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const q = memberQuery.trim().toLowerCase()
    if (!q) { setMemberResults(members); return }
    setMemberResults(members.filter(m => (m.name || '').toLowerCase().includes(q)))
  }, [memberQuery, members])

  useEffect(() => {
    let t: any
    async function run() {
      try {
        const q = contactQuery.trim()
        if (!q) { setContactResults([]); return }
        const data = await authenticatedFetch(getApiUrl(`contacts?phone=${encodeURIComponent(q)}&limit=10`), { muteErrors: true } as any)
        if (data?.success && Array.isArray(data.data)) {
          const list = (data.data as any[]).map((row: any) => ({ id: row.id, name: row.name || row.phone || `Contact ${row.id}` }))
          setContactResults(list)
        } else {
          setContactResults([])
        }
      } catch {
        setContactResults([])
      }
    }
    t = setTimeout(run, 300)
    return () => clearTimeout(t)
  }, [contactQuery])

  const addContact = (c: { id: number; name: string }) => {
    setContacts(prev => prev.find(x => x.id === c.id) ? prev : [...prev, c])
    setContactQuery('')
  }
  const removeContact = (id: number) => setContacts(prev => prev.filter(c => c.id !== id))

  const handleSave = async () => {
    if (!title.trim()) return
    let dueIso: string | null = null
    if (due) {
      const [hh, mm] = timeStr.split(':')
      const dt = new Date(due.getFullYear(), due.getMonth(), due.getDate(), parseInt(hh) || 12, parseInt(mm) || 0, 0)
      dueIso = dt.toISOString()
    }
    const payload: any = { 
      title, 
      due_date: dueIso, 
      assignees: assignees || [], 
      contacts: contacts || [],
      workspace_id: undefined // Will be set by backend
    }
    if (typeof initialCallId === 'number') payload.call_id = initialCallId
    if (task?.call_id && payload.call_id == null) payload.call_id = task.call_id
    
    // Debug logging
    console.log('📝 TaskModal: Payload being sent:', payload);
    console.log('📝 TaskModal: Payload types:', {
      title: typeof payload.title,
      due_date: typeof payload.due_date,
      assignees: Array.isArray(payload.assignees) ? payload.assignees.length : 'not array',
      contacts: Array.isArray(payload.contacts) ? payload.contacts.length : 'not array',
      call_id: typeof payload.call_id
    });
    
    if (!title.trim()) return
    let saved: TaskRow | null = null
    if (task) {
      console.log('📝 TaskModal: Updating existing task:', task.id);
      const resp = await authenticatedFetch(getApiUrl(`tasks/${task.id}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (resp?.success) saved = resp.data as TaskRow
    } else {
      console.log('📝 TaskModal: Creating new task');
      const resp = await authenticatedFetch(getApiUrl('tasks/create-task-safe'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (resp?.success) saved = resp.data as TaskRow
    }
    onSaved(saved)
    onOpenChange(false)
  }

  const handleDelete = async () => {
    if (!task) return
    await authenticatedFetch(getApiUrl(`tasks/${task.id}`), { method: 'DELETE' })
    onSaved()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[720px] p-0">
        <div className="px-4 py-3 border-b">
          <SheetHeader>
            <SheetTitle>{task ? 'Edit Task' : 'Create Task'}</SheetTitle>
          </SheetHeader>
        </div>
        <div className="px-4 py-4 space-y-4">
          <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />

          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {due ? format(due, 'PPP') : 'Due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={due} onSelect={(d) => d && setDue(d)} />
              </PopoverContent>
            </Popover>
            <input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value || '12:00')} className="h-9 rounded-md border px-2 text-sm" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-4">
              {/* Member picker - only for admin/owner */}
              {canEditAssignees ? (
                <Popover open={memberPickerOpen} onOpenChange={setMemberPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="link" className="px-0 flex items-center gap-1"><UserPlus className="h-4 w-4" /> Select member</Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="start" className="w-80 p-3">
                    <Input autoFocus placeholder="Search member..." value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {assignees.length === 0 ? (
                        <div className="text-sm text-gray-500">Type to search members</div>
                      ) : assignees.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                          {a.name}
                          <button className="ml-1 text-gray-500 hover:text-gray-700" onClick={() => setAssignees(prev => prev.filter(x => x.id !== a.id))}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 max-h-52 overflow-auto divide-y">
                      {(memberResults.length ? memberResults : members).map(m => (
                        <button key={m.id} className="w-full text-left px-2 py-2 hover:bg-gray-50" onClick={() => setAssignees(prev => prev.find(a => a.id === m.id) ? prev : [...prev, m])}>
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <UserPlus className="h-4 w-4" />
                  Assigned to (read-only)
                </div>
              )}
              <Popover open={recordPickerOpen} onOpenChange={setRecordPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="link" className="px-0 flex items-center gap-1"><Link2 className="h-4 w-4" /> Add contact</Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="w-96 p-3">
                  <Input autoFocus placeholder="Search by name or phone..." value={contactQuery} onChange={(e) => setContactQuery(e.target.value)} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {contacts.length === 0 ? (
                      <div className="text-sm text-gray-500">Type to search contacts</div>
                    ) : contacts.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                        <Link href={`/contacts/${c.id}`} className="underline hover:text-gray-900" onClick={(e) => e.stopPropagation()}>
                          {c.name}
                        </Link>
                        <button className="ml-1 text-gray-500 hover:text-gray-700" onClick={() => removeContact(c.id)}>×</button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 max-h-52 overflow-auto divide-y">
                    {contactResults.map(r => (
                      <button key={r.id} className="w-full text-left px-2 py-2 hover:bg-gray-50" onClick={() => addContact(r)}>
                        {r.name}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-wrap gap-2">
              {assignees.map((a) => (
                <span key={a.id} className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${canEditAssignees ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-600'}`}>
                  {a.name}
                  {canEditAssignees && (
                    <button className="ml-1 text-gray-500 hover:text-gray-700" onClick={() => setAssignees(prev => prev.filter(x => x.id !== a.id))}>×</button>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {contacts.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                  <Link href={`/contacts/${c.id}`} className="underline hover:text-gray-900" onClick={(e) => e.stopPropagation()}>
                    {c.name}
                  </Link>
                  <button className="ml-1 text-gray-500 hover:text-gray-700" onClick={() => removeContact(c.id)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {task && (
              <>
                <button className="text-red-600 hover:text-red-700" onClick={() => setConfirmDeleteOpen(true)}>Delete</button>
                <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete task</DialogTitle>
                    </DialogHeader>
                    <div>Are you sure you want to delete this task?</div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={async () => { setConfirmDeleteOpen(false); await handleDelete(); }}>Delete</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}


