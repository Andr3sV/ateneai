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
import { Badge } from '@/components/ui/badge'
import { Phone, User, Calendar as CalendarIcon, Tag as TagIcon } from 'lucide-react'
import { CallModal } from '@/components/call-modal'
import { Switch } from '@/components/ui/switch'
import supabase from '@/lib/supabase'

// Skeleton Components for loading states
const TableRowSkeleton = () => (
  <TableRow className="animate-pulse">
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-6 bg-gray-200 rounded w-12"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </TableCell>
  </TableRow>
)

const MobileCardSkeleton = () => (
  <div className="border rounded-lg p-4 mb-3 animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="h-5 bg-gray-200 rounded w-32"></div>
      <div className="h-5 bg-gray-200 rounded w-16"></div>
    </div>
    <div className="space-y-2 mb-3">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
      <div className="h-4 bg-gray-200 rounded w-20"></div>
      <div className="h-4 bg-gray-200 rounded w-28"></div>
    </div>
    <div className="flex gap-2">
      <div className="h-6 bg-gray-200 rounded w-16"></div>
      <div className="h-6 bg-gray-200 rounded w-16"></div>
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </div>
  </div>
)

const FiltersSkeleton = () => (
  <div className="flex flex-wrap gap-3 mb-6 animate-pulse">
    <div className="h-10 bg-gray-200 rounded w-32"></div>
    <div className="h-10 bg-gray-200 rounded w-32"></div>
    <div className="h-10 bg-gray-200 rounded w-32"></div>
    <div className="h-10 bg-gray-200 rounded w-32"></div>
    <div className="h-10 bg-gray-200 rounded w-32"></div>
  </div>
)

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
  status: 'lead' | 'mql' | 'client' | 'agendado' | null
  interest: 'energy' | 'alarm' | 'telco' | null
  type: 'outbound' | 'inbound' | null
  call_type?: 'transfer' | 'call_later' | null
  created_at: string
  duration?: number | null
  assigned_user_id?: number | null
  scheduled_at?: string | null
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
  const [scheduledByCall, setScheduledByCall] = useState<Record<number, string | null>>({})
  const [scheduledLoadedSignature, setScheduledLoadedSignature] = useState<string>("")

  // Detect desktop to avoid double render issues with CSS-only breakpoints
  const [isDesktop, setIsDesktop] = useState<boolean>(false)
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)') : null
    const handler = () => setIsDesktop(!!mq?.matches)
    handler()
    mq?.addEventListener('change', handler)
    return () => { mq?.removeEventListener('change', handler) }
  }, [])

  // Show loading state until we have actual data
  const showSkeletons = loading || calls.length === 0

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

  const fetchCalls = async (pageNum = 1, silent = false, signal?: AbortSignal) => {
    let ctrl: AbortController | null = null;
    
    try {
      if (!silent) setLoading(true)
      
      // If there's already a request in flight, abort it
      if (inflightRefCalls.current) {
        inflightRefCalls.current.abort()
        inflightRefCalls.current = null
      }
      
      // Create new controller for this request
      ctrl = new AbortController()
      inflightRefCalls.current = ctrl
      
      // If external signal is provided, listen to it
      if (signal) {
        try {
          signal.addEventListener('abort', () => {
            if (ctrl && !ctrl.signal.aborted) {
              ctrl.abort();
            }
          });
        } catch (error) {
          // Ignore errors from signal handling
          console.log('🔄 Signal handling error, continuing without external abort');
        }
      }
      
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
      console.log('🔍 Calls API URL:', apiUrl) // Always log the URL for debugging
      
      if (!silent) logMigrationEvent('Calls fetch', { page: pageNum })
      
      // Check if request was aborted before making the call
      if (ctrl.signal.aborted) {
        return
      }
      
      const data = await authenticatedFetch(apiUrl, { signal: ctrl.signal, retries: 3 } as any)
      
      // Check if request was aborted after the call
      if (ctrl.signal.aborted) {
        return
      }
      
      if (!silent) console.log('📞 Calls API response:', data)
      
      if (data.success) {
        const next = (data.data || []) as CallItem[]
        if (silent) {
          // Detect newly arrived qualified rows only once per ID
          const qualifiedNow = next
            .filter(r => {
              const s = (r.status || '').toLowerCase()
              return s === 'mql' || s === 'client' || s === 'agendado'
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
      // Only log errors that aren't from aborting
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error('❌ Error fetching calls:', e)
        if (!silent) setCalls([])
      }
    } finally {
      // Always clear the ref when done
      if (inflightRefCalls.current === ctrl) {
        inflightRefCalls.current = null
      }
      if (!silent) setLoading(false)
    }
  }

  // Initial load effect - runs only once
  useEffect(() => {
    console.log('🚀 Initial load effect triggered');
    fetchCalls(1, false);
  }, []); // Empty dependency array - runs only once

  // Consolidated useEffect for initial load and filter changes
  useEffect(() => {
    console.log('🔍 useEffect triggered with filters:', { fromFilter, toFilter, statusFilter, interestFilter, assigneeFilter, dateStart, dateEnd });
    
    // Use a ref to prevent duplicate calls
    const controller = new AbortController();
    
    // Force clear any existing request to ensure fresh start
    if (inflightRefCalls.current) {
      try {
        inflightRefCalls.current.abort();
      } catch (error) {
        // Ignore abort errors
        console.log('🔄 Aborting previous request');
      }
      inflightRefCalls.current = null;
    }
    
    // Reset loading state to ensure we can make new requests
    setLoading(false);
    
    // Always fetch on filter changes
    console.log('🚀 Starting fetchCalls...');
    fetchCalls(1, true, controller.signal);
    
    return () => {
      try {
        controller.abort();
      } catch (error) {
        // Ignore abort errors
        console.log('🔄 Cleanup: Aborting controller');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromFilter, toFilter, statusFilter, interestFilter, assigneeFilter, dateStart, dateEnd])

  // After calls load or page changes, fetch scheduled dates for visible calls
  useEffect(() => {
    let cancelled = false
    async function loadScheduled() {
      const visible = (calls || [])
      if (visible.length === 0) return
      
      // Build a stable signature to avoid redundant work
      const sig = visible.map(c => `${c.id}:${c.contact?.id ?? 'x'}`).join(',')
      if (sig === scheduledLoadedSignature) return

      console.log('📅 Loading scheduled dates for', visible.length, 'calls');

      // Prepare set of contactIds to resolve
      const contactIds = Array.from(new Set(visible.map(c => c.contact?.id).filter(Boolean))) as number[]
      const current: Record<number, string | null> = { ...scheduledByCall }

      // Try to use the minimap endpoint first for better performance
      if (contactIds.length > 0) {
        try {
          const params = new URLSearchParams();
          contactIds.forEach(id => params.append('contactIds[]', id.toString()));
          const response = await authenticatedFetch(`/api/v2/tasks/minimap?${params.toString()}`);
          
          if (response?.success && response.data) {
            console.log('✅ Minimap endpoint success:', Object.keys(response.data).length, 'scheduled dates found');
            
            // Map the response to our format
            for (const call of visible) {
              if (call.contact?.id && response.data[call.contact.id]) {
                current[call.id] = response.data[call.contact.id];
              }
            }
            
            // If we got all the data we need, return early
            const hasAllData = visible.every(call => 
              !call.contact?.id || current[call.id] !== undefined
            );
            if (hasAllData && !cancelled) {
              setScheduledByCall(current);
              setScheduledLoadedSignature(sig);
              console.log('✅ All scheduled dates loaded via minimap');
              return;
            }
          }
        } catch (error) {
          console.warn('⚠️ Minimap endpoint failed, falling back to individual requests:', error);
        }
      }

      // Fallback: Try a single show_all tasks fetch to map all in one request
      let mappedAny = false
      try {
        const params = new URLSearchParams({ page: '1', limit: '1000', show_all: 'true' })
        const all = await authenticatedFetch(getApiUrl(`tasks?${params.toString()}`), { muteErrors: true } as any)
        const list: any[] = Array.isArray(all?.data) ? all.data : []
        if (list.length > 0) {
          console.log('🔄 Fallback: Processing', list.length, 'tasks for scheduled dates');
          
          // Map earliest due_date per contact id
          const bestByContact = new Map<string, string>()
          for (const t of list) {
            const due = t?.due_date || null
            const arr = Array.isArray(t?.contacts) ? t.contacts : []
            for (const ct of arr) {
              const key = String(ct?.id)
              if (!due) continue
              const prev = bestByContact.get(key)
              if (!prev || new Date(due) < new Date(prev)) {
                bestByContact.set(key, due)
              }
            }
          }
          for (const c of visible) {
            const key = c.contact?.id != null ? String(c.contact.id) : ''
            if (!key) continue
            if (bestByContact.has(key)) {
              current[c.id] = bestByContact.get(key) || null
              mappedAny = true
            }
          }
        }
      } catch (error) { 
        console.warn('⚠️ Fallback tasks fetch failed:', error);
      }

      // For any missing, try lightweight by-contact but capped to avoid bursts (max 3 instead of 5)
      const missing = visible.filter(c => current[c.id] === undefined || current[c.id] === null).slice(0, 3)
      if (missing.length > 0) {
        console.log('🔄 Individual fallback: Fetching scheduled dates for', missing.length, 'missing calls');
        
        const results = await Promise.all(missing.map(async (c) => {
          if (!c.contact?.id) return [c.id, null] as const
          try {
            const t = await authenticatedFetch(getApiUrl(`tasks/by-contact/${c.contact.id}`), { muteErrors: true } as any)
            if (t?.success && Array.isArray(t.data) && t.data.length > 0) {
              return [c.id, t.data[0]?.due_date || null] as const
            }
            return [c.id, null] as const
          } catch (error) { 
            console.warn('⚠️ Individual contact fetch failed for contact', c.contact.id, ':', error);
            return [c.id, null] as const 
          }
        }))
        for (const [id, due] of results) current[id] = due
      }

      if (!cancelled) {
        setScheduledByCall(current)
        setScheduledLoadedSignature(sig)
        console.log('✅ Scheduled dates loaded:', Object.keys(current).filter(k => current[parseInt(k)] !== null).length, 'calls have scheduled dates');
      }
    }
    loadScheduled()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calls, pagination.page])

  // Realtime subscription to calls (workspace-scoped)
  useEffect(() => {
    // Only subscribe if we have calls loaded
    if (!supabase || calls.length === 0) return

    console.log('🔌 Setting up realtime subscription for calls');
    
    const channel = supabase
      .channel('realtime:calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, (payload: any) => {
        const row = payload.new || payload.old
        if (!row) return
        
        console.log('📡 Realtime update received:', payload.event, row.id);
        
        setCalls(prev => {
          // If the row is visible, update fields; if new and matches current filters, we could prepend (omitted for simplicity)
          const idx = prev.findIndex(r => r.id === row.id)
          if (idx === -1) return prev
          const next = [...prev]
          next[idx] = {
            ...next[idx],
            status: row.status ?? next[idx].status,
            assigned_user_id: row.assigned_user_id ?? next[idx].assigned_user_id,
            duration: typeof row.duration === 'number' ? row.duration : next[idx].duration,
            // reflect scheduled_at if present; frontend reads it via scheduledByCall mapping for now
          } as any
          return next
        })
        // Also update scheduled map if scheduled_at arrived
        if (row.scheduled_at) {
          setScheduledByCall(prev => ({ ...prev, [row.id]: row.scheduled_at }))
        }
      })
      .subscribe()

    return () => { 
      console.log('🔌 Cleaning up realtime subscription');
      try { 
        supabase?.removeChannel(channel) 
      } catch (e) {
        console.warn('⚠️ Error cleaning up realtime:', e);
      }
    }
  }, [supabase, calls.length]) // Only re-subscribe when calls array length changes

  const formatDueDate = (s?: string | null) => {
    if (!s) return '-'
    const str = String(s)
    try {
      const d = str.includes('T') ? new Date(str) : new Date(`${str}T00:00:00`)
      if (Number.isNaN(d.getTime())) return str
      return formatDate(new Date(d), 'yyyy-MM-dd HH:mm')
    } catch {
      return str
    }
  }

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

  // Polling for calls - reduced frequency and visibility-aware
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    const pollInterval = 60000; // Poll every 60 seconds instead of 20
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollTimerRef.current = setInterval(() => {
          fetchCalls(pagination.page, true);
        }, pollInterval);
      } else {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      }
    };

    handleVisibilityChange(); // Initial check
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pagination.page]); // Only depend on page changes, not filters

  const applyQuickDateRange = (days: number) => {
    setDateStart(subDays(new Date(), days))
    setDateEnd(new Date())
  }

  const canPrev = pagination.page > 1
  const canNext = pagination.page < pagination.totalPages

  const StatusDropdown = ({ value, onChange }: { value: CallItem['status']; onChange: (v: CallItem['status']) => void }) => {
    const s = (value || '').toString().toLowerCase()
    const badgeColor = s === 'client' ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                      : s === 'mql' ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                      : s === 'agendado' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <DropdownMenuItem onClick={() => onChange('agendado')}>
            <span className="text-blue-600">●</span>
            <span className="ml-2 text-blue-700 font-medium">Agendado</span>
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

  const ServicesDropdown = ({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) => {
    const label = String(typeof value === 'number' && value >= 0 ? value : 0)
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Badge className={`bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer`}>{label}</Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          {[...Array.from({ length: 21 }, (_, i) => i)].map((n) => (
            <DropdownMenuItem key={n} onClick={() => onChange(n)}>
              <span className="text-gray-700">{n}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const InterestDropdown = ({ value, onChange }: { value: CallItem['interest']; onChange: (v: CallItem['interest']) => void }) => {
    const i = (value || '').toString().toLowerCase()
    const badgeColor = 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    const label = i ? (i.charAt(0).toUpperCase() + i.slice(1)) : '-'

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Badge className={`${badgeColor} cursor-pointer`}>{label}</Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => onChange('energy')}> 
            <span className="text-yellow-600">●</span>
            <span className="ml-2 text-yellow-700 font-medium">Energy</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange('alarm')}>
            <span className="text-red-600">●</span>
            <span className="ml-2 text-red-700 font-medium">Alarm</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange('telco')}>
            <span className="text-blue-600">●</span>
            <span className="ml-2 text-blue-700 font-medium">Telco</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange(null)}>
            <span className="text-gray-500">●</span>
            <span className="ml-2 text-gray-700 font-medium">None</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
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
          {/* Show skeleton filters when loading and no members loaded yet */}
          {showSkeletons && members.length === 0 ? (
            <FiltersSkeleton />
          ) : (
            <>
              {/* Removed From filter per request */}
              {/* <Input placeholder="From" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} className="w-40" /> */}
              <Input placeholder="To" value={toFilter} onChange={(e) => setToFilter(e.target.value)} className="w-40" />

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="mql">MQL</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
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
            </>
          )}
        </div>
      </div>

      {/* Mobile cards list (Attio-inspired) */}
      <Card className="block md:hidden" hidden={isDesktop}>
        <CardContent className="p-4">
          {showSkeletons ? (
            <>
              <MobileCardSkeleton />
              <MobileCardSkeleton />
              <MobileCardSkeleton />
              <MobileCardSkeleton />
              <MobileCardSkeleton />
            </>
          ) : calls.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No results</div>
          ) : (
            <div className="grid gap-3">
              {calls.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border p-3 shadow-xs active:bg-accent/30 transition-colors"
                  onClick={() => { setSelectedCallId(c.id); setModalOpen(true) }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[15px] font-semibold text-gray-900" title={c.contact?.name || 'Sin nombre'}>
                        {shortName(c.contact?.name)}
                      </div>
                      <div className="mt-1 text-xs text-gray-600 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span className="truncate">{c.phone_to || c.phone_from || '-'}</span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {`Scheduled: ${formatDueDate(scheduledByCall[c.id] as string | null)}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">{formatDate(new Date(c.created_at), 'yyyy-MM-dd HH:mm')}</div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div onClick={(e) => e.stopPropagation()}>
                        <InterestDropdown
                          value={c.interest}
                          onChange={async (next) => {
                            try {
                              await authenticatedFetch(getApiUrl(`calls/${c.id}/interest`), {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ interest: next }),
                              })
                              setCalls((prev) => prev.map((row) => row.id === c.id ? { ...row, interest: next } : row))
                            } catch (e) {
                              console.error('Failed updating call interest', e)
                            }
                          }}
                        />
                      </div>
                      {getCallTypeBadge(c.call_type || null)}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <StatusDropdown
                        value={c.status}
                        onChange={async (next) => {
                          try {
                            await authenticatedFetch(getApiUrl(`calls/${c.id}/status`), {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: next }),
                            })
                            setCalls((prev) => prev.map((row) => row.id === c.id ? { ...row, status: next } : row))
                          } catch (e) {
                            console.error('Failed updating call status', e)
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table inside Card with pagination footer — desktop only */}
      <Card hidden={!isDesktop}>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
          <Table className="min-w-[900px] table">
          <TableHeader>
              <TableRow className="border-b border-gray-200">
                <TableHead className="text-left font-semibold text-gray-900">Name</TableHead>
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
                <TableHead className="text-left font-semibold text-gray-900">Servicios</TableHead>
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
                <TableHead className="text-left font-semibold text-gray-900">Scheduled</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {showSkeletons ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : calls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No results</TableCell>
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
                    <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                      <ServicesDropdown
                        value={(c as any).services_count as number | undefined}
                        onChange={async (n: number) => {
                          try {
                            await authenticatedFetch(getApiUrl(`calls/${c.id}/services-count`), {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ services_count: n })
                            })
                            setCalls(prev => prev.map(row => row.id === c.id ? ({ ...row, services_count: n } as any) : row))
                          } catch (err) {
                            console.error('Failed updating services_count', err)
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                      <InterestDropdown
                        value={c.interest}
                        onChange={async (next) => {
                          try {
                            await authenticatedFetch(getApiUrl(`calls/${c.id}/interest`), {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ interest: next }),
                            })
                            // Update locally without refetch to keep UI snappy
                            setCalls((prev) => prev.map((row) => row.id === c.id ? { ...row, interest: next } : row))
                          } catch (e) {
                            console.error('Failed updating call interest', e)
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      {getCallTypeBadge(c.call_type || null)}
                    </TableCell>
                    <TableCell className="py-4">
                      {formatDate(new Date(c.created_at), 'yyyy-MM-dd HH:mm')}
                    </TableCell>
                    <TableCell className="py-4">
                      {typeof c.duration === 'number' ? `${Math.floor((c.duration || 0)/60)}m ${Math.floor((c.duration || 0)%60)}s` : '-'}
                    </TableCell>
                    <TableCell className="py-4">
                      {formatDueDate((c as any).scheduled_at || (scheduledByCall[c.id] as string | null))}
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
          </Table>
          </div>
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


