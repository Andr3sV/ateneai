'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { getApiUrl } from '@/config/features'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { Plus, Filter, Calendar as CalendarIcon } from 'lucide-react'
import { TaskModal } from '@/components/task-modal'

type TaskRow = {
  id: number
  title: string
  due_date: string | null
  assignees: { id: number; name: string }[]
  contacts: { id: number; name: string }[]
}

export default function TasksPage() {
  usePageTitle('Tasks')
  const authenticatedFetch = useAuthenticatedFetch()

  const [rows, setRows] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [dateStart, setDateStart] = useState<Date | undefined>()
  const [dateEnd, setDateEnd] = useState<Date | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TaskRow | null>(null)

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query) params.append('q', query)
      if (dateStart && dateEnd) {
        params.append('from', dateStart.toISOString().slice(0,10))
        params.append('to', dateEnd.toISOString().slice(0,10))
      }
      const data = await authenticatedFetch(getApiUrl(`tasks?${params.toString()}`))
      if (data?.success) setRows(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTasks() }, [])
  useEffect(() => { fetchTasks() }, [query, dateStart?.toISOString(), dateEnd?.toISOString()])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Search tasks" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateStart && dateEnd ? `${format(dateStart, 'MMM dd')} - ${format(dateEnd, 'MMM dd')}` : 'Due date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 border-b">
              <div className="text-sm font-medium">Start</div>
              <Calendar mode="single" selected={dateStart} onSelect={(d) => d && setDateStart(d)} />
            </div>
            <div className="p-3">
              <div className="text-sm font-medium">End</div>
              <Calendar mode="single" selected={dateEnd} onSelect={(d) => d && setDateEnd(d)} />
            </div>
          </PopoverContent>
        </Popover>
        {(dateStart || dateEnd) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateStart(undefined); setDateEnd(undefined) }}>Clear</Button>
        )}
        <Button className="ml-auto" onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> New task
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Task</TableHead>
                <TableHead className="w-1/6">Due date</TableHead>
                <TableHead className="w-1/6">Assigned to</TableHead>
                <TableHead className="w-1/6">Record</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-gray-500">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-gray-500">No tasks</TableCell></TableRow>
              ) : (
                rows.map(r => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => { setEditing(r); setModalOpen(true) }}>
                    <TableCell className="py-3">{r.title}</TableCell>
                    <TableCell className="py-3">{r.due_date ? format(new Date(r.due_date), 'MMM dd, yyyy') : '-'}</TableCell>
                    <TableCell className="py-3">{r.assignees?.map(a => a.name).join(', ') || '-'}</TableCell>
                    <TableCell className="py-3">{r.contacts?.map(c => c.name).join(', ') || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TaskModal 
        open={modalOpen}
        onOpenChange={(o) => setModalOpen(o)}
        task={editing}
        onSaved={() => fetchTasks()}
      />
    </div>
  )
}


