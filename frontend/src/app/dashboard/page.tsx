'use client'

import { useUser, UserButton, useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { format, subDays, subMonths, subYears } from 'date-fns'
import { Calendar as CalendarIcon, TrendingUp, MessageSquare, AlertCircle, Phone, Instagram, Mail, Users } from 'lucide-react'
import { getApiUrl, logMigrationEvent } from '@/config/features'
import { StatCard } from '@/components/stat-card'



interface DashboardStats {
  totalConversations: number
  escalatedConversations: number
  escalationRate: number
  statusBreakdown: {
    open: number
    closed: number
    other: number
  }
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
    topCountries: Array<{
      country: string
      count: number
    }>
  }
}

interface EvolutionData {
  date: string
  count: number
}

// Función para obtener emoji de bandera de país
const getCountryFlag = (countryCode: string): string => {
  const flagMap: { [key: string]: string } = {
    'ES': '🇪🇸',
    'US': '🇺🇸', 
    'GB': '🇬🇧',
    'FR': '🇫🇷',
    'DE': '🇩🇪',
    'IT': '🇮🇹',
    'PT': '🇵🇹',
    'NL': '🇳🇱',
    'BE': '🇧🇪',
    'CH': '🇨🇭',
    'AT': '🇦🇹',
    'SE': '🇸🇪',
    'NO': '🇳🇴',
    'DK': '🇩🇰',
    'FI': '🇫🇮',
    'IE': '🇮🇪',
    'LU': '🇱🇺',
    'MT': '🇲🇹',
    'CY': '🇨🇾',
    'GR': '🇬🇷',
    'PL': '🇵🇱',
    'CZ': '🇨🇿',
    'SK': '🇸🇰',
    'HU': '🇭🇺',
    'SI': '🇸🇮',
    'HR': '🇭🇷',
    'RO': '🇷🇴',
    'BG': '🇧🇬',
    'EE': '🇪🇪',
    'LV': '🇱🇻',
    'LT': '🇱🇹',
    'CA': '🇨🇦',
    'MX': '🇲🇽',
    'BR': '🇧🇷',
    'AR': '🇦🇷',
    'CO': '🇨🇴',
    'CL': '🇨🇱',
    'PE': '🇵🇪',
    'VE': '🇻🇪',
    'EC': '🇪🇨',
    'UY': '🇺🇾',
    'PY': '🇵🇾',
    'BO': '🇧🇴',
    'JP': '🇯🇵',
    'CN': '🇨🇳',
    'KR': '🇰🇷',
    'IN': '🇮🇳',
    'AU': '🇦🇺',
    'NZ': '🇳🇿',
    'ZA': '🇿🇦',
    'EG': '🇪🇬',
    'MA': '🇲🇦',
    'NG': '🇳🇬',
    'KE': '🇰🇪',
    'GH': '🇬🇭',
    'TN': '🇹🇳',
    'DZ': '🇩🇿',
    'AO': '🇦🇴',
    'MZ': '🇲🇿',
    'MW': '🇲🇼',
    'ZM': '🇿🇲',
    'ZW': '🇿🇼',
    'BW': '🇧🇼',
    'NA': '🇳🇦',
    'SZ': '🇸🇿',
    'LS': '🇱🇸'
  };
  return flagMap[countryCode.toUpperCase()] || '🏳️';
}

export default function DashboardPage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const authenticatedFetch = useAuthenticatedFetch()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [evolutionData, setEvolutionData] = useState<EvolutionData[]>([])
  const [contactsEvolutionData, setContactsEvolutionData] = useState<EvolutionData[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [contactsChartLoading, setContactsChartLoading] = useState(false)
  
  // Date filters
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  
  // Chart period
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily')

  useEffect(() => {
    if (user) {
      console.log('=== DEBUG CLERK USER ===')
      console.log('User ID:', user.id)
      console.log('Email:', user.emailAddresses?.[0]?.emailAddress)
      console.log('========================')
      fetchDashboardData()
    }
  }, [user])

  useEffect(() => {
    if (user && (startDate || endDate)) {
      fetchDashboardData()
    }
  }, [startDate, endDate])

  useEffect(() => {
    if (user) {
      fetchEvolutionData()
      fetchContactsEvolutionData()
    }
  }, [chartPeriod, startDate, endDate])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate.toISOString())
      if (endDate) params.append('end_date', endDate.toISOString())

      // Fetch dashboard stats
      logMigrationEvent('Dashboard stats fetch', { userId: user?.id, apiVersion: 'v2' })
      const statsData = await authenticatedFetch(getApiUrl(`analytics/dashboard-stats?${params}`))
      if (statsData.success) {
        setStats(statsData.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEvolutionData = async () => {
    setChartLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('period', chartPeriod)
      if (startDate) params.append('start_date', startDate.toISOString())
      if (endDate) params.append('end_date', endDate.toISOString())

      logMigrationEvent('Conversations evolution fetch', { userId: user?.id, period: chartPeriod })
      const data = await authenticatedFetch(getApiUrl(`analytics/conversations-evolution?${params}`))
      if (data.success) {
        setEvolutionData(data.data)
      }
    } catch (error) {
      console.error('Error fetching evolution data:', error)
    } finally {
      setChartLoading(false)
    }
  }





  const fetchContactsEvolutionData = async () => {
    setContactsChartLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('period', chartPeriod)
      if (startDate) params.append('start_date', startDate.toISOString())
      if (endDate) params.append('end_date', endDate.toISOString())

      logMigrationEvent('Contacts evolution fetch', { userId: user?.id, period: chartPeriod })
      const data = await authenticatedFetch(getApiUrl(`analytics/contacts-evolution?${params}`))
      if (data.success) {
        setContactsEvolutionData(data.data)
      }
    } catch (error) {
      console.error('Error fetching contacts evolution data:', error)
    } finally {
      setContactsChartLoading(false)
    }
  }

  const handleQuickDateFilter = (days: number) => {
    setEndDate(new Date())
    setStartDate(subDays(new Date(), days))
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header with Date Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Bienvenido, {user?.firstName || 'Usuario'}</p>
          </div>
          
          {/* Date Filters */}
          <div className="flex flex-wrap items-center gap-2">
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
      </div>

      {/* Conversations Section */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">Conversations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Conversations"
            value={loading ? '...' : (stats?.totalConversations ?? 0)}
            description="Conversaciones en el periodo"
            icon={<MessageSquare className="h-4 w-4" />}
          />
          <StatCard
            title="Escaladas a Humano"
            value={loading ? '...' : (stats?.escalatedConversations ?? 0)}
            description="Derivadas a equipo"
            icon={<AlertCircle className="h-4 w-4" />}
          />
          <StatCard
            title="Tasa de Escalación"
            value={loading ? '...' : `${stats?.escalationRate ?? 0}%`}
            description="Porcentaje del total"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>
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

      {/* Contacts Section */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">Contactos</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Contacts"
            value={loading ? '...' : (stats?.contacts?.totalContacts ?? 0)}
            description="All contacts in database"
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="Leads"
            value={loading ? '...' : (stats?.contacts?.leads ?? 0)}
            description="Contactos en etapa lead"
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="Clients"
            value={loading ? '...' : (stats?.contacts?.clients ?? 0)}
            description="Contactos activos clientes"
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="Conversion Rate"
            value={loading ? '...' : `${stats?.contacts?.conversionRate ?? 0}%`}
            description="Leads a clientes"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Phones"
            value={loading ? '...' : (stats?.contacts?.fields?.phones ?? 0)}
            description="Contactos con teléfono"
            icon={<Phone className="h-4 w-4" />}
          />
          <StatCard
            title="Instagrams"
            value={loading ? '...' : (stats?.contacts?.fields?.instagrams ?? 0)}
            description="Contactos con Instagram"
            icon={<Instagram className="h-4 w-4" />}
          />
          <StatCard
            title="Emails"
            value={loading ? '...' : (stats?.contacts?.fields?.emails ?? 0)}
            description="Contactos con email"
            icon={<Mail className="h-4 w-4" />}
          />
        </div>

        {/* Gráfico Evolutivo de Contactos */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolución de Contactos
              </h3>
              <p className="text-sm text-gray-500">
                Tendencia de contactos creados en el tiempo
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
            {contactsChartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Cargando gráfico...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contactsEvolutionData}>
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
                    formatter={(value) => [value, 'Contactos']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico de Países */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Top 4 Países
            </h3>
            <p className="text-sm text-gray-500">
              Países con más contactos
            </p>
          </div>
          
          <div className="h-80">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Cargando gráfico...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.contacts?.topCountries?.map(item => ({
                  country: getCountryFlag(item.country),
                  count: item.count,
                  name: item.country
                })) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="country" 
                    fontSize={20}
                    tick={{ fontSize: 20 }}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    formatter={(value, name, props) => [value, 'Contactos']}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `${item.country} ${item.name}` : label;
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>


    </div>
  )
}