"use client"

import { useUser, useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { getApiUrl, logMigrationEvent } from '@/config/features'
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Unlink,
  Facebook,
  Instagram,
  AlertCircle,
  ExternalLink,
  Settings,
  Shield,
  MessageSquare,
  BarChart3
} from 'lucide-react'

interface SocialConnection {
  id: string
  platform: 'facebook' | 'instagram'
  isConnected: boolean
  connectedAt?: string
  lastSync?: string
  pageId?: string
  pageName?: string
  accessToken?: string
  tokenExpiresAt?: string
  permissions?: string[]
  error?: string
}

export default function SocialConnectionsPage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const authenticatedFetch = useAuthenticatedFetch()
  
  // Set page title in header
  usePageTitle('Social Connections')
  
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchConnections()
    }
  }, [user])

  const fetchConnections = async () => {
    try {
      setLoading(true)
      logMigrationEvent('Social connections fetch', { userId: user?.id })
      const data = await authenticatedFetch(getApiUrl('social-connections'))
      
      if (data.success) {
        setConnections(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching social connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (platform: 'facebook' | 'instagram') => {
    try {
      setConnecting(platform)
      
      // Redirect to OAuth flow
      const authUrl = await authenticatedFetch(getApiUrl(`social-connections/${platform}/auth-url`))
      
      if (authUrl.success) {
        window.location.href = authUrl.data.url
      }
    } catch (error) {
      console.error(`Error connecting to ${platform}:`, error)
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (platform: 'facebook' | 'instagram') => {
    try {
      const result = await authenticatedFetch(getApiUrl(`social-connections/${platform}/disconnect`), {
        method: 'DELETE'
      })
      
      if (result.success) {
        fetchConnections()
      }
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error)
    }
  }

  const handleReauthorize = async (platform: 'facebook' | 'instagram') => {
    await handleConnect(platform)
  }

  const getConnectionData = (platform: 'facebook' | 'instagram'): SocialConnection => {
    return connections.find(conn => conn.platform === platform) || {
      id: '',
      platform,
      isConnected: false
    }
  }

  const renderConnectionCard = (platform: 'facebook' | 'instagram') => {
    const connection = getConnectionData(platform)
    const isConnected = connection.isConnected
    const hasError = !!connection.error
    const isExpired = connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt) < new Date() : false

    const platformConfig = {
      facebook: {
        name: 'Facebook',
        icon: Facebook,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        description: 'Conecta tu página de Facebook para recibir y responder mensajes de Messenger.',
        permissions: ['pages_messaging', 'pages_manage_metadata', 'pages_read_engagement']
      },
      instagram: {
        name: 'Instagram',
        icon: Instagram,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        description: 'Conecta tu cuenta de Instagram Business para gestionar mensajes directos.',
        permissions: ['instagram_basic', 'instagram_manage_messages', 'instagram_manage_insights']
      }
    }

    const config = platformConfig[platform]
    const Icon = config.icon

    return (
      <Card key={platform} className={`transition-all duration-200 hover:shadow-md ${
        isConnected && !hasError && !isExpired 
          ? `${config.borderColor} ${config.bgColor}` 
          : 'border-gray-200'
      }`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.bgColor}`}>
                <Icon className={`h-6 w-6 ${config.color}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{config.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {isConnected && !hasError && !isExpired ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : hasError || isExpired ? (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {isExpired ? 'Token Expirado' : 'Error'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {isConnected && !hasError && !isExpired ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReauthorize(platform)}
                    disabled={connecting === platform}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${connecting === platform ? 'animate-spin' : ''}`} />
                    Reautorizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(platform)}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Desconectar
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => handleConnect(platform)}
                  disabled={connecting === platform}
                  className={`${config.color} border-current hover:bg-current hover:text-white`}
                  variant="outline"
                >
                  {connecting === platform ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 mr-2" />
                  )}
                  {hasError || isExpired ? 'Reconectar' : 'Conectar'}
                </Button>
              )}
            </div>
          </div>
          <CardDescription className="mt-2">
            {config.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Connection Details */}
          {isConnected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Página/Cuenta:</span>
                  <p className="font-medium">{connection.pageName || 'Sin nombre'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Conectado:</span>
                  <p className="font-medium">
                    {connection.connectedAt 
                      ? new Date(connection.connectedAt).toLocaleDateString('es-ES')
                      : 'Fecha desconocida'
                    }
                  </p>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <span className="text-sm text-muted-foreground mb-2 block">Permisos:</span>
                <div className="flex flex-wrap gap-1">
                  {config.permissions.map(permission => (
                    <Badge key={permission} variant="outline" className="text-xs">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Status Indicators */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground">Mensajes</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="text-muted-foreground">Insights</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span className="text-muted-foreground">Webhooks</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {hasError && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {connection.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Expiration Warning */}
          {isExpired && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                El token de acceso ha expirado. Por favor, reautoriza la conexión.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">Cargando conexiones...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Configurar Webhooks
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Seguridad:</strong> Todas las credenciales se almacenan de forma cifrada. 
          Puedes desconectar cualquier cuenta en cualquier momento.
          <Button variant="link" className="p-0 h-auto ml-2" asChild>
            <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer">
              Gestionar en Meta Business
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </AlertDescription>
      </Alert>

      {/* Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderConnectionCard('facebook')}
        {renderConnectionCard('instagram')}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">¿Necesitas ayuda?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Facebook Messenger</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Asegúrate de tener una página de Facebook</li>
                <li>• La página debe estar publicada y activa</li>
                <li>• Necesitas ser administrador de la página</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Instagram Business</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Cuenta debe ser Instagram Business o Creator</li>
                <li>• Vinculada a una página de Facebook</li>
                <li>• Mensajería debe estar habilitada</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}