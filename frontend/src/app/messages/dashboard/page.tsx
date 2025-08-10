"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"
import { getApiUrl } from "@/config/features"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays, subMonths, subYears } from 'date-fns'
import { Calendar as CalendarIcon, MessageSquare, AlertCircle, TrendingUp } from "lucide-react"

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
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [evolutionData, setEvolutionData] = useState<EvolutionData[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily')

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
        <div>
          <h1 className="text-2xl font-semibold">Messages Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resumen de actividad de conversaciones
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap gap-2">
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
                  disabled={(date) =>
                    date > new Date() || (endDate && date > endDate)
                  }
                />
              </div>
              <div className="p-3">
                <div className="text-sm font-medium">End Date</div>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) =>
                    date > new Date() || (startDate && date < startDate)
                  }
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* Chart Section */}
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
    </div>
  )
}


