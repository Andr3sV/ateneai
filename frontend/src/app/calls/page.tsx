'use client'

import { useEffect, useState } from 'react'
import { subDays, format as formatDate } from 'date-fns'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getApiUrl, logMigrationEvent } from '@/config/features'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  created_at: string
  duration?: number | null
}

export default function CallsPage() {
  // Header title in layout
  usePageTitle('Conversations')
  const authenticatedFetch = useAuthenticatedFetch()

  const [calls, setCalls] = useState<CallItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Filters
  const [fromFilter, setFromFilter] = useState<string>('')
  const [toFilter, setToFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [interestFilter, setInterestFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateStart, setDateStart] = useState<Date | undefined>()
  const [dateEnd, setDateEnd] = useState<Date | undefined>()

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })

  const fetchCalls = async (pageNum = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(pageNum), limit: String(pagination.limit) })
      if (fromFilter) params.append('from', fromFilter)
      if (toFilter) params.append('to', toFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (interestFilter !== 'all') params.append('interest', interestFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (dateStart && dateEnd) {
        params.append('start_date', dateStart.toISOString())
        params.append('end_date', dateEnd.toISOString())
      }

      const apiUrl = getApiUrl(`calls?${params.toString()}`)
      console.log('🔍 Calls API URL:', apiUrl)
      
      logMigrationEvent('Calls fetch', { page: pageNum })
      const data = await authenticatedFetch(apiUrl)
      console.log('📞 Calls API response:', data)
      
      if (data.success) {
        setCalls(data.data || [])
        setPagination({
          page: pageNum,
          limit: pagination.limit,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0,
        })
      }
    } catch (e) {
      console.error('❌ Error fetching calls:', e)
      setCalls([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalls(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchCalls(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromFilter, toFilter, statusFilter, interestFilter, typeFilter, dateStart, dateEnd])

  const applyQuickDateRange = (days: number) => {
    setDateStart(subDays(new Date(), days))
    setDateEnd(new Date())
  }

  const canPrev = pagination.page > 1
  const canNext = pagination.page < pagination.totalPages

  const getStatusBadge = (status: CallItem['status']) => {
    if (!status) return <span className="text-gray-400">-</span>
    const s = status.toLowerCase()
    const styles = s === 'client'
      ? 'bg-green-100 text-green-800'
      : s === 'mql'
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800'
    const text = s.charAt(0).toUpperCase() + s.slice(1)
    return <Badge className={styles}>{text}</Badge>
  }

  const getInterestBadge = (interest: CallItem['interest']) => {
    if (!interest) return <span className="text-gray-400">-</span>
    const i = interest.toLowerCase()
    const styles = i === 'energy'
      ? 'bg-emerald-100 text-emerald-800'
      : i === 'alarm'
      ? 'bg-red-100 text-red-800'
      : 'bg-violet-100 text-violet-800'
    const text = i.charAt(0).toUpperCase() + i.slice(1)
    return <Badge className={styles}>{text}</Badge>
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

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
            </SelectContent>
          </Select>

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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell>
              </TableRow>
            ) : calls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No results</TableCell>
              </TableRow>
            ) : (
                calls.map((c) => (
                  <TableRow key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelectedCallId(c.id); setModalOpen(true) }}>
                    <TableCell className="py-4">
                      <span className="font-medium text-gray-900">{c.contact?.name || 'Sin nombre'}</span>
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
                    <TableCell className="py-4">
                      {getStatusBadge(c.status)}
                    </TableCell>
                    <TableCell className="py-4">
                      {getInterestBadge(c.interest)}
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


