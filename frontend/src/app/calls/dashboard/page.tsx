'use client'

import { useEffect, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getApiUrl, logMigrationEvent } from '@/config/features'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts'
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

  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d')
  const [customStartDate, setCustomStartDate] = useState<Date>()
  const [customEndDate, setCustomEndDate] = useState<Date>()

  const [evolution, setEvolution] = useState<EvolutionData[]>([])
  const [stats, setStats] = useState<CallsStats | null>(null)
  const [loading, setLoading] = useState(false)

  const getDateFilters = () => {
    let startDate: string
    let endDate: string = new Date().toISOString()
    switch (dateRange) {
      case '7d': startDate = subDays(new Date(), 7).toISOString(); break
      case '30d': startDate = subDays(new Date(), 30).toISOString(); break
      case '90d': startDate = subDays(new Date(), 90).toISOString(); break
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = customStartDate.toISOString()
          endDate = customEndDate.toISOString()
        } else {
          startDate = subDays(new Date(), 30).toISOString()
        }
        break
      default:
        startDate = subDays(new Date(), 30).toISOString()
    }
    return { start_date: startDate, end_date: endDate }
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { start_date, end_date } = getDateFilters()
      const evoParams = new URLSearchParams({ period: 'daily', start_date, end_date })
      const statsParams = new URLSearchParams({ start_date, end_date })
      const [evoRes, statsRes] = await Promise.all([
        authenticatedFetch(getApiUrl(`calls/dashboard/evolution?${evoParams}`)),
        authenticatedFetch(getApiUrl(`calls/dashboard/stats?${statsParams}`)),
      ])
      if (evoRes.success) setEvolution(evoRes.data)
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
  }, [dateRange, customStartDate, customEndDate])

  const interestData = Object.entries(stats?.interestBreakdown || {}).map(([name, value]) => ({ name, value }))

  return (
    <div className="p-6 space-y-6">
      {/* Header with date filters */}
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">Calls Dashboard</div>
        <div className="flex items-center gap-2">
          {(['7d','30d','90d'] as const).map((key) => (
            <Button key={key} variant={dateRange === key ? 'default' : 'outline'} onClick={() => setDateRange(key)}>
              {key.toUpperCase()}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={dateRange === 'custom' ? 'default' : 'outline'} onClick={() => setDateRange('custom')}>
                <CalendarIcon className="mr-2 h-4 w-4" /> Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <div className="flex gap-2 p-3">
                <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} />
                <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Calls" value={loading ? '...' : (stats?.total ?? 0)} description="All calls in range" />
        <StatCard title="Outbound" value={loading ? '...' : (stats?.outbound ?? 0)} description="Calls initiated by agents" />
        <StatCard title="Inbound" value={loading ? '...' : (stats?.inbound ?? 0)} description="Calls received" />
        <StatCard title="Lead → Client %" value={loading ? '...' : (() => {
          const leads = stats?.statusBreakdown?.['lead'] ?? 0
          const clients = stats?.statusBreakdown?.['client'] ?? 0
          return leads > 0 ? `${Math.round((clients / leads) * 100)}%` : '0%'
        })()} description="Conversion within period" />
      </div>

      {/* Evolution line chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Interest pie */}
        <div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={interestData} cx="50%" cy="50%" outerRadius={90} label>
                  {interestData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}


