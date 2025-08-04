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
import { Calendar as CalendarIcon, TrendingUp } from 'lucide-react'
import { getApiUrl, logMigrationEvent } from '@/config/features'



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
        
        {/* Métricas de Conversaciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Conversaciones
                  </dt>
                  <dd className="text-3xl font-semibold text-gray-900">
                    {loading ? '...' : stats?.totalConversations || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Escaladas a Humano
                  </dt>
                  <dd className="text-3xl font-semibold text-red-600">
                    {loading ? '...' : stats?.escalatedConversations || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Tasa de Escalación
                  </dt>
                  <dd className="text-3xl font-semibold text-orange-600">
                    {loading ? '...' : `${stats?.escalationRate || 0}%`}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
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
      </div>

      {/* Contacts Section */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">Contactos</h2>
        
        {/* Métricas de Contactos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Contactos
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {loading ? '...' : stats?.contacts?.totalContacts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Leads
                    </dt>
                    <dd className="text-3xl font-semibold text-blue-600">
                      {loading ? '...' : stats?.contacts?.leads || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Clientes
                    </dt>
                    <dd className="text-3xl font-semibold text-green-600">
                      {loading ? '...' : stats?.contacts?.clients || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Conversion Rate
                    </dt>
                    <dd className="text-3xl font-semibold text-purple-600">
                      {loading ? '...' : `${stats?.contacts?.conversionRate || 0}%`}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas de Campos de Contacto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      📞 Teléfonos
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {loading ? '...' : stats?.contacts?.fields?.phones || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      📱 Instagram URLs
                    </dt>
                    <dd className="text-3xl font-semibold text-pink-600">
                      {loading ? '...' : stats?.contacts?.fields?.instagrams || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      📧 Emails
                    </dt>
                    <dd className="text-3xl font-semibold text-blue-600">
                      {loading ? '...' : stats?.contacts?.fields?.emails || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
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