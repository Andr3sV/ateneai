'use client'

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { getApiUrl } from '@/config/features'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format, endOfWeek, isToday, differenceInMinutes, differenceInHours, differenceInDays, startOfDay, endOfDay } from 'date-fns'
import { Plus, Filter, Calendar as CalendarIcon, User, Link2, Loader2 } from 'lucide-react'
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
  const { role, userId } = useWorkspaceContext()

  const [rows, setRows] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [query, setQuery] = useState('')
  const [dateStart, setDateStart] = useState<Date | undefined>()
  const [dateEnd, setDateEnd] = useState<Date | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TaskRow | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [members, setMembers] = useState<{ id: number; name: string }[]>([])
  const limit = 30 // Fixed limit for infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const inflightRef = useRef<AbortController | null>(null)

  const fetchTasks = useCallback(async (pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    
    try {
      // Cancel any in-flight request to avoid bursts and 429
      if (inflightRef.current) {
        inflightRef.current.abort()
      }
      const ctrl = new AbortController()
      inflightRef.current = ctrl

      const params = new URLSearchParams()
      params.append('page', String(pageNum))
      params.append('limit', String(limit))
      if (query) params.append('q', query)
      if (dateStart && dateEnd) {
        params.append('from', dateStart.toISOString().slice(0,10))
        params.append('to', dateEnd.toISOString().slice(0,10))
      }
      // Assignee filter
      if (assigneeFilter === 'all') {
        // nothing
      } else if (assigneeFilter === 'unassigned') {
        params.append('unassigned', 'true')
      } else {
        params.append('assignee_id', assigneeFilter)
      }
      
      const url = getApiUrl(`tasks?${params.toString()}`)
      console.log('🔍 Frontend fetching tasks from:', url)
      const data = await authenticatedFetch(url, { signal: ctrl.signal, retries: 3 } as any)
      console.log('📋 Frontend tasks response:', data)
      
      if (data?.success) {
        const newTasks = data.data || []
        console.log('📋 Frontend new tasks:', newTasks.length)
        
        if (append) {
          setRows(prev => [...prev, ...newTasks])
        } else {
          setRows(newTasks)
        }
        
        // Check if there are more items to load
        const p = data.pagination || {}
        const totalPages = Number(p.totalPages) || 0
        setHasMore(pageNum < totalPages)
        setCurrentPage(pageNum)
      }
    } finally {
      inflightRef.current = null
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }, [authenticatedFetch, query, dateStart, dateEnd, limit, assigneeFilter])

  // Load more data when reaching the bottom
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchTasks(currentPage + 1, true)
    }
  }, [loadingMore, hasMore, currentPage, fetchTasks])

  // Scroll event handler for infinite scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const threshold = 100 // Load more when 100px from bottom
    
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadMore()
    }
  }, [loadMore])

  // Initial load and search changes
  useEffect(() => { 
    setCurrentPage(1)
    setHasMore(true)
    fetchTasks(1, false) 
  }, [query, dateStart?.toISOString(), dateEnd?.toISOString(), assigneeFilter])

  // Load workspace members
  useEffect(() => {
    let cancelled = false
    async function loadMembers() {
      try {
        const res = await authenticatedFetch(getApiUrl('tasks/helpers/members'), { muteErrors: true } as any)
        if (!cancelled && res?.success && Array.isArray(res.data)) {
          setMembers(res.data)
        }
      } catch { /* ignore */ }
    }
    loadMembers()
    return () => { cancelled = true }
  }, [authenticatedFetch])

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
        {/* Assignee filter */}
        {(role !== 'member' && role !== 'viewer') && (
          <div className="flex items-center">
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <Button className="ml-auto" onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> New task
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="max-h-[800px] overflow-y-auto"
          >
            <Table className="hidden sm:table">
              <TableHeader className="sticky top-0 bg-white z-10">
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
                {loadingMore && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading more tasks...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!hasMore && rows.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center">
                      <span className="text-sm text-muted-foreground">All tasks loaded</span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Summary info */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              {rows.length} tasks loaded {assigneeFilter === 'all' ? '(all assigned)' : assigneeFilter === 'unassigned' ? '(unassigned)' : '(filtered)'} {hasMore && '• Scroll down for more'}
            </div>
            {hasMore && !loadingMore && (
              <Button variant="outline" size="sm" onClick={loadMore}>
                Load more
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <TaskModal 
        open={modalOpen}
        onOpenChange={(o) => setModalOpen(o)}
        task={editing}
        onSaved={() => {
          setCurrentPage(1)
          setHasMore(true)
          fetchTasks(1, false)
        }}
      />
    </div>
  )
}


