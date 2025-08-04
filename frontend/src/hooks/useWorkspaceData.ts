'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspaceApi, useWorkspaceId } from './useWorkspaceContext'
import type { Contact, Conversation, Message } from '@/types'

// Hook for workspace-scoped contacts
export const useWorkspaceContacts = (filters?: {
  status?: string
  search?: string
  page?: number
  limit?: number
}) => {
  const workspaceApi = useWorkspaceApi()
  const workspaceId = useWorkspaceId()
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    hasMore: boolean
  }>({
    page: 1,
    limit: 20,
    hasMore: false
  })

  const fetchContacts = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      
      const query = params.toString() ? `?${params.toString()}` : ''
      const response = await workspaceApi(`/contacts${query}`)
      
      if (response.success) {
        setContacts(response.data)
        setPagination(response.pagination || {
          page: filters?.page || 1,
          limit: filters?.limit || 20,
          hasMore: false
        })
      } else {
        throw new Error(response.error || 'Failed to fetch contacts')
      }
    } catch (err) {
      console.error('Error fetching workspace contacts:', err)
      setError(err instanceof Error ? err.message : 'Error fetching contacts')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, workspaceApi, filters])

  const createContact = useCallback(async (contactData: Partial<Contact>) => {
    if (!workspaceId) throw new Error('No workspace context')

    try {
      setLoading(true)
      setError(null)
      
      const response = await workspaceApi('/contacts', {
        method: 'POST',
        body: JSON.stringify(contactData)
      })
      
      if (response.success) {
        setContacts(prev => [response.data, ...prev])
        return response.data
      } else {
        throw new Error(response.error || 'Failed to create contact')
      }
    } catch (err) {
      console.error('Error creating contact:', err)
      setError(err instanceof Error ? err.message : 'Error creating contact')
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId, workspaceApi])

  const updateContact = useCallback(async (contactId: number, updates: Partial<Contact>) => {
    if (!workspaceId) throw new Error('No workspace context')

    try {
      setLoading(true)
      setError(null)
      
      const response = await workspaceApi(`/contacts/${contactId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })
      
      if (response.success) {
        setContacts(prev => prev.map(contact => 
          contact.id === contactId ? response.data : contact
        ))
        return response.data
      } else {
        throw new Error(response.error || 'Failed to update contact')
      }
    } catch (err) {
      console.error('Error updating contact:', err)
      setError(err instanceof Error ? err.message : 'Error updating contact')
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId, workspaceApi])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return {
    contacts,
    loading,
    error,
    pagination,
    refetch: fetchContacts,
    createContact,
    updateContact,
  }
}

// Hook for workspace-scoped conversations
export const useWorkspaceConversations = (filters?: {
  status?: string
  assigned_to?: string
  page?: number
  limit?: number
}) => {
  const workspaceApi = useWorkspaceApi()
  const workspaceId = useWorkspaceId()
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    hasMore: boolean
  }>({
    page: 1,
    limit: 20,
    hasMore: false
  })

  const fetchConversations = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to)
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      
      const query = params.toString() ? `?${params.toString()}` : ''
      const response = await workspaceApi(`/conversations${query}`)
      
      if (response.success) {
        setConversations(response.data)
        setPagination(response.pagination || {
          page: filters?.page || 1,
          limit: filters?.limit || 20,
          hasMore: false
        })
      } else {
        throw new Error(response.error || 'Failed to fetch conversations')
      }
    } catch (err) {
      console.error('Error fetching workspace conversations:', err)
      setError(err instanceof Error ? err.message : 'Error fetching conversations')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, workspaceApi, filters])

  const updateConversationStatus = useCallback(async (conversationId: number, status: string) => {
    if (!workspaceId) throw new Error('No workspace context')

    try {
      const response = await workspaceApi(`/conversations/${conversationId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      })
      
      if (response.success) {
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId ? { ...conv, status } : conv
        ))
        return response.data
      } else {
        throw new Error(response.error || 'Failed to update conversation')
      }
    } catch (err) {
      console.error('Error updating conversation status:', err)
      throw err
    }
  }, [workspaceId, workspaceApi])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  return {
    conversations,
    loading,
    error,
    pagination,
    refetch: fetchConversations,
    updateConversationStatus,
  }
}

// Hook for workspace-scoped conversation detail
export const useWorkspaceConversation = (conversationId?: number) => {
  const workspaceApi = useWorkspaceApi()
  const workspaceId = useWorkspaceId()
  
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversation = useCallback(async () => {
    if (!workspaceId || !conversationId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await workspaceApi(`/conversations/${conversationId}`)
      
      if (response.success) {
        setConversation(response.data)
        setMessages(response.data.messages || [])
      } else {
        throw new Error(response.error || 'Failed to fetch conversation')
      }
    } catch (err) {
      console.error('Error fetching workspace conversation:', err)
      setError(err instanceof Error ? err.message : 'Error fetching conversation')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, conversationId, workspaceApi])

  const sendMessage = useCallback(async (content: string, role: 'user' | 'assistant' = 'user') => {
    if (!workspaceId || !conversationId) throw new Error('No workspace context or conversation')

    try {
      const messageData = {
        content,
        role,
        metadata: {}
      }
      
      const response = await workspaceApi(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(messageData)
      })
      
      if (response.success) {
        setMessages(prev => [...prev, response.data])
        return response.data
      } else {
        throw new Error(response.error || 'Failed to send message')
      }
    } catch (err) {
      console.error('Error sending message:', err)
      throw err
    }
  }, [workspaceId, conversationId, workspaceApi])

  useEffect(() => {
    fetchConversation()
  }, [fetchConversation])

  return {
    conversation,
    messages,
    loading,
    error,
    refetch: fetchConversation,
    sendMessage,
  }
}

// Hook for workspace-scoped dashboard analytics
export const useWorkspaceDashboard = (filters?: {
  start_date?: string
  end_date?: string
}) => {
  const workspaceApi = useWorkspaceApi()
  const workspaceId = useWorkspaceId()
  
  const [stats, setStats] = useState<any>(null)
  const [conversationsEvolution, setConversationsEvolution] = useState<any[]>([])
  const [contactsEvolution, setContactsEvolution] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardStats = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filters?.start_date) params.append('start_date', filters.start_date)
      if (filters?.end_date) params.append('end_date', filters.end_date)
      
      const query = params.toString() ? `?${params.toString()}` : ''
      const response = await workspaceApi(`/analytics/dashboard${query}`)
      
      if (response.success) {
        setStats(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch dashboard stats')
      }
    } catch (err) {
      console.error('Error fetching workspace dashboard:', err)
      setError(err instanceof Error ? err.message : 'Error fetching dashboard')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, workspaceApi, filters])

  const fetchEvolutionData = useCallback(async (type: 'conversations' | 'contacts', period: 'daily' | 'monthly' | 'yearly') => {
    if (!workspaceId) return

    try {
      const params = new URLSearchParams()
      params.append('period', period)
      if (filters?.start_date) params.append('start_date', filters.start_date)
      if (filters?.end_date) params.append('end_date', filters.end_date)
      
      const query = params.toString() ? `?${params.toString()}` : ''
      const response = await workspaceApi(`/analytics/${type}-evolution${query}`)
      
      if (response.success) {
        if (type === 'conversations') {
          setConversationsEvolution(response.data)
        } else {
          setContactsEvolution(response.data)
        }
      }
    } catch (err) {
      console.error(`Error fetching ${type} evolution:`, err)
    }
  }, [workspaceId, workspaceApi, filters])

  useEffect(() => {
    fetchDashboardStats()
  }, [fetchDashboardStats])

  return {
    stats,
    conversationsEvolution,
    contactsEvolution,
    loading,
    error,
    refetch: fetchDashboardStats,
    fetchEvolutionData,
  }
}