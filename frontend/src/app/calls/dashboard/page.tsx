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
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, Label } from 'recharts'
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
  const [stats, setStats] = useState<CallsStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [mqlChartPeriod, setMqlChartPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily')

  const formattedRange = useMemo(() => {
    return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`
  }, [startDate, endDate])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const start_date = startDate.toISOString()
      const end_date = endDate.toISOString()
      const evoParams = new URLSearchParams({ period: chartPeriod, start_date, end_date })
      const mqlEvoParams = new URLSearchParams({ period: mqlChartPeriod, start_date, end_date, status: 'mql' })
      const statsParams = new URLSearchParams({ start_date, end_date })
      const [evoRes, mqlEvoRes, statsRes] = await Promise.all([
        authenticatedFetch(getApiUrl(`calls/dashboard/evolution?${evoParams}`)),
        authenticatedFetch(getApiUrl(`calls/dashboard/evolution?${mqlEvoParams}`)),
        authenticatedFetch(getApiUrl(`calls/dashboard/stats?${statsParams}`)),
      ])
      if (evoRes.success) setEvolution(evoRes.data)
      if (mqlEvoRes.success) setMqlEvolution(mqlEvoRes.data)
      if (statsRes.success) setStats(statsRes.data)
    } catch (e) {
      console.error('Error fetching calls dashboard:', e)
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
        <StatCard title="Total Calls" value={stats?.total ?? 0} description="All calls in range" />
        <StatCard title="MQLs" value={stats?.statusBreakdown?.['mql'] ?? 0} description="Total MQLs in range" />
        <StatCard title="Clientes" value={stats?.statusBreakdown?.['client'] ?? 0} description="Total clientes en el periodo" />
        <StatCard title="Lead → Client %" value={(() => {
          const leads = stats?.statusBreakdown?.['lead'] ?? 0
          const clients = stats?.statusBreakdown?.['client'] ?? 0
          return leads > 0 ? `${Math.round((clients / leads) * 100)}%` : '0%'
        })()} description="Conversion within period" />
      </div>

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
                  tickFormatter={(value) => {
                    if (chartPeriod === 'daily') {
                      return format(new Date(value), 'MMM dd')
                    } else if (chartPeriod === 'monthly') {
                      return format(new Date(String(value) + '-01'), 'MMM yyyy')
                    } else {
                      return String(value)
                    }
                  }}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  labelFormatter={(value) => {
                    if (chartPeriod === 'daily') {
                      return format(new Date(value as string), 'MMM dd, yyyy')
                    } else if (chartPeriod === 'monthly') {
                      return format(new Date(String(value) + '-01'), 'MMM yyyy')
                    } else {
                      return String(value)
                    }
                  }}
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

      {/* MQL Evolution */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolución de MQLs
              </h3>
              <p className="text-sm text-gray-500">MQLs generados en el tiempo</p>
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
                  tickFormatter={(value) => {
                    if (mqlChartPeriod === 'daily') {
                      return format(new Date(value), 'MMM dd')
                    } else if (mqlChartPeriod === 'monthly') {
                      return format(new Date(String(value) + '-01'), 'MMM yyyy')
                    } else {
                      return String(value)
                    }
                  }}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  labelFormatter={(value) => {
                    if (mqlChartPeriod === 'daily') {
                      return format(new Date(value as string), 'MMM dd, yyyy')
                    } else if (mqlChartPeriod === 'monthly') {
                      return format(new Date(String(value) + '-01'), 'MMM yyyy')
                    } else {
                      return String(value)
                    }
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}


