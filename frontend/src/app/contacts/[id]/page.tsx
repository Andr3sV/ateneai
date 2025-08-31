"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Instagram, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  Edit3,
  Save,
  X,
  ExternalLink,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  User
} from "lucide-react"
import { format } from 'date-fns'
import { ChatModal } from '@/components/chat-modal'
import { CallModal } from '@/components/call-modal'
import { TaskModal } from '@/components/task-modal'
import { getApiUrl, logMigrationEvent } from '@/config/features'

// Task Skeleton Component for loading state
const TaskSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex items-center justify-between p-4 border rounded-lg mb-3">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-20"></div>
    </div>
  </div>
)

interface Contact {
  id: number
  name: string
  phone: string
  email?: string
  status: 'Lead' | 'MQL' | 'Client' | null
  country: string
  instagram_url: string
  instagram_id?: string
  instagram_followers?: string
  created_at: string
  last_interaction?: string
}

interface Conversation {
  id: number
  contact_id: number
  status: string
  created_at: string
  assigned_to: string | null
  contact: Contact
  message_count?: number
  last_message?: string
}

// Country flags mapping (same as in main contacts page)
const getCountryFlag = (country: string): string => {
  if (!country) return '🌍'
  
  const flags: Record<string, string> = {
    'Argentina': '🇦🇷', 'Brazil': '🇧🇷', 'Chile': '🇨🇱', 'Colombia': '🇨🇴',
    'Ecuador': '🇪🇨', 'Mexico': '🇲🇽', 'Peru': '🇵🇪', 'Uruguay': '🇺🇾',
    'Venezuela': '🇻🇪', 'United States': '🇺🇸', 'USA': '🇺🇸', 'Canada': '🇨🇦',
    'Spain': '🇪🇸', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Italy': '🇮🇹',
    'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'Portugal': '🇵🇹'
  }
  
  if (flags[country]) return flags[country]
  
  const lowerCountry = country.toLowerCase()
  for (const [key, flag] of Object.entries(flags)) {
    if (key.toLowerCase() === lowerCountry) return flag
  }
  
  return '🌍'
}

// Status styling
const getStatusStyle = (status: Contact['status']) => {
  switch (status) {
    case 'Lead':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'MQL':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'Client':
      return 'bg-green-50 text-green-700 border-green-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

const getConversationStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'open':
      return <AlertCircle className="h-4 w-4 text-blue-500" />
    case 'closed':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
}

const getAssignedToIcon = (assignedTo: string | null) => {
  if (assignedTo === 'human') {
    return <User className="h-3 w-3 text-orange-500" />
  }
  return <MessageSquare className="h-3 w-3 text-blue-500" />
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const authenticatedFetch = useAuthenticatedFetch()
  
  const contactId = params.id as string
  
  // State
  const [contact, setContact] = useState<Contact | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [calls, setCalls] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [isChatModalOpen, setIsChatModalOpen] = useState(false)
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null)
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    status: '' as Contact['status'],
    country: '',
    instagram_url: ''
  })

  // Fetch contact details
  const fetchContact = useCallback(async () => {
    try {
      logMigrationEvent('Contact detail fetch', { contactId })
      const data = await authenticatedFetch(getApiUrl(`contacts/${contactId}`))
      if (data.success) {
        setContact(data.data)
        setEditFormData({
          name: data.data.name || '',
          phone: data.data.phone || '',
          email: data.data.email || '',
          status: data.data.status || 'Lead',
          country: data.data.country || '',
          instagram_url: data.data.instagram_url || ''
        })
      }
    } catch (error) {
      console.error('Error fetching contact:', error)
    } finally {
      setLoading(false)
    }
  }, [contactId, authenticatedFetch])

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    setConversationsLoading(true)
    try {
      logMigrationEvent('Contact conversations fetch', { contactId })
      const data = await authenticatedFetch(getApiUrl(`contacts/${contactId}/conversations`))
      console.log('📡 Contact conversations API response:', data)
      if (data.success) {
        console.log('✅ Conversations data:', data.data)
        // Fix: Extract the actual array from data.data.data
        const conversationsArray = data.data?.data || data.data || []
        console.log('✅ Conversations array to set:', conversationsArray)
        setConversations(conversationsArray)
      } else {
        console.error('❌ API returned success: false:', data)
      }
    } catch (error) {
      console.error('❌ Error fetching conversations:', error)
    } finally {
      setConversationsLoading(false)
    }
  }, [contactId, authenticatedFetch])

  const fetchCallsAndTasks = useCallback(async () => {
    try {
      console.log('🔍 Fetching calls and tasks for contact:', contactId)
      
      // Set loading state for tasks
      setTasksLoading(true)
      
      // Fetch calls and tasks in parallel for better performance
      const [callsResp, tasksResp] = await Promise.all([
        authenticatedFetch(getApiUrl(`calls?contact_id=${contactId}&limit=50`), { muteErrors: true } as any),
        authenticatedFetch(getApiUrl(`tasks/by-contact/${contactId}`), { muteErrors: true } as any)
      ])
      
      console.log('📞 Calls response:', callsResp)
      console.log('📋 Tasks response:', tasksResp)
      
      // Set calls
      setCalls(callsResp?.success ? (callsResp.data || []) : [])
      
      // Set tasks - use only the efficient endpoint
      if (tasksResp?.success && Array.isArray(tasksResp.data)) {
        console.log('✅ Tasks found:', tasksResp.data.length)
        setTasks(tasksResp.data)
      } else {
        console.log('📋 No tasks found, setting empty array')
        setTasks([])
      }
      
    } catch (error) {
      console.error('❌ Error fetching calls/tasks:', error)
      setCalls([])
      setTasks([])
    } finally {
      setTasksLoading(false)
    }
  }, [contactId, authenticatedFetch])

  useEffect(() => {
    fetchContact()
    fetchConversations()
    fetchCallsAndTasks()
  }, [fetchContact, fetchConversations, fetchCallsAndTasks])

  // Debug: Log state changes (avoid referencing interactions before initialization)
  useEffect(() => {
    console.log('🔄 Conversations state updated:', conversations)
    console.log('📞 Calls state updated:', calls)
    console.log('📋 Tasks state updated:', tasks)
  }, [conversations, calls, tasks])

  // Handle edit
  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (contact) {
      setEditFormData({
        name: contact.name || '',
        phone: contact.phone || '',
        email: contact.email || '',
        status: contact.status || 'Lead',
        country: contact.country || '',
        instagram_url: contact.instagram_url || ''
      })
    }
  }

  const handleSaveEdit = async () => {
    try {
      console.log('🔄 Updating contact:', { contactId, editFormData })
      const data = await authenticatedFetch(getApiUrl(`contacts/${contactId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      })
      
      console.log('📡 Update contact response:', data)
      
      if (data.success) {
        console.log('✅ Contact updated successfully:', data.data)
        setContact(data.data)
        setIsEditing(false)
      } else {
        console.error('❌ Failed to update contact:', data)
        alert('Error updating contact: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('❌ Error updating contact:', error)
      alert('Error updating contact: ' + error.message)
    }
  }

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setIsChatModalOpen(true)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy • HH:mm')
  }

  const getInstagramHandle = (url: string) => {
    if (!url) return null
    const match = url.match(/instagram\.com\/([^/?]+)/)
    return match ? `@${match[1]}` : url
  }

  // Build unified interactions list sorted by most recent first
  const interactions = useMemo(() => {
    type Interaction = { id: number; type: 'message' | 'call' | 'task'; date: string; payload: any }
    const items: Interaction[] = []
    if (Array.isArray(conversations)) {
      for (const c of conversations) {
        if (c?.created_at) items.push({ id: c.id, type: 'message', date: c.created_at, payload: c })
      }
    }
    if (Array.isArray(calls)) {
      for (const cl of calls) {
        if (cl?.created_at) items.push({ id: cl.id, type: 'call', date: cl.created_at, payload: cl })
      }
    }
    if (Array.isArray(tasks)) {
      for (const t of tasks) {
        const when = t?.due_date || t?.created_at
        if (when) items.push({ id: t.id, type: 'task', date: when, payload: t })
      }
    }
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [conversations, calls, tasks])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading contact details...</div>
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Contact not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{contact.name || 'Unnamed Contact'}</h1>
          </div>
        </div>
        
        {!isEditing ? (
          <Button onClick={handleEdit} variant="outline">
            <Edit3 className="h-4 w-4 mr-2" />
            Edit Contact
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSaveEdit} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleCancelEdit} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                {isEditing ? (
                  <Input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contact name"
                  />
                ) : (
                  <div className="text-sm font-medium">{contact.name || 'No name provided'}</div>
                )}
              </div>

              <Separator />

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone
                </Label>
                {isEditing ? (
                  <Input
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                ) : (
                  <div className="text-sm">{contact.phone || 'No phone provided'}</div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </Label>
                {isEditing ? (
                  <Input
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                    type="email"
                  />
                ) : (
                  <div className="text-sm">{contact.email || 'No email provided'}</div>
                )}
              </div>

              <Separator />

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                {isEditing ? (
                  <Select
                    value={editFormData.status || 'Lead'}
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value as Contact['status'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="MQL">MQL</SelectItem>
                      <SelectItem value="Client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={getStatusStyle(contact.status)}>
                    {contact.status || 'Unknown'}
                  </Badge>
                )}
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Country
                </Label>
                {isEditing ? (
                  <Input
                    value={editFormData.country}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="Country"
                  />
                ) : (
                  <div className="text-sm flex items-center gap-2">
                    <span>{getCountryFlag(contact.country)}</span>
                    {contact.country || 'No country provided'}
                  </div>
                )}
              </div>

              {/* Instagram */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Instagram className="h-3 w-3" />
                  Instagram
                </Label>
                {isEditing ? (
                  <Input
                    value={editFormData.instagram_url}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, instagram_url: e.target.value }))}
                    placeholder="Instagram URL"
                  />
                ) : contact.instagram_url ? (
                  <a
                    href={contact.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {getInstagramHandle(contact.instagram_url)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <div className="text-sm text-muted-foreground">No Instagram provided</div>
                )}
              </div>

              <Separator />

              {/* Created Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created
                </Label>
                <div className="text-sm">{formatDate(contact.created_at)}</div>
              </div>

              {/* Last Interaction */}
              {contact.last_interaction && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last Activity
                  </Label>
                  <div className="text-sm">{formatDate(contact.last_interaction)}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Conversations */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Interactions
                {interactions.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {interactions.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Messages, calls and tasks for this contact
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conversationsLoading || tasksLoading ? (
                <div className="space-y-3">
                  {/* Show skeleton loaders while loading */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TaskSkeleton key={i} />
                  ))}
                </div>
              ) : interactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <div className="text-lg font-medium mb-2">No conversations yet</div>
                  <div className="text-muted-foreground">
                    When this contact starts a conversation, it will appear here.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {interactions.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => {
                        if (item.type === 'message') {
                          handleConversationClick(item.payload as Conversation)
                        } else if (item.type === 'call') {
                          setSelectedCallId(item.payload.id)
                          setIsCallModalOpen(true)
                        } else if (item.type === 'task') {
                          setSelectedTask(item.payload)
                          setIsTaskModalOpen(true)
                        }
                      }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {item.type === 'message' && (
                          <div className="flex items-center gap-2">
                            {getConversationStatusIcon((item.payload as Conversation).status)}
                            <span className="px-2 py-0.5 text-[10px] rounded bg-gray-100 text-gray-800">Message</span>
                          </div>
                        )}
                        {item.type === 'call' && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-emerald-600" />
                            <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-800">Call</span>
                            <span className="text-xs text-gray-700">{item.payload.status ? String(item.payload.status).toUpperCase() : '—'}</span>
                          </div>
                        )}
                        {item.type === 'task' && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                            <span className="px-2 py-0.5 text-[10px] rounded bg-blue-100 text-blue-800">Task</span>
                            <span className="text-xs text-gray-700">{item.payload.title}</span>
                          </div>
                        )}

                        <Separator orientation="vertical" className="h-4" />

                        {item.type === 'message' && (
                          <div className="flex items-center gap-2">
                            {getAssignedToIcon((item.payload as Conversation).assigned_to)}
                            <span className="text-xs text-muted-foreground">
                              {(item.payload as Conversation).assigned_to === 'human' ? 'Human' : 'AI Assistant'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.date)}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chat Modal */}
      {selectedConversation && (
        <ChatModal
          conversation={selectedConversation}
          open={isChatModalOpen}
          onOpenChange={setIsChatModalOpen}
        />
      )}

      {/* Call Modal */}
      <CallModal
        callId={selectedCallId}
        open={isCallModalOpen}
        onOpenChange={setIsCallModalOpen}
      />

      {/* Task Modal */}
      <TaskModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        task={selectedTask}
        initialContacts={contact ? [{ id: contact.id, name: contact.name || contact.phone || `Contact ${contact.id}` }] : []}
        onSaved={() => setIsTaskModalOpen(false)}
      />
    </div>
  )
}