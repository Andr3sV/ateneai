'use client'

import { useUser, UserButton, useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useHybridDashboard } from '@/hooks/useHybridData'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { FEATURE_FLAGS, logMigrationEvent } from '@/config/features'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { format, subDays, subMonths, subYears } from 'date-fns'
import { Calendar as CalendarIcon, TrendingUp } from 'lucide-react'

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

export default function DashboardPageWorkspace() {
  const { user } = useUser()
  const { isLoaded, userId } = useAuth()
  
  // Workspace context (only available if workspace system is enabled)
  let workspaceContext = null
  if (FEATURE_FLAGS.ENABLE_WORKSPACE_SYSTEM) {
    try {
      workspaceContext = useWorkspaceContext()
    } catch {
      // WorkspaceProvider not available, fall back to legacy
      logMigrationEvent('Workspace context not available, falling back to legacy')
    }
  }

  // Date filters
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d')
  const [customStartDate, setCustomStartDate] = useState<Date>()
  const [customEndDate, setCustomEndDate] = useState<Date>()
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily')

  // Evolution data states
  const [conversationEvolutionData, setConversationEvolutionData] = useState<EvolutionData[]>([])
  const [contactsEvolutionData, setContactsEvolutionData] = useState<EvolutionData[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [contactsChartLoading, setContactsChartLoading] = useState(false)

  // Calculate date filters
  const getDateFilters = () => {
    let startDate: string
    let endDate: string = new Date().toISOString()

    switch (dateRange) {
      case '7d':
        startDate = subDays(new Date(), 7).toISOString()
        break
      case '30d':
        startDate = subDays(new Date(), 30).toISOString()
        break
      case '90d':
        startDate = subDays(new Date(), 90).toISOString()
        break
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

  // Use hybrid dashboard hook
  const filters = getDateFilters()
  const {
    stats,
    conversationsEvolution,
    contactsEvolution,
    loading,
    error,
    refetch,
    fetchEvolutionData,
    isWorkspaceSystem
  } = useHybridDashboard(filters)

  // Fetch evolution data when chart period changes
  useEffect(() => {
    if (fetchEvolutionData && isWorkspaceSystem) {
      setChartLoading(true)
      fetchEvolutionData('conversations', chartPeriod).finally(() => setChartLoading(false))
      
      setContactsChartLoading(true)
      fetchEvolutionData('contacts', chartPeriod).finally(() => setContactsChartLoading(false))
    }
  }, [chartPeriod, fetchEvolutionData, isWorkspaceSystem])

  // Update evolution data when received
  useEffect(() => {
    if (conversationsEvolution) {
      setConversationEvolutionData(conversationsEvolution)
    }
  }, [conversationsEvolution])

  useEffect(() => {
    if (contactsEvolution) {
      setContactsEvolutionData(contactsEvolution)
    }
  }, [contactsEvolution])

  // Log which system is being used
  useEffect(() => {
    logMigrationEvent('Dashboard page loaded', {
      workspaceSystemEnabled: FEATURE_FLAGS.ENABLE_WORKSPACE_SYSTEM,
      usingWorkspaceSystem: isWorkspaceSystem,
      hasWorkspaceContext: !!workspaceContext,
      workspaceId: workspaceContext?.workspaceId,
      userId: workspaceContext?.userId
    })
  }, [isWorkspaceSystem, workspaceContext])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600">Error: Usuario no autenticado</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={refetch} className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Resumen de tu actividad de chatbot
            {isWorkspaceSystem && workspaceContext && (
              <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                📊 Workspace: {workspaceContext.workspace?.name}
              </span>
            )}
            {!isWorkspaceSystem && (
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                📊 Legacy Mode
              </span>
            )}
          </p>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* Filtros de fecha */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={dateRange === '7d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDateRange('7d')}
        >
          Últimos 7 días
        </Button>
        <Button
          variant={dateRange === '30d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDateRange('30d')}
        >
          Últimos 30 días
        </Button>
        <Button
          variant={dateRange === '90d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDateRange('90d')}
        >
          Últimos 90 días
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={dateRange === 'custom' ? 'default' : 'outline'} size="sm">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Personalizado
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Fecha inicio</label>
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  disabled={(date) => date > new Date()}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha fin</label>
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  disabled={(date) => date > new Date() || (customStartDate && date < customStartDate)}
                />
              </div>
              <Button 
                onClick={() => setDateRange('custom')}
                disabled={!customStartDate || !customEndDate}
                className="w-full"
              >
                Aplicar filtro
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white shadow rounded-lg p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Métricas de Conversaciones */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversaciones</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-500">Total Conversaciones</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.totalConversations}</p>
              </div>
              
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-500">Escaladas a Humano</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.escalatedConversations}</p>
              </div>
              
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-500">Tasa de Escalación</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.escalationRate}%</p>
              </div>
            </div>
          </div>

          {/* Gráfico de Evolución de Conversaciones */}
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
                  <div className="text-gray-500">Cargando gráfico...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={conversationEvolutionData}>
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

          {/* Métricas de Contactos */}
          {stats.contacts && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Contactos</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500">Total Contactos</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.contacts.totalContacts}</p>
                  </div>
                  
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500">Leads</h3>
                    <p className="text-2xl font-bold text-yellow-600">{stats.contacts.leads}</p>
                  </div>
                  
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500">Clientes</h3>
                    <p className="text-2xl font-bold text-green-600">{stats.contacts.clients}</p>
                  </div>
                  
                  <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-sm font-medium text-gray-500">Tasa de Conversión</h3>
                    <p className="text-2xl font-bold text-blue-600">{stats.contacts.conversionRate}%</p>
                  </div>
                </div>
              </div>

              {/* Métricas de Campos de Contacto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-sm font-medium text-gray-500">Teléfonos</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.contacts.fields.phones}</p>
                </div>
                
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-sm font-medium text-gray-500">Instagram URLs</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.contacts.fields.instagrams}</p>
                </div>
                
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-sm font-medium text-gray-500">Emails</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats.contacts.fields.emails}</p>
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

              {/* Top 4 Países */}
              {stats.contacts.topCountries && stats.contacts.topCountries.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Top 4 Países</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.contacts.topCountries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="country" 
                          fontSize={12}
                          tickFormatter={(value) => getCountryFlag(value)}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip 
                          labelFormatter={(value) => `${getCountryFlag(value as string)} ${value}`}
                          formatter={(value) => [value, 'Contactos']}
                        />
                        <Bar dataKey="count" fill="#8884d8">
                          {stats.contacts.topCountries.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500">
          No hay datos disponibles para mostrar
        </div>
      )}
    </div>
  )
}