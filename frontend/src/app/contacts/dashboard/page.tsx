"use client"

import { useEffect, useState } from "react"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"
import { usePageTitle } from "@/hooks/usePageTitle"
import { getApiUrl, logMigrationEvent } from "@/config/features"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format, subDays } from 'date-fns'
import { Calendar as CalendarIcon, TrendingUp, Phone, Instagram, Mail, Users } from "lucide-react"

// Skeleton Components for loading states
const StatCardSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
  </div>
)

const ChartSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
    <div className="h-80 bg-gray-100 rounded"></div>
  </div>
)

interface DashboardStats {
  contacts: {
    totalContacts: number
    leads: number
    clients: number
    conversionRate: number
    fields: {
      phones: number
      instagrams: number
      emails: number
    }
    topCountries: Array<{ country: string; count: number }>
  }
}

interface EvolutionData { date: string; count: number }

export default function ContactsDashboardPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  usePageTitle('Contacts Dashboard')

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [contactsEvolutionData, setContactsEvolutionData] = useState<EvolutionData[]>([])
  const [loading, setLoading] = useState(true)
  const [contactsChartLoading, setContactsChartLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily')

  useEffect(() => { fetchDashboardData() }, [])
  useEffect(() => { fetchDashboardData() }, [startDate, endDate])
  useEffect(() => { fetchContactsEvolutionData() }, [chartPeriod, startDate, endDate])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('start_date', startDate.toISOString())
      params.append('end_date', endDate.toISOString())
      logMigrationEvent('Contacts dashboard stats fetch', {})
      const statsData = await authenticatedFetch(getApiUrl(`analytics/dashboard-stats?${params}`))
      if (statsData.success) setStats(statsData.data)
    } catch (error) {
      console.error('Error fetching contacts dashboard data:', error)
    } finally { setLoading(false) }
  }

  const fetchContactsEvolutionData = async () => {
    setContactsChartLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('period', chartPeriod)
      params.append('start_date', startDate.toISOString())
      params.append('end_date', endDate.toISOString())
      logMigrationEvent('Contacts evolution fetch', { period: chartPeriod })
      const data = await authenticatedFetch(getApiUrl(`analytics/contacts-evolution?${params}`))
      if (data.success) setContactsEvolutionData(data.data)
    } catch (error) {
      console.error('Error fetching contacts evolution data:', error)
    } finally { setContactsChartLoading(false) }
  }

  const handleQuickDateFilter = (days: number) => { setEndDate(new Date()); setStartDate(subDays(new Date(), days)) }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Date Filters */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(7)}>Last 7 days</Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(30)}>Last 30 days</Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(90)}>Last 90 days</Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {`${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 border-b">
              <div className="text-sm font-medium">Start Date</div>
              <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} required={false} />
            </div>
            <div className="p-3">
              <div className="text-sm font-medium">End Date</div>
              <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} required={false} />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard title="Total Contacts" value={stats?.contacts?.totalContacts ?? 0} description="All contacts in database" icon={<Users className="h-4 w-4" />} />
            <StatCard title="Leads" value={stats?.contacts?.leads ?? 0} description="Contactos en etapa lead" icon={<Users className="h-4 w-4" />} />
            <StatCard title="Clients" value={stats?.contacts?.clients ?? 0} description="Contactos activos clientes" icon={<Users className="h-4 w-4" />} />
            <StatCard title="Conversion Rate" value={`${stats?.contacts?.conversionRate ?? 0}%`} description="Leads a clientes" icon={<TrendingUp className="h-4 w-4" />} />
          </>
        )}
      </div>

      {/* Field Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard title="Phones" value={stats?.contacts?.fields?.phones ?? 0} description="Contactos con teléfono" icon={<Phone className="h-4 w-4" />} />
            <StatCard title="Instagrams" value={stats?.contacts?.fields?.instagrams ?? 0} description="Contactos con Instagram" icon={<Instagram className="h-4 w-4" />} />
            <StatCard title="Emails" value={stats?.contacts?.fields?.emails ?? 0} description="Contactos con email" icon={<Mail className="h-4 w-4" />} />
          </>
        )}
      </div>

      {/* Contacts Evolution Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolución de Contactos
            </h3>
            <p className="text-sm text-gray-500">Tendencia de contactos creados en el tiempo</p>
          </div>
          <div className="flex gap-2">
            {(['daily', 'monthly', 'yearly'] as const).map((period) => (
              <Button key={period} variant={chartPeriod === period ? 'default' : 'outline'} size="sm" onClick={() => setChartPeriod(period)}>
                {period === 'daily' ? 'Diario' : period === 'monthly' ? 'Mensual' : 'Anual'}
              </Button>
            ))}
          </div>
        </div>
        <div className="h-80">
          {loading || contactsChartLoading ? (
            <div className="w-full h-full bg-gray-100 rounded animate-pulse"></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={contactsEvolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tickFormatter={(value) => {
                    if (chartPeriod === 'daily') return format(new Date(value), 'MMM dd')
                    if (chartPeriod === 'monthly') return format(new Date(value), 'MMM yyyy')
                    return format(new Date(value), 'yyyy')
                  }}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  labelFormatter={(value) => {
                    if (chartPeriod === 'daily') return format(new Date(value), 'MMM dd, yyyy')
                    if (chartPeriod === 'monthly') return format(new Date(value), 'MMMM yyyy')
                    return format(new Date(value), 'yyyy')
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
          )}
        </div>
      </div>

      {/* Top Countries */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">Top 4 Países</h3>
          <p className="text-sm text-gray-500">Países con más contactos</p>
        </div>
        <div className="h-80">
          {loading ? (
            <div className="flex items-center justify-center h-full"><div className="text-gray-500">Cargando gráfico...</div></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(stats?.contacts?.topCountries || []).map(item => ({ country: item.country, count: item.count }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => [value, 'Contactos']} />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}


