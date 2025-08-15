'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { getApiUrl } from '@/config/features'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, endOfWeek, isToday, differenceInMinutes, differenceInHours, differenceInDays, startOfDay, endOfDay } from 'date-fns'
import { Plus, Filter, Calendar as CalendarIcon, User, Link2 } from 'lucide-react'
import Link from 'next/link'
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

  const parseDueDate = (s?: string | null) => {
    if (!s) return null
    // If ISO with time, trust Date
    if (s.includes('T')) return new Date(s)
    // Parse as local date to avoid timezone shifting
    const [y, m, d] = s.split('-').map(Number)
    if (!y || !m || !d) return new Date(s)
    return new Date(y, m - 1, d)
  }

  const { todayRows, weekRows, upcomingRows } = useMemo(() => {
    const now = new Date()
    const sod = startOfDay(now)
    const eod = endOfDay(now)
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const group = { todayRows: [] as TaskRow[], weekRows: [] as TaskRow[], upcomingRows: [] as TaskRow[] }
    ;(rows || []).forEach(r => {
      const d = parseDueDate(r.due_date)
      if (!d) { group.upcomingRows.push(r); return }
      if (d >= sod && d <= eod) { group.todayRows.push(r); return }
      if (d > eod && d <= weekEnd) { group.weekRows.push(r); return }
      group.upcomingRows.push(r)
    })
    return group
  }, [rows])

  const renderDue = (row: TaskRow, section: 'today' | 'week' | 'upcoming') => {
    const now = new Date()
    const d = parseDueDate(row.due_date)
    if (!d) return '-'
    if (section === 'today') {
      const remainingMin = Math.max(0, differenceInMinutes(d, now))
      if (remainingMin < 60) return `${remainingMin} min left`
      const remainingH = Math.ceil(differenceInHours(d, now))
      return `${remainingH} h left`
    }
    if (section === 'week') {
      const days = Math.max(0, differenceInDays(startOfDay(d), startOfDay(now)))
      return days === 1 ? 'in 1 day' : `in ${days} days`
    }
    return format(d, 'MMM dd, yyyy')
  }

  const renderSection = (title: string, items: TaskRow[], section: 'today' | 'week' | 'upcoming') => (
    <>
      <TableRow>
        <TableCell colSpan={4} className="py-2 text-xs text-gray-600 bg-white">{title} {items.length > 0 && <span className="ml-1">{items.length}</span>}</TableCell>
      </TableRow>
      {items.map(r => (
        <TableRow key={r.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setEditing(r); setModalOpen(true) }}>
          <TableCell className="py-3">{r.title}</TableCell>
          <TableCell className={`py-3 ${section === 'upcoming' ? 'text-gray-800' : 'text-orange-600 font-medium'}`}>{renderDue(r, section)}</TableCell>
          <TableCell className="py-3">{r.assignees?.map(a => a.name).join(', ') || '-'}</TableCell>
          <TableCell className="py-3">
            {r.contacts?.map((c, index) => (
              <React.Fragment key={c.id}>
                {index > 0 && ', '}
                <Link 
                  href={`/contacts/${c.id}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {c.name}
                </Link>
              </React.Fragment>
            )) || '-'}
          </TableCell>
        </TableRow>
      ))}
    </>
  )

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

      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <Table className="hidden sm:table">
            <TableHeader>
              <TableRow className="border-b border-gray-200">
                <TableHead className="text-left font-semibold text-gray-900 w-1/2">Task</TableHead>
                <TableHead className="text-left font-semibold text-gray-900 w-1/6">
                  <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Due date</div>
                </TableHead>
                <TableHead className="text-left font-semibold text-gray-900 w-1/6">
                  <div className="flex items-center gap-2"><User className="h-4 w-4" /> Assigned to</div>
                </TableHead>
                <TableHead className="text-left font-semibold text-gray-900 w-1/6">
                  <div className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Contact</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-gray-500">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-gray-500">No tasks</TableCell></TableRow>
              ) : (
                <>
                  {renderSection('Today', todayRows, 'today')}
                  {renderSection('This week', weekRows, 'week')}
                  {renderSection('Upcoming', upcomingRows, 'upcoming')}
                </>
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


