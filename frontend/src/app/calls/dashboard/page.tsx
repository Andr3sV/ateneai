'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getApiUrl } from '@/config/features'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon, TrendingUp } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, Label, BarChart, Bar } from 'recharts'
import { StatCard } from '@/components/stat-card'

interface EvolutionData { date: string; count: number }

interface CallsStats {
  total: number
  outbound: number
  inbound: number
  statusBreakdown: Record<string, number>
  interestBreakdown: Record<string, number>
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function CallsDashboardPage() {
  usePageTitle('Calls Dashboard')
  const authenticatedFetch = useAuthenticatedFetch()

  // Attio-style: quick buttons + custom popover range
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily')

  const [evolution, setEvolution] = useState<EvolutionData[]>([])
  const [mqlEvolution, setMqlEvolution] = useState<EvolutionData[]>([])
  const [leadEvolution, setLeadEvolution] = useState<EvolutionData[]>([])
  const [stats, setStats] = useState<CallsStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [mqlChartPeriod, setMqlChartPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily')
  const [clientsEvolution, setClientsEvolution] = useState<EvolutionData[]>([])
  const [agentLeaderboard, setAgentLeaderboard] = useState<{ agent_name: string; mqls: number; win_rate: number }[]>([])
  const [mqlsByCity, setMqlsByCity] = useState<{ city: string; count: number }[]>([])
  const [topCampaignsByMql, setTopCampaignsByMql] = useState<Array<{ campaign_id: string; campaign_name: string; mqls: number }>>([])
  const [contactRep, setContactRep] = useState<{ avgCallsToMql: number; avgCallsToClient: number; topContacts: { contact_name: string; calls: number }[] } | null>(null)

  // Voice Orchestrator metrics
  const [voTotalCalls, setVoTotalCalls] = useState<number>(0)
  const [batchTotalCalls, setBatchTotalCalls] = useState<number>(0)
  const [voStatusBreakdown, setVoStatusBreakdown] = useState<Array<{ status: string; count: number }>>([])
  const [voDailyStates, setVoDailyStates] = useState<Array<{ date: string; queued?: number; in_progress?: number; completed?: number; failed?: number }>>([])
  const [voAgentStats, setVoAgentStats] = useState<Array<{ agent: string; total: number; failed: number; failure_rate: number }>>([])
  const [voCampaignStats, setVoCampaignStats] = useState<Array<{ campaign: string; total: number; completed: number; failed: number }>>([])

  const formattedRange = useMemo(() => {
    return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`
  }, [startDate, endDate])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const start_date = startDate.toISOString()
      const end_date = endDate.toISOString()
      // Voice Orchestrator expects full ISO datetimes (with time and Z)
      const fromDate = new Date(startDate)
      fromDate.setUTCHours(0, 0, 0, 0)
      const toDate = new Date(endDate)
      toDate.setUTCHours(23, 59, 59, 999)
      const from = fromDate.toISOString()
      const to = toDate.toISOString()
      const evoParams = new URLSearchParams({ period: chartPeriod, start_date, end_date })
      const mqlEvoParams = new URLSearchParams({ period: mqlChartPeriod, start_date, end_date, status: 'mql' })
      const clientsEvoParams = new URLSearchParams({ period: mqlChartPeriod, start_date, end_date, status: 'client' })
      const leadEvoParams = new URLSearchParams({ period: mqlChartPeriod, start_date, end_date, status: 'lead' })
      const statsParams = new URLSearchParams({ start_date, end_date })
      const reportDayParams = new URLSearchParams({ from, to, groupBy: 'day' })
      const reportAgentParams = new URLSearchParams({ from, to, groupBy: 'agent' })
      const reportCampaignParams = new URLSearchParams({ from, to, groupBy: 'campaign' })

      const [evoRes, mqlEvoRes, clientsEvoRes, leadEvoRes, statsRes, agentsRes, cityRes, repRes, voDayRes, voAgentRes, voCampaignRes, batchTotalsRes, topCampaignsRes] = await Promise.all([
        authenticatedFetch(getApiUrl(`calls/dashboard/batch-evolution?${evoParams}`)),
        authenticatedFetch(getApiUrl(`calls/dashboard/evolution?${mqlEvoParams}`)),
        authenticatedFetch(getApiUrl(`calls/dashboard/evolution?${clientsEvoParams}`)),
        authenticatedFetch(getApiUrl(`calls/dashboard/evolution?${leadEvoParams}`)),
        authenticatedFetch(getApiUrl(`calls/dashboard/stats?${statsParams}`)),
        authenticatedFetch(getApiUrl(`calls/dashboard/agents?${statsParams}`)),
        authenticatedFetch(getApiUrl(`calls/dashboard/mqls-by-city?${statsParams}`)),
        authenticatedFetch(getApiUrl(`calls/dashboard/contact-repetition?${statsParams}`)),
        authenticatedFetch(`/api/calls/vo/report?${reportDayParams.toString()}`),
        authenticatedFetch(`/api/calls/vo/report?${reportAgentParams.toString()}`),
        authenticatedFetch(`/api/calls/vo/report?${reportCampaignParams.toString()}`),
        authenticatedFetch(getApiUrl(`calls/dashboard/batch-totals?${statsParams}`)),
        authenticatedFetch(getApiUrl(`calls/dashboard/top-campaigns-by-mql?${statsParams}&limit=5`)),
      ])
      if (evoRes.success) setEvolution(evoRes.data)
      if (mqlEvoRes.success) setMqlEvolution(mqlEvoRes.data)
      if (clientsEvoRes.success) setClientsEvolution(clientsEvoRes.data)
      if (leadEvoRes.success) setLeadEvolution(leadEvoRes.data)
      if (statsRes.success) setStats(statsRes.data)
      if (agentsRes.success) setAgentLeaderboard((agentsRes.data || []).map((a: any) => ({ agent_name: a.agent_name, mqls: a.mqls, win_rate: a.win_rate })))
      if (cityRes.success) setMqlsByCity(cityRes.data || [])
      if (repRes.success) setContactRep(repRes.data)
      if (topCampaignsRes?.success) setTopCampaignsByMql(Array.isArray(topCampaignsRes.data) ? topCampaignsRes.data : [])
      if (batchTotalsRes?.success) setBatchTotalCalls(Number(batchTotalsRes?.data?.total_recipients || 0))

      // Process VO: totals and status breakdown (aggregate by campaign groups)
      if (voCampaignRes?.success && Array.isArray(voCampaignRes?.data?.groups)) {
        const groups = voCampaignRes.data.groups as Array<Record<string, any>>
        const agg: Record<string, number> = { queued: 0, in_progress: 0, completed: 0, failed: 0 }
        const totalCalls = Number(voCampaignRes?.data?.totals?.count || 0)
        for (const g of groups) {
          for (const key of Object.keys(g)) {
            if (['key', 'campaign', 'campaignId'].includes(key)) continue
            const val = g[key]
            if (typeof val === 'number' && (key in agg)) {
              agg[key] += val
            }
          }
        }
        setVoTotalCalls(totalCalls)
        const breakdown = Object.entries(agg)
          .filter(([, v]) => (v as number) > 0)
          .map(([status, count]) => ({ status: status.replace('_', ' '), count: count as number }))
        setVoStatusBreakdown(breakdown)
      } else {
        setVoTotalCalls(0)
        setVoStatusBreakdown([])
      }

      // Process VO: daily evolution of states
      if (voDayRes?.success && Array.isArray(voDayRes?.data?.groups)) {
        const dayGroups = voDayRes.data.groups as Array<Record<string, any>>
        const series = dayGroups.map((g) => {
          const entry: any = { date: String(g.key) }
          for (const key of Object.keys(g)) {
            if (key === 'key') continue
            const val = g[key]
            if (typeof val === 'number') entry[key] = val
          }
          return entry
        })
        setVoDailyStates(series)
      } else {
        setVoDailyStates([])
      }

      // Process VO: top agents
      if (voAgentRes?.success && Array.isArray(voAgentRes?.data?.groups)) {
        const agentGroups = voAgentRes.data.groups as Array<Record<string, any>>
        const list = agentGroups.map((g) => {
          const name = (g.agentId || g.agent || g.key || 'Unknown') as string
          let total = 0
          let failed = 0
          for (const key of Object.keys(g)) {
            if (['key', 'agent', 'agentId'].includes(key)) continue
            const val = g[key]
            if (typeof val === 'number') {
              total += val
              if (key === 'failed') failed += val
            }
          }
          const failure_rate = total > 0 ? Math.round((failed / total) * 100) : 0
          return { agent: name, total, failed, failure_rate }
        }).filter(a => a.total > 0).sort((a, b) => b.total - a.total)
        setVoAgentStats(list)
      } else {
        setVoAgentStats([])
      }

      // Process VO: distribution by campaign
      if (voCampaignRes?.success && Array.isArray(voCampaignRes?.data?.groups)) {
        const campaignGroups = voCampaignRes.data.groups as Array<Record<string, any>>
        const list = campaignGroups.map((g) => {
          const campaign = (g.campaignId || g.key || 'Unknown') as string
          let total = 0
          let completed = 0
          let failed = 0
          for (const key of Object.keys(g)) {
            if (['key', 'campaign', 'campaignId'].includes(key)) continue
            const val = g[key]
            if (typeof val === 'number') {
              total += val
              if (key === 'completed') completed += val
              if (key === 'failed') failed += val
            }
          }
          return { campaign, total, completed, failed }
        }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
        setVoCampaignStats(list)
      } else {
        setVoCampaignStats([])
      }
    } catch (e) {
      console.error('Error fetching calls dashboard:', e)
      setVoTotalCalls(0)
      setVoStatusBreakdown([])
      setVoDailyStates([])
      setVoAgentStats([])
      setVoCampaignStats([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, chartPeriod, mqlChartPeriod])

  const handleQuickDateFilter = (days: number) => {
    setEndDate(new Date())
    setStartDate(subDays(new Date(), days))
  }

  const interestData = Object.entries(stats?.interestBreakdown || {}).map(([name, value]) => ({ name, value }))
  const TOTAL_INTEREST = interestData.reduce((sum, d) => sum + (d.value as number), 0)

  const formatTick = (value: string, period: 'daily' | 'monthly' | 'yearly') => {
    if (period === 'daily') {
      const d = new Date(value)
      if (isNaN(d.getTime())) return String(value)
      return format(d, 'MMM dd')
    }
    if (period === 'monthly') {
      const s = String(value)
      const parts = s.split('-')
      if (parts.length >= 2) {
        const y = Number(parts[0])
        const m = Number(parts[1])
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          const d = new Date(y, m - 1, 1)
          return format(d, 'MMM yyyy')
        }
      }
      return String(value)
    }
    return String(value)
  }

  const formatLabel = (value: string, period: 'daily' | 'monthly' | 'yearly') => {
    if (period === 'daily') {
      const d = new Date(value)
      if (isNaN(d.getTime())) return String(value)
      return format(d, 'MMM dd, yyyy')
    }
    if (period === 'monthly') {
      const s = String(value)
      const parts = s.split('-')
      if (parts.length >= 2) {
        const y = Number(parts[0])
        const m = Number(parts[1])
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          const d = new Date(y, m - 1, 1)
          return format(d, 'MMM yyyy')
        }
      }
      return String(value)
    }
    return String(value)
  }

  const truncateLabel = (value: string) => {
    const s = String(value || '')
    return s.length > 8 ? `${s.slice(0, 8)}...` : s
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Date Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(7)}>Last 7 days</Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(30)}>Last 30 days</Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(90)}>Last 90 days</Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {formattedRange}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 border-b">
                <div className="text-sm font-medium">Start Date</div>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => d && setStartDate(d)}
                  required
                  disabled={(date) => {
                    const afterToday = date > new Date()
                    const afterEnd = endDate ? date > endDate : false
                    return afterToday || afterEnd
                  }}
                />
              </div>
              <div className="p-3">
                <div className="text-sm font-medium">End Date</div>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(d) => d && setEndDate(d)}
                  required
                  disabled={(date) => {
                    const afterToday = date > new Date()
                    const beforeStart = startDate ? date < startDate : false
                    return afterToday || beforeStart
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Calls" value={batchTotalCalls} description="Lanzadas en el rango (batch_calls)" />
        <StatCard title="MQLs" value={stats?.statusBreakdown?.['mql'] ?? 0} description="Total MQLs in range" />
        <StatCard title="Clientes" value={stats?.statusBreakdown?.['client'] ?? 0} description="Total clientes en el periodo" />
        <StatCard title="Mal cualificados" value={stats?.statusBreakdown?.['lead'] ?? 0} description="Total 'lead'" />
      </div>

      {/* Conversion boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Calls → MQL %" value={(() => {
          const calls = batchTotalCalls || 0
          const mqls = stats?.statusBreakdown?.['mql'] ?? 0
          return calls > 0 ? `${Math.round((mqls / calls) * 100)}%` : '0%'
        })()} description="Dentro del rango" />
        <StatCard title="Calls → Client %" value={(() => {
          const calls = batchTotalCalls || 0
          const clients = stats?.statusBreakdown?.['client'] ?? 0
          return calls > 0 ? `${Math.round((clients / calls) * 100)}%` : '0%'
        })()} description="Dentro del rango" />
        <StatCard title="MQL → Client %" value={(() => {
          const mqls = stats?.statusBreakdown?.['mql'] ?? 0
          const clients = stats?.statusBreakdown?.['client'] ?? 0
          return mqls > 0 ? `${Math.round((clients / mqls) * 100)}%` : '0%'
        })()} description="Dentro del rango" />
      </div>

      {/* Desglose por estado (VO) */}
      {voStatusBreakdown.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Desglose por estado (Voice Orchestrator)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={voStatusBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" tickFormatter={truncateLabel} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Total" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Evolución diaria de estados (VO) */}
      {voDailyStates.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Evolución diaria de estados (Voice Orchestrator)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={voDailyStates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="queued" name="Queued" stroke="#94a3b8" dot={false} />
                <Line type="monotone" dataKey="in_progress" name="In progress" stroke="#f59e0b" dot={false} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" dot={false} />
                <Line type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Chart and Pie Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution Card */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolución de Llamadas
              </h3>
              <p className="text-sm text-gray-500">Tendencia de llamadas en el tiempo</p>
            </div>
            <div className="flex gap-2">
              {(['daily', 'monthly', 'yearly'] as const).map((period) => (
                <Button
                  key={period}
                  variant={chartPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartPeriod(period)}
                >
                  {period === 'daily' ? 'Diario' : period === 'monthly' ? 'Mensual' : 'Anual'}
                </Button>
              ))}
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tickFormatter={(value) => formatTick(String(value), chartPeriod)}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  labelFormatter={(value) => formatLabel(String(value), chartPeriod)}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interest Donut */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Interés</h3>
          <p className="text-sm text-gray-500 mb-4">Distribución por interés</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  dataKey="value" 
                  data={interestData} 
                  cx="50%" cy="50%" 
                  innerRadius={55} 
                  outerRadius={90}
                >
                  {interestData.map((d, idx) => (
                    <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                  <Label
                    value={`${TOTAL_INTEREST}`}
                    position="center"
                    className="text-xl font-semibold fill-gray-900"
                  />
                </Pie>
                <Tooltip formatter={(value: number, name: string) => {
                  const pct = TOTAL_INTEREST ? Math.round((value / TOTAL_INTEREST) * 100) : 0
                  return [`${value} (${pct}%)`, name]
                }} />
                <Legend verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MQL/Client Evolution with moving average */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolución de MQLs, Clientes y No interesados
              </h3>
              <p className="text-sm text-gray-500">Tendencia con media móvil</p>
            </div>
            <div className="flex gap-2">
              {(['daily', 'monthly', 'yearly'] as const).map((period) => (
                <Button
                  key={period}
                  variant={mqlChartPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMqlChartPeriod(period)}
                >
                  {period === 'daily' ? 'Diario' : period === 'monthly' ? 'Mensual' : 'Anual'}
                </Button>
              ))}
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mqlEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tickFormatter={(value) => formatTick(String(value), mqlChartPeriod)}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  labelFormatter={(value) => formatLabel(String(value), mqlChartPeriod)}
                />
                <Line type="monotone" dataKey="count" name="MQLs" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="count" name="Clientes" data={clientsEvolution} stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="count" name="No interesados" data={leadEvolution} stroke="#6b7280" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 5 agentes por MQL (100% width) */}
      {agentLeaderboard.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top 5 agentes por MQL</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...agentLeaderboard].sort((a,b)=>b.mqls-a.mqls).slice(0,5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="agent_name" width={150} tickFormatter={truncateLabel} />
                <Tooltip />
                <Bar dataKey="mqls" name="MQLs" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top 5 campañas por MQL (100% width) */}
      {topCampaignsByMql.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top 5 campañas por MQL</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCampaignsByMql.slice(0,5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="campaign_name" width={180} tickFormatter={truncateLabel} />
                <Tooltip />
                <Bar dataKey="mqls" name="MQLs" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top ciudades por MQL (100% width) */}
      {mqlsByCity.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top ciudades por MQL</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...mqlsByCity].sort((a,b)=>b.count-a.count)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="city" width={160} tickFormatter={truncateLabel} />
                <Tooltip />
                <Bar dataKey="count" name="MQLs" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}


