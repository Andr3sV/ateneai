"use client"

import { useUser, useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { subscribeToWorkspaceConversations, subscribeToWorkspaceMessages, subscribeToWorkspaceCalls } from '@/lib/supabase'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { ChatModal } from '@/components/chat-modal'

import { getApiUrl, logMigrationEvent } from '@/config/features'
import { 
  Search, 
  Phone, 
  Clock, 
  MessageCircle, 
  AlertCircle,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

// Skeleton Components
const TableRowSkeleton = () => (
  <TableRow className="animate-pulse">
    <TableCell className="py-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </TableCell>
    <TableCell className="py-4">
      <div className="flex items-center gap-2">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-6 bg-gray-200 rounded w-20"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </TableCell>
  </TableRow>
)

const MobileCardSkeleton = () => (
  <div className="p-4 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-5 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
        <div className="h-3 bg-gray-200 rounded w-32"></div>
      </div>
    </div>
  </div>
)

const FiltersSkeleton = () => (
  <div className="flex flex-wrap items-center gap-4 animate-pulse">
    <div className="h-9 bg-gray-200 rounded w-64"></div>
    <div className="h-9 bg-gray-200 rounded w-48"></div>
    <div className="h-9 bg-gray-200 rounded w-56"></div>
  </div>
)

interface Conversation {
  id: number
  status: string
  assigned_to: string
  contact: {
    id: number
    name: string
    phone: string
  }
  created_at: string
  last_message?: {
    content: string
    sender_type: string
    created_at: string
  }
  pending_messages?: number
  waiting_time?: string
}

export default function ConversationsPage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const authenticatedFetch = useAuthenticatedFetch()
  const { workspaceId } = useWorkspaceContext()
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  
  // Set page title in header
  usePageTitle('Conversations')
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const realtimeConvRef = useRef<any | null>(null)
  const realtimeMsgRef = useRef<any | null>(null)
  const realtimeCallsRef = useRef<any | null>(null)
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')

  // Show loading state until we have actual data
  const showSkeletons = loading || conversations.length === 0 || !user

  // Debug logging for skeleton state
  useEffect(() => {
    console.log('🔄 Skeleton state changed:', { 
      loading, 
      conversationsLength: conversations.length, 
      showSkeletons,
      hasUser: !!user,
      timestamp: new Date().toISOString()
    })
  }, [loading, conversations.length])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (user) {
      console.log('👤 User authenticated, calling fetchConversations')
      fetchConversations(1)
    } else {
      console.log('⏳ No user yet, waiting for authentication')
    }
  }, [user])

  // Refrescar cuando cambien los filtros (sin debouncedSearchTerm)
  useEffect(() => {
    if (user) {
      setPagination(prev => ({ ...prev, page: 1 }))
      fetchConversations(1)
    }
  }, [statusFilter, assignedToFilter, user])

  // Refrescar cuando cambie el debouncedSearchTerm (solo para búsqueda automática)
  useEffect(() => {
    if (user && debouncedSearchTerm !== searchTerm) {
      setPagination(prev => ({ ...prev, page: 1 }))
      fetchConversations(1)
    }
  }, [debouncedSearchTerm, user])

  // Silent background polling every 10s
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    pollTimerRef.current = setInterval(() => {
      fetchConversations(pagination.page, true)
    }, 10000)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [pagination.page, statusFilter, assignedToFilter, debouncedSearchTerm])

  // Realtime (workspace v2): refresh silently on INSERT/UPDATE of conversations/messages/calls
  useEffect(() => {
    if (!workspaceId) return
    
    console.log('🔌 Setting up real-time subscriptions for workspace:', workspaceId)
    
    const convSub = subscribeToWorkspaceConversations(workspaceId, () => {
      console.log('📞 Conversations real-time event received')
      fetchConversations(pagination.page, true)
    })
    
    const msgSub = subscribeToWorkspaceMessages(workspaceId, () => {
      console.log('💬 Messages real-time event received')
      fetchConversations(pagination.page, true)
    })
    
    const callsSub = subscribeToWorkspaceCalls(workspaceId, (payload: any) => {
      console.log('🔔 Calls real-time event received:', payload)
      
      // Handle new call (conversation) with confetti and sound
      if (payload.eventType === 'INSERT') {
        console.log('🎉 New call INSERT detected:', payload.new)
        handleNewConversation(payload.new)
      }
      
      // Refresh conversations list
      fetchConversations(pagination.page, true)
    })
    
    console.log('✅ Real-time subscriptions created:', {
      conversations: !!convSub,
      messages: !!msgSub,
      calls: !!callsSub
    })
    
    realtimeConvRef.current = convSub
    realtimeMsgRef.current = msgSub
    realtimeCallsRef.current = callsSub
    
    return () => {
      console.log('🔌 Cleaning up real-time subscriptions')
      try { convSub.unsubscribe() } catch {}
      try { msgSub.unsubscribe() } catch {}
      try { callsSub.unsubscribe() } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, pagination.page])

  // Helper: open conversation by id using direct fetch if not in current page
  const openConversationById = useCallback(async (conversationId: number) => {
    try {
      const data = await authenticatedFetch(getApiUrl(`conversations/${conversationId}`))
      if (data?.success && data?.data) {
        setSelectedConversation(data.data)
        setChatModalOpen(true)
      }
    } catch (err) {
      console.error('Error loading conversation by id:', err)
    }
  }, [authenticatedFetch])

  // Auto-open ChatModal when URL has ?open=<id>
  useEffect(() => {
    // Read query param from the browser to avoid Suspense requirements
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const openParam = params.get('open')
    if (!openParam) return
    const id = parseInt(openParam)
    if (Number.isNaN(id)) return

    const inList = conversations.find(c => c.id === id)
    if (inList) {
      setSelectedConversation(inList)
      setChatModalOpen(true)
      return
    }
    openConversationById(id)
  }, [conversations, openConversationById])

  const conversationsSignature = (list: Conversation[]) =>
    list
      .map(c => [
        c.id,
        c.status,
        c.assigned_to,
        c.contact?.name || '',
        c.contact?.phone || '',
        c.last_message?.sender_type || '',
        c.last_message?.created_at || ''
      ].join('|'))
      .join('~')

  const setConversationsIfChanged = (next: Conversation[]) => {
    if (conversationsSignature(conversations) !== conversationsSignature(next)) {
      setConversations(next)
    }
  }

  const fetchConversations = async (pageNum = 1, silent = false) => {
    try {
      if (!silent) {
        console.log('🚀 Starting fetchConversations, setting loading to true')
        setLoading(true)
      }

      // Construir URL con filtros
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: pagination.limit.toString()
      })
      
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (assignedToFilter && assignedToFilter !== 'all') params.append('assigned_to', assignedToFilter)
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      
      logMigrationEvent('Conversations fetch', { userId: user?.id, page: pageNum, limit: pagination.limit })
      const data = await authenticatedFetch(getApiUrl(`conversations?${params.toString()}`))
      if (data.success) {
        setConversationsIfChanged(data.data || [])
        setPagination({
          page: pageNum,
          limit: pagination.limit,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || Math.ceil((data.pagination?.total || 0) / pagination.limit)
        })
      } else {
        // Fallback to all conversations
        const response = await fetch(getApiUrl(`conversations/all?page=${pageNum}&limit=${pagination.limit}`))
        if (response.ok) {
          const fallbackData = await response.json()
          if (fallbackData.success) {
            setConversationsIfChanged(fallbackData.data || [])
            setPagination({
              page: pageNum,
              limit: pagination.limit,
              total: fallbackData.pagination?.total || 0,
              totalPages: fallbackData.pagination?.totalPages || Math.ceil((fallbackData.pagination?.total || 0) / pagination.limit)
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      if (!silent) {
        console.log('✅ fetchConversations completed, setting loading to false')
        setLoading(false)
      }
    }
  }

  // Handle new conversation with confetti and sound (using existing implementation)
  const handleNewConversation = useCallback(async (newCall: any) => {
    console.log('🎉 New conversation received:', newCall)
    
    // Trigger confetti animation (using existing canvas-confetti)
    try {
      const confetti = await import('canvas-confetti')
      confetti.default({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      })
    } catch (error) {
      console.log('Confetti not available:', error)
    }
    
    // Play applause sound (using existing sound file)
    try {
      const audio = new Audio('/sounds/applause.mp3')
      audio.volume = 0.9
      await audio.play()
    } catch (error) {
      console.log('Audio not available:', error)
    }
    
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Nueva Conversación', {
        body: `Nueva conversación de ${newCall.contact?.name || 'Cliente'}`,
        icon: '/favicon.ico'
      })
    }
  }, [])

  const getStatusBadge = (status: string, conversationId: number) => {
    const statusLower = status.toLowerCase()
    
    const handleStatusChange = (newStatus: string) => {
      updateStatus(conversationId, newStatus)
    }

    const getStatusColor = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower === 'closed' || statusLower === 'closed_timeout' || statusLower === 'closed_human') {
        return 'bg-red-100 text-red-800 hover:bg-red-200'
      }
      if (statusLower === 'open') {
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      }
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    }

    const getStatusDisplay = (status: string) => {
      const statusLower = status.toLowerCase()
      if (statusLower === 'closed_timeout') return 'Closed Timeout'
      if (statusLower === 'closed_human') return 'Closed Human'
      if (statusLower === 'closed') return 'Closed'
      if (statusLower === 'open') return 'Open'
      return status
    }
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Badge className={`${getStatusColor(status)} cursor-pointer`}>
            {getStatusDisplay(status)}
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => handleStatusChange('open')}>
            <span className="text-green-600">● Open</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('closed')}>
            <span className="text-red-600">● Closed</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('closed_timeout')}>
            <span className="text-red-600">● Closed Timeout</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('closed_human')}>
            <span className="text-red-600">● Closed Human</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const getAssignedToBadge = (assignedTo: string, conversationId: number) => {
    const handleAssignedToChange = (newAssignedTo: string) => {
      updateAssignedTo(conversationId, newAssignedTo)
    }

    const getAssignedColor = (assignedTo: string) => {
    if (assignedTo === 'human') {
        return 'bg-red-100 text-red-800 hover:bg-red-200'
      }
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    }

    const getAssignedDisplay = (assignedTo: string) => {
      if (assignedTo === 'human') return 'Human'
      return 'IA'
    }
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Badge className={`${getAssignedColor(assignedTo)} cursor-pointer`}>
            {getAssignedDisplay(assignedTo)}
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => handleAssignedToChange('agent_1')}>
            <span className="text-blue-600">● IA</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAssignedToChange('human')}>
            <span className="text-red-600">● Human</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setChatModalOpen(true)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setDebouncedSearchTerm(searchTerm)
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchConversations(1)
  }

  // Helper para calcular tiempo de espera
  const calculateWaitingTime = (lastMessageDate: string) => {
    try {
      const now = new Date()
      const lastMessage = new Date(lastMessageDate)
      const diffInMinutes = Math.floor((now.getTime() - lastMessage.getTime()) / (1000 * 60))
      
      // Si es menos de 60 minutos, mostrar en minutos
      if (diffInMinutes < 60) {
        return `${diffInMinutes} min`
      }
      
      // Si es más de 60 minutos, usar formatDistanceToNow
      return formatDistanceToNow(lastMessage, { 
        addSuffix: true, 
        locale: es 
      })
    } catch (error) {
      return 'Hace un momento'
    }
  }

  // Helper para determinar si hay mensajes pendientes
  const hasPendingMessages = (conversation: Conversation) => {
    return conversation.last_message?.sender_type === 'contact' || 
           conversation.last_message?.sender_type === 'user'
  }



  // Helper para limpiar el contenido del último mensaje
  const formatLastMessageContent = (content: string) => {
    if (!content) return 'Sin contenido'
    
    try {
      // Intentar parsear si es JSON
      const parsed = JSON.parse(content)
      
      // Si tiene formato de partes
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.parte_1) {
          return parsed.parte_1.substring(0, 50) + (parsed.parte_1.length > 50 ? '...' : '')
        }
        if (parsed.text) {
          try {
            const textContent = JSON.parse(parsed.text)
            if (Array.isArray(textContent)) {
              return textContent.join(' ').substring(0, 50) + '...'
            }
            return String(textContent).substring(0, 50) + '...'
          } catch {
            return String(parsed.text).substring(0, 50) + '...'
          }
        }
      }
      
      // Si es array
      if (Array.isArray(parsed)) {
        return parsed.join(' ').substring(0, 50) + '...'
      }
      
      // Si es string parseado
      return String(parsed).substring(0, 50) + (String(parsed).length > 50 ? '...' : '')
    } catch {
      // Si no es JSON, usar como texto plano
      return content.substring(0, 50) + (content.length > 50 ? '...' : '')
    }
  }



  const updateStatus = async (conversationId: number, newStatus: string) => {
    try {
      const data = await authenticatedFetch(
        getApiUrl(`conversations/${conversationId}/status`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      )
      
      if (data.success) {
        // Actualizar la conversación en la lista
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, status: newStatus }
              : conv
          )
        )
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const updateAssignedTo = async (conversationId: number, newAssignedTo: string) => {
    try {
      const data = await authenticatedFetch(
        getApiUrl(`conversations/${conversationId}/assigned-to`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assigned_to: newAssignedTo }),
        }
      )
      
      if (data.success) {
        // Actualizar la conversación en la lista
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, assigned_to: newAssignedTo }
              : conv
          )
        )
      }
    } catch (error) {
      console.error('Error updating assigned_to:', error)
    }
  }

  const formatPhone = (phone: string) => {
    if (!phone) return phone
    
    // Remover espacios y caracteres especiales except +
    const cleaned = phone.replace(/[^\d+]/g, '')
    
    // Si empieza con +34 (España)
    if (cleaned.startsWith('+34')) {
      const number = cleaned.substring(3)
      if (number.length === 9) {
        return `+(34) ${number.substring(0, 3)}-${number.substring(3, 6)}-${number.substring(6)}`
      }
    }
    
    // Si empieza con +346 (formato incorrecto común)
    if (cleaned.startsWith('+346')) {
      const number = cleaned.substring(4)
      if (number.length >= 8) {
        return `+(34) 6${number.substring(0, 2)}-${number.substring(2, 5)}-${number.substring(5)}`
      }
    }
    
    // Formato genérico para otros países
    if (cleaned.startsWith('+') && cleaned.length > 8) {
      const countryCode = cleaned.substring(1, cleaned.indexOf('6') !== -1 ? cleaned.indexOf('6') : 3)
      const remaining = cleaned.substring(countryCode.length + 1)
      
      if (remaining.length >= 9) {
        return `+(${countryCode}) ${remaining.substring(0, 3)}-${remaining.substring(3, 6)}-${remaining.substring(6)}`
      }
    }
    
    return phone // Devolver original si no se puede formatear
  }

  return (
    <div className="flex flex-1 flex-col">
      {console.log('🔄 Rendering main table:', { 
        showSkeletons, 
        loading, 
        conversationsLength: conversations.length,
        hasUser: !!user,
        timestamp: new Date().toISOString()
      })}
      
      {/* Filters directly below header - compact spacing, no frame */}
      <div className="px-6 py-4 bg-background">
        <div className="flex items-center gap-4">
          {showSkeletons ? (
            <FiltersSkeleton />
          ) : (
            <>
              {/* Search */}
              <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por nombre o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button 
                  type="submit"
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  Search
                </Button>
              </form>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="closed_timeout">Closed Timeout</SelectItem>
                    <SelectItem value="closed_human">Closed Human</SelectItem>
                  </SelectContent>
                </Select>
            </div>

              {/* Assigned To Filter */}
              <div className="flex items-center space-x-2">
                <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los asignados</SelectItem>
                    <SelectItem value="agent_1">IA</SelectItem>
                    <SelectItem value="human">Human</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        </div>
        
      {/* Conversations Table and Pagination in a single card */}
      <div className="px-6 py-2">
        <div className="bg-white rounded-lg border shadow-sm p-4">
        {/* Mobile list */}
        <div className="sm:hidden divide-y">
          {showSkeletons ? (
            <>
              <MobileCardSkeleton />
              <MobileCardSkeleton />
              <MobileCardSkeleton />
              <MobileCardSkeleton />
              <MobileCardSkeleton />
            </>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">{loading ? 'Cargando...' : 'No hay conversaciones disponibles'}</div>
          ) : (
            conversations.map((c) => (
              <button key={c.id} className="w-full text-left p-4 flex items-start gap-3 active:bg-gray-50" onClick={() => handleConversationClick(c)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{c.contact?.name || 'Sin nombre'}</div>
                    {getStatusBadge(c.status, c.id)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">{formatPhone(c.contact?.phone)}</div>
                  <div className="text-xs text-gray-600 mt-1 truncate">
                    {c.last_message ? formatLastMessageContent(c.last_message.content) : 'Sin mensajes'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        {/* Desktop table */}
        <Table className="hidden sm:table">
          <TableHeader>
            <TableRow className="border-b border-gray-200">
              <TableHead className="text-left font-semibold text-gray-900">Contacto</TableHead>
              <TableHead className="text-left font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Teléfono
                </div>
              </TableHead>
              <TableHead className="text-left font-semibold text-gray-900">Estado</TableHead>
              <TableHead className="text-left font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Asignado a
        </div>
              </TableHead>

              <TableHead className="text-left font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Último mensaje
                </div>
              </TableHead>
              <TableHead className="text-left font-semibold text-gray-900">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tiempo espera
            </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showSkeletons ? (
              <>
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </>
            ) : conversations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  {loading ? 'Cargando...' : 'No hay conversaciones disponibles'}
                </TableCell>
              </TableRow>
            ) : (
              conversations.map((conversation, index) => (
                <TableRow 
                  key={conversation.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleConversationClick(conversation)}
                >
                  {/* Contact Name */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {conversation.contact?.name || 'Sin nombre'}
                        </span>
                        {conversation.status.toLowerCase().startsWith('closed') ? null : hasPendingMessages(conversation) && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3 text-red-500" />
                            <span className="text-xs text-red-600 font-medium">
                              Pendiente respuesta
                            </span>
                      </div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Phone */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {formatPhone(conversation.contact?.phone)}
                      </span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-4">
                    {getStatusBadge(conversation.status, conversation.id)}
                  </TableCell>

                  {/* Assigned To */}
                  <TableCell className="py-4">
                    {getAssignedToBadge(conversation.assigned_to, conversation.id)}
                  </TableCell>



                  {/* Last Message */}
                  <TableCell className="py-4">
                    <div className="max-w-xs">
                      {conversation.last_message ? (
                        <div className="text-sm text-gray-600 truncate">
                          {formatLastMessageContent(conversation.last_message.content)}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Sin mensajes</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Waiting Time */}
                  <TableCell className="py-4">
                    {conversation.status.toLowerCase().startsWith('closed') ? (
                      <span className="text-gray-400 text-sm">-</span>
                    ) : conversation.last_message && hasPendingMessages(conversation) ? (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm text-orange-600 font-medium">
                          {calculateWaitingTime(conversation.last_message.created_at)}
                        </span>
                  </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
          {/* Pagination inside the same card — match Contacts List */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchConversations(1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchConversations(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchConversations(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchConversations(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      <ChatModal
        conversation={selectedConversation}
        open={chatModalOpen}
        onOpenChange={setChatModalOpen}
        onStatusUpdated={(newStatus) => {
          if (!selectedConversation) return
          setSelectedConversation(prev => prev ? { ...prev, status: newStatus } : prev)
          setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, status: newStatus } : c))
        }}
      />
    </div>
  )
}