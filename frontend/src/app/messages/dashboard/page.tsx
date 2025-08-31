"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"
import { usePageTitle } from "@/hooks/usePageTitle"
import { getApiUrl } from "@/config/features"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays, subMonths, subYears } from 'date-fns'
import { Calendar as CalendarIcon, MessageSquare, AlertCircle, TrendingUp } from "lucide-react"

// Skeleton Components
const StatCardSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
      </div>
      <div className="ml-4 w-full">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  </div>
)

const ChartSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-64"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded w-16"></div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
    </div>
    <div className="h-80 bg-gray-200 rounded"></div>
  </div>
)

const DateFiltersSkeleton = () => (
  <div className="flex flex-wrap gap-2 animate-pulse">
    <div className="h-9 bg-gray-200 rounded w-24"></div>
    <div className="h-9 bg-gray-200 rounded w-28"></div>
    <div className="h-9 bg-gray-200 rounded w-28"></div>
    <div className="h-9 bg-gray-200 rounded w-32"></div>
  </div>
)

type DashboardStats = {
  totalConversations: number
  escalatedConversations: number
  escalationRate: number
}

interface EvolutionData {
  date: string
  count: number
}

export default function MessagesDashboardPage() {
  const { user } = useUser()
  const authenticatedFetch = useAuthenticatedFetch()
  
  // Set page title in header
  usePageTitle('Messages Dashboard')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [evolutionData, setEvolutionData] = useState<EvolutionData[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily')

  // Show loading state until we have actual data
  const showSkeletons = loading || !stats
  const showChartSkeletons = chartLoading || evolutionData.length === 0

  useEffect(() => {
    const run = async () => {
      const data = await authenticatedFetch(getApiUrl("analytics/dashboard-stats"))
      if (data?.success) setStats(data.data)
      setLoading(false)
    }
    if (user) run()
  }, [user, authenticatedFetch])

  useEffect(() => {
    if (user && startDate && endDate) {
      fetchEvolutionData()
    }
  }, [user, startDate, endDate, chartPeriod])

  const fetchEvolutionData = async () => {
    setChartLoading(true)
    try {
      const startDateStr = startDate.toISOString()
      const endDateStr = endDate.toISOString()
      
      const data = await authenticatedFetch(
        getApiUrl(`analytics/conversations-evolution?period=${chartPeriod}&start_date=${startDateStr}&end_date=${endDateStr}`)
      )
      
      if (data?.success) {
        setEvolutionData(data.data)
      }
    } catch (error) {
      console.error('Error fetching evolution data:', error)
    } finally {
      setChartLoading(false)
    }
  }

  const handleQuickDateFilter = (days: number) => {
    setEndDate(new Date())
    setStartDate(subDays(new Date(), days))
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        {/* Date Filters */}
        <div className="flex flex-wrap gap-2">
          {showSkeletons ? (
            <DateFiltersSkeleton />
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateFilter(7)}
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateFilter(30)}
              >
                Last 30 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateFilter(90)}
              >
                Last 90 days
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {startDate && endDate
                      ? `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`
                      : 'Custom Range'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 border-b">
                    <div className="text-sm font-medium">Start Date</div>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
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
                      onSelect={setEndDate}
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
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {showSkeletons ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Conversations"
              value={stats?.totalConversations ?? 0}
              description="Conversaciones creadas"
              icon={<MessageSquare className="h-4 w-4" />}
            />
            <StatCard
              title="Escaladas a Humano"
              value={stats?.escalatedConversations ?? 0}
              description="Derivadas a equipo"
              icon={<AlertCircle className="h-4 w-4" />}
            />
            <StatCard
              title="Tasa de Escalación"
              value={`${stats?.escalationRate ?? 0}%`}
              description="Porcentaje del total"
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </>
        )}
      </div>

      {/* Chart Section */}
      {showSkeletons ? (
        <ChartSkeleton />
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolución de Conversaciones
              </h3>
              <p className="text-sm text-gray-500">
                Tendencia de conversaciones en el tiempo
              </p>
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
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12}
                    tickFormatter={(value) => {
                      if (chartPeriod === 'daily') {
                        return format(new Date(value), 'MMM dd')
                      } else if (chartPeriod === 'monthly') {
                        return format(new Date(value + '-01'), 'MMM yyyy')
                      } else {
                        return value
                      }
                    }}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    labelFormatter={(value) => {
                      if (chartPeriod === 'daily') {
                        return format(new Date(value as string), 'MMM dd, yyyy')
                      } else if (chartPeriod === 'monthly') {
                        return format(new Date(value + '-01'), 'MMM yyyy')
                      } else {
                        return value
                      }
                    }}
                    formatter={(value) => [value, 'Conversaciones']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


