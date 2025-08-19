'use client'

import { useEffect, useRef, useState } from 'react'
import { subDays, format as formatDate } from 'date-fns'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getApiUrl, logMigrationEvent } from '@/config/features'
import { Input } from '@/components/ui/input'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Phone, User, Calendar as CalendarIcon, Tag as TagIcon } from 'lucide-react'
import { CallModal } from '@/components/call-modal'
import { Switch } from '@/components/ui/switch'

// light-weight confetti (dynamic import to avoid SSR issues)
let confettiFn: ((opts?: any) => void) | null = null
async function fireConfetti() {
  try {
    if (!confettiFn) {
      const mod = await import('canvas-confetti')
      confettiFn = mod.default as any
    }
    confettiFn && confettiFn({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    })
  } catch {}
}

async function playCelebrationSound(enabled: boolean) {
  if (!enabled) return
  try {
    // Prefer a stronger applause sound if available
    const applause = new Audio('/sounds/applause.mp3')
    applause.volume = 0.9
    await applause.play()
    return
  } catch {}
  try {
    const goal = new Audio('/sounds/goal.mp3')
    goal.volume = 0.9
    await goal.play()
    return
  } catch {}
  try {
    // Fallback: louder WebAudio synth if files are not available
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.value = 660
    g.gain.value = 0.001
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    o.stop(ctx.currentTime + 0.65)
    o.onended = () => ctx.close()
  } catch {}
}

interface CallItem {
  id: number
  contact: { id: number; name: string; phone: string } | null
  phone_from: string | null
  phone_to: string | null
  agent: { id: number; name: string } | null
  city: string | null
  status: 'lead' | 'mql' | 'client' | null
  interest: 'energy' | 'alarm' | 'telco' | null
  type: 'outbound' | 'inbound' | null
  call_type?: 'transfer' | 'call_later' | null
  created_at: string
  duration?: number | null
}

export default function CallsPage() {
  // Header title in layout
  usePageTitle('Conversations')
  const authenticatedFetch = useAuthenticatedFetch()
  const { role } = useWorkspaceContext()

  const [calls, setCalls] = useState<CallItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const celebratedIdsRef = useRef<Set<number>>(new Set())
  const initialSilentPollDoneRef = useRef<boolean>(false)

  // Filters
  const [fromFilter, setFromFilter] = useState<string>('')
  const [toFilter, setToFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [interestFilter, setInterestFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [members, setMembers] = useState<{ id: number; name: string }[]>([])
  const [dateStart, setDateStart] = useState<Date | undefined>()
  const [dateEnd, setDateEnd] = useState<Date | undefined>()

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [celebrateEnabled, setCelebrateEnabled] = useState<boolean>(true)

  const callsSignature = (list: CallItem[]) =>
    list
      .map(c => [
        c.id,
        c.created_at,
        c.status || '',
        c.duration ?? '',
        c.contact?.name || '',
        c.phone_from || '',
        c.phone_to || '',
        c.agent?.name || '',
        c.interest || '',
        c.type || ''
      ].join('|'))
      .join('~')

  const setCallsIfChanged = (next: CallItem[]) => {
    if (callsSignature(calls) !== callsSignature(next)) {
      setCalls(next)
    }
  }

  const shortName = (name?: string | null) => {
    const n = (name || '').trim()
    if (!n) return 'Sin nombre'
    return n.length > 14 ? `${n.slice(0, 14)}...` : n
  }

  const inflightRefCalls = useRef<AbortController | null>(null)

  const fetchCalls = async (pageNum = 1, silent = false) => {
    try {
      if (!silent) setLoading(true)
      if (inflightRefCalls.current) {
        inflightRefCalls.current.abort()
      }
      const ctrl = new AbortController()
      inflightRefCalls.current = ctrl
      const params = new URLSearchParams({ page: String(pageNum), limit: String(pagination.limit) })
      if (fromFilter) params.append('from', fromFilter)
      if (toFilter) params.append('to', toFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (interestFilter !== 'all') params.append('interest', interestFilter)
      if (assigneeFilter === 'unassigned') params.append('unassigned', 'true')
      else if (assigneeFilter !== 'all') params.append('assigned_user_id', assigneeFilter)
      if (dateStart && dateEnd) {
        params.append('start_date', dateStart.toISOString())
        params.append('end_date', dateEnd.toISOString())
      }

      const apiUrl = getApiUrl(`calls?${params.toString()}`)
      if (!silent) console.log('🔍 Calls API URL:', apiUrl)
      
      if (!silent) logMigrationEvent('Calls fetch', { page: pageNum })
      const data = await authenticatedFetch(apiUrl, { signal: ctrl.signal, retries: 3 } as any)
      if (!silent) console.log('📞 Calls API response:', data)
      
      if (data.success) {
        const next = (data.data || []) as CallItem[]
        if (silent) {
          // Detect newly arrived qualified rows only once per ID
          const qualifiedNow = next
            .filter(r => {
              const s = (r.status || '').toLowerCase()
              return s === 'mql' || s === 'client'
            })
            .map(r => r.id)

          // On first silent tick, just prime the set (no celebration)
          if (!initialSilentPollDoneRef.current) {
            qualifiedNow.forEach(id => celebratedIdsRef.current.add(id))
            initialSilentPollDoneRef.current = true
          } else {
            const newOnes = qualifiedNow.filter(id => !celebratedIdsRef.current.has(id))
            if (newOnes.length > 0 && celebrateEnabled) {
              fireConfetti()
              playCelebrationSound(true)
              newOnes.forEach(id => celebratedIdsRef.current.add(id))
            }
          }
        }
        setCallsIfChanged(next)
        setPagination({
          page: pageNum,
          limit: pagination.limit,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0,
        })
      }
    } catch (e) {
      console.error('❌ Error fetching calls:', e)
      if (!silent) setCalls([])
    } finally {
      inflightRefCalls.current = null
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalls(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load members for assignee filter
  useEffect(() => {
    let cancelled = false
    async function loadMembers() {
      try {
        const res = await authenticatedFetch(getApiUrl('tasks/helpers/members'), { muteErrors: true } as any)
        if (!cancelled && res?.success && Array.isArray(res.data)) {
          setMembers(res.data)
        }
      } catch {}
    }
    loadMembers()
    return () => { cancelled = true }
  }, [authenticatedFetch])

  // Auto-open CallModal when URL has ?open=<id>
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const openParam = params.get('open')
    if (!openParam) return
    const id = parseInt(openParam)
    if (Number.isNaN(id)) return
    setSelectedCallId(id)
    setModalOpen(true)
  }, [])

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchCalls(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromFilter, toFilter, statusFilter, interestFilter, assigneeFilter, dateStart, dateEnd])

  // Silent background polling to auto-refresh without flicker
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    pollTimerRef.current = setInterval(() => {
      fetchCalls(pagination.page, true)
    }, 10000)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
    // Include relevant dependencies so polling respects current page/filters
  }, [pagination.page, fromFilter, toFilter, statusFilter, interestFilter, assigneeFilter, dateStart, dateEnd])

  const applyQuickDateRange = (days: number) => {
    setDateStart(subDays(new Date(), days))
    setDateEnd(new Date())
  }

  const canPrev = pagination.page > 1
  const canNext = pagination.page < pagination.totalPages

  const StatusDropdown = ({ value, onChange }: { value: CallItem['status']; onChange: (v: CallItem['status']) => void }) => {
    const s = (value || '').toString().toLowerCase()
    const badgeColor = s === 'client' ? 'bg-green-100 text-green-800 hover:bg-green-200' : s === 'mql' ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    const label = s ? (s === 'lead' ? 'No interesado' : s.charAt(0).toUpperCase() + s.slice(1)) : '-'
    const isMemberOrViewer = role === 'member' || role === 'viewer'

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Badge className={`${badgeColor} cursor-pointer`}>{label}</Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => onChange('mql')}> 
            <span className="text-red-600">●</span>
            <span className="ml-2 text-red-600 font-medium">Mql</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange('client')}>
            <span className="text-green-600">●</span>
            <span className="ml-2 text-green-700 font-medium">Client</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange('lead')}>
            <span className="text-gray-500">●</span>
            <span className="ml-2 text-gray-700 font-medium">No interesado</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const getInterestBadge = (interest: CallItem['interest']) => {
    if (!interest) return <span className="text-gray-400">-</span>
    const text = interest.charAt(0).toUpperCase() + interest.slice(1)
    return <Badge className="bg-gray-100 text-gray-700">{text}</Badge>
  }

  const getCallTypeBadge = (callType: CallItem['call_type']) => {
    if (!callType) return <span className="text-gray-400">-</span>
    const t = callType.toLowerCase()
    if (t === 'transfer') return <Badge className="bg-green-100 text-green-800">Transfer</Badge>
    if (t === 'call_later') return <Badge className="bg-red-100 text-red-800">Call later</Badge>
    return <span className="text-gray-400">-</span>
  }

  return (
    <div className="p-6 space-y-4">
      {/* Filters header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="From" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} className="w-40" />
          <Input placeholder="To" value={toFilter} onChange={(e) => setToFilter(e.target.value)} className="w-40" />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="mql">MQL</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </Select>

          <Select value={interestFilter} onValueChange={setInterestFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Interest" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All interests</SelectItem>
              <SelectItem value="energy">Energy</SelectItem>
              <SelectItem value="alarm">Alarm</SelectItem>
              <SelectItem value="telco">Telco</SelectItem>
            </SelectContent>
          </Select>

          {/* Assignee filter only for admin/owner */}
          {(role !== 'member' && role !== 'viewer') && (
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-44 truncate"><SelectValue placeholder="All assigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Date range - use Contacts dashboard style: single button shows current range, popover with start/end calendars */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateStart && dateEnd ? `${formatDate(dateStart, 'MMM dd')} - ${formatDate(dateEnd, 'MMM dd')}` : 'Select range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b">
                  <div className="text-sm font-medium">Start Date</div>
                  <Calendar mode="single" selected={dateStart} onSelect={(d) => d && setDateStart(d)} required={false} />
                </div>
                <div className="p-3">
                  <div className="text-sm font-medium">End Date</div>
                  <Calendar mode="single" selected={dateEnd} onSelect={(d) => d && setDateEnd(d)} required={false} />
                </div>
              </PopoverContent>
            </Popover>
            {(dateStart || dateEnd) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateStart(undefined); setDateEnd(undefined) }}>Clear</Button>
            )}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎉</span>
              <Switch checked={celebrateEnabled} onCheckedChange={setCelebrateEnabled} />
            </div>
          </div>
        </div>
      </div>

      {/* Table inside Card with pagination footer — match Conversations table styling */}
      <Card>
        <CardContent className="p-4">
          <Table className="hidden sm:table">
          <TableHeader>
              <TableRow className="border-b border-gray-200">
                <TableHead className="text-left font-semibold text-gray-900">Name</TableHead>
                <TableHead className="text-left font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    From
                  </div>
                </TableHead>
                <TableHead className="text-left font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    To
                  </div>
                </TableHead>
                <TableHead className="text-left font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Agent
                  </div>
                </TableHead>
                <TableHead className="text-left font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-4 w-4" />
                    Status
                  </div>
                </TableHead>
                <TableHead className="text-left font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-4 w-4" />
                    Interest
                  </div>
                </TableHead>
                <TableHead className="text-left font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-4 w-4" />
                    Type
                  </div>
                </TableHead>
                <TableHead className="text-left font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Date
                  </div>
                </TableHead>
                <TableHead className="text-left font-semibold text-gray-900">Duration</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
            {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading...</TableCell>
              </TableRow>
            ) : calls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No results</TableCell>
              </TableRow>
            ) : (
                calls.map((c) => (
                  <TableRow key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelectedCallId(c.id); setModalOpen(true) }}>
                    <TableCell className="py-4">
                      <span className="font-medium text-gray-900" title={c.contact?.name || 'Sin nombre'}>
                        {shortName(c.contact?.name)}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{c.phone_from || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{c.phone_to || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-gray-700">{c.agent?.name || '-'}</span>
                    </TableCell>
                    <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                      <StatusDropdown
                        value={c.status}
                        onChange={async (next) => {
                          try {
                            await authenticatedFetch(getApiUrl(`calls/${c.id}/status`), {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: next }),
                            })
                            // Update locally without refetch to keep UI snappy
                            setCalls((prev) => prev.map((row) => row.id === c.id ? { ...row, status: next } : row))
                          } catch (e) {
                            console.error('Failed updating call status', e)
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      {getInterestBadge(c.interest)}
                    </TableCell>
                    <TableCell className="py-4">
                      {getCallTypeBadge(c.call_type || null)}
                    </TableCell>
                    <TableCell className="py-4">
                      {format(new Date(c.created_at), 'yyyy-MM-dd HH:mm')}
                    </TableCell>
                    <TableCell className="py-4">
                      {typeof c.duration === 'number' ? `${Math.floor((c.duration || 0)/60)}m ${Math.floor((c.duration || 0)%60)}s` : '-'}
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
          </Table>
          {/* Pagination inside the same card - inset like Messages */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)} • {pagination.total} results
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => fetchCalls(1)} disabled={!canPrev}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => fetchCalls(pagination.page - 1)} disabled={!canPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => fetchCalls(pagination.page + 1)} disabled={!canNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => fetchCalls(pagination.totalPages || 1)} disabled={!canNext}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call details modal */}
      <CallModal callId={selectedCallId} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}


