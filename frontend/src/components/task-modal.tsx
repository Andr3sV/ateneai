"use client"

import { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { getApiUrl } from '@/config/features'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

type TaskRow = {
  id: number
  title: string
  due_date: string | null
  assignees: { id: number; name: string }[]
  contacts: { id: number; name: string }[]
}

export function TaskModal({ open, onOpenChange, task, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; task: TaskRow | null; onSaved: () => void }) {
  const authenticatedFetch = useAuthenticatedFetch()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState<Date | undefined>()
  const [assignees, setAssignees] = useState<{ id: number; name: string }[]>([])
  const [contacts, setContacts] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDue(task.due_date ? new Date(task.due_date) : undefined)
      setAssignees(task.assignees || [])
      setContacts(task.contacts || [])
    } else {
      setTitle('')
      setDue(undefined)
      setAssignees([])
      setContacts([])
    }
  }, [task, open])

  const handleSave = async () => {
    const payload = { title, due_date: due ? due.toISOString().slice(0,10) : null, assignees, contacts }
    if (!title.trim()) return
    if (task) {
      await authenticatedFetch(getApiUrl(`tasks/${task.id}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await authenticatedFetch(getApiUrl('tasks'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    onSaved()
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
      <SheetContent className="w-full sm:w-[680px]">
        <SheetHeader>
          <SheetTitle>{task ? 'Edit Task' : 'Create Task'}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div className="flex items-center gap-2">
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
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Assigned to</div>
            <Input placeholder="Add by name (enter to add)" onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const name = (e.target as HTMLInputElement).value.trim()
                if (name) setAssignees((prev) => [...prev, { id: Date.now(), name }])
                ;(e.target as HTMLInputElement).value = ''
              }
            }} />
            <div className="flex flex-wrap gap-2">
              {assignees.map((a, idx) => (
                <span key={idx} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                  {a.name}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Add Record</div>
            <Input placeholder="Add contact (enter to add)" onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const name = (e.target as HTMLInputElement).value.trim()
                if (name) setContacts((prev) => [...prev, { id: Date.now(), name }])
                ;(e.target as HTMLInputElement).value = ''
              }
            }} />
            <div className="flex flex-wrap gap-2">
              {contacts.map((c, idx) => (
                <span key={idx} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {task && (
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}


