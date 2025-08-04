"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { X } from 'lucide-react'
import { getApiUrl, logMigrationEvent } from '@/config/features'

interface Message {
  id: number
  body: string | null
  sender: 'bot' | 'contact'
  created_at: string
}

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
}

interface ChatModalProps {
  conversation: Conversation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChatModal({ conversation, open, onOpenChange }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const authenticatedFetch = useAuthenticatedFetch()
  const router = useRouter()

  const handleContactNameClick = () => {
    if (conversation?.contact?.name) {
      // Buscar el contact_id en las conversaciones para navegar al contacto
      router.push(`/contacts/${conversation.contact.id || conversation.id}`)
    }
  }

  useEffect(() => {
    if (conversation && open) {
      fetchMessages()
    }
  }, [conversation, open])

  const fetchMessages = async () => {
    if (!conversation) return
    
    setLoading(true)
    try {
      logMigrationEvent('Chat messages fetch', { conversationId: conversation.id })
      const data = await authenticatedFetch(
        getApiUrl(`conversations/${conversation.id}/messages`)
      )
      if (data.success) {
        setMessages(data.data)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    
    if (statusLower === 'closed' || statusLower === 'closed_timeout') {
      return (
        <Badge className="bg-red-100 text-red-800">
          {statusLower === 'closed_timeout' ? 'Closed Timeout' : 'Closed'}
        </Badge>
      )
    }
    
    if (statusLower === 'open') {
      return (
        <Badge className="bg-green-100 text-green-800">
          Open
        </Badge>
      )
    }
    
    return (
      <Badge className="bg-blue-100 text-blue-800">
        {status}
      </Badge>
    )
  }

  const getAssignedBadge = (assignedTo: string) => {
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
      <Badge className={getAssignedColor(assignedTo)}>
        {getAssignedDisplay(assignedTo)}
      </Badge>
    )
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatMessageContent = (body: string | null) => {
    // Verificar que body no sea null o undefined
    if (!body) {
      return ''
    }
    
    try {
      // Intentar parsear como JSON
      const parsed = JSON.parse(body)
      
      // Si es un objeto con campo "text", extraer el texto primero
      if (typeof parsed === 'object' && parsed !== null && parsed.text) {
        try {
          // Intentar parsear el campo text como JSON
          const textContent = JSON.parse(parsed.text)
          
          // Si text contiene un array
          if (Array.isArray(textContent)) {
            return textContent
              .filter(item => item != null)
              .map(item => String(item))
              .join('\n')
              .replace(/\\n/g, '\n')
              .trim()
          }
          
          // Si text contiene un objeto con partes
          if (typeof textContent === 'object' && textContent !== null) {
            const parts = []
            const keys = Object.keys(textContent).sort()
            for (const key of keys) {
              if (key.startsWith('parte_') && textContent[key]) {
                parts.push(textContent[key])
              }
            }
            
            if (parts.length > 0) {
              return parts.join('\n\n')
                .replace(/\\n/g, '\n')
                .trim()
            }
          }
          
          // Si text es un string simple
          return String(textContent).replace(/\\n/g, '\n').trim()
        } catch (innerError) {
          // Si text no es JSON válido, devolverlo como string
          return String(parsed.text).replace(/\\n/g, '\n').trim()
        }
      }
      
      // Si es un array directo (como los mensajes de contacto)
      if (Array.isArray(parsed)) {
        // Si solo tiene un elemento, devolver ese elemento
        if (parsed.length === 1) {
          const item = parsed[0]
          return item ? String(item).replace(/\\n/g, '\n').trim() : ''
        }
        // Si tiene múltiples elementos, unirlos con salto de línea
        return parsed
          .filter(item => item != null) // Filtrar null/undefined
          .map(item => String(item))
          .join('\n')
          .replace(/\\n/g, '\n')
          .trim()
      }
      
      // Si es un objeto con partes (parte_1, parte_2, etc.)
      if (typeof parsed === 'object' && parsed !== null) {
        const parts = []
        
        // Buscar todas las partes ordenadas
        const keys = Object.keys(parsed).sort()
        for (const key of keys) {
          if (key.startsWith('parte_') && parsed[key]) {
            parts.push(parsed[key])
          }
        }
        
        if (parts.length > 0) {
          // Unir las partes y formatear
          return parts.join('\n\n')
            .replace(/\\n/g, '\n') // Convertir \n literales a saltos de línea
            .trim()
        }
        
        // Si no tiene partes, pero es un objeto, devolver como JSON formateado
        return JSON.stringify(parsed, null, 2)
      }
      
      // Si es un string simple dentro de JSON
      return parsed ? String(parsed).replace(/\\n/g, '\n').trim() : ''
    } catch (error) {
      // Si no es JSON válido, devolver tal como está pero procesando \n
      return body ? body.replace(/\\n/g, '\n') : ''
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[45vw] min-w-[400px] max-w-[800px]">
        {conversation && (
          <>
            <SheetHeader className="space-y-3 px-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-8">
                  <SheetTitle 
                    className="text-lg font-semibold mb-2 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={handleContactNameClick}
                  >
                    {conversation.contact?.name || 'Sin nombre'}
                  </SheetTitle>
                  <div className="flex gap-2">
                    {getStatusBadge(conversation.status)}
                    {getAssignedBadge(conversation.assigned_to)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SheetDescription className="text-left">
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">
                    📱 {conversation.contact?.phone || 'Sin teléfono'}
                  </div>
                  <div className="text-sm text-gray-600">
                    🕒 Started: {formatTime(conversation.created_at)}
                  </div>
                  <div className="text-sm text-gray-600">
                    🆔 ID: {conversation.id}
                  </div>
                </div>
              </SheetDescription>
            </SheetHeader>

            {/* Chat Messages */}
            <div className="flex flex-col h-[calc(100vh-200px)] mt-6">
              <div className="flex-1 overflow-y-auto space-y-4 px-4 pb-6">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No hay mensajes en esta conversación
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender === 'bot' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.sender === 'bot'
                            ? 'bg-gray-100 text-gray-900'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-line">
                          {formatMessageContent(message.body)}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            message.sender === 'bot'
                              ? 'text-gray-500'
                              : 'text-blue-100'
                          }`}
                        >
                          {message.sender === 'bot' ? '🤖 Bot' : '👤 Cliente'} • {formatTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}