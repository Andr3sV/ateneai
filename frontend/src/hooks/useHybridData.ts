'use client'

import { FEATURE_FLAGS, logMigrationEvent } from '@/config/features'
import { useWorkspaceContacts, useWorkspaceConversations, useWorkspaceDashboard } from './useWorkspaceData'
import { useAuthenticatedFetch } from './useAuthenticatedFetch'
import { useUser } from '@clerk/nextjs'
import { useState, useEffect, useCallback } from 'react'

// Hybrid hook for contacts - can use workspace or legacy system
export const useHybridContacts = (filters?: {
  status?: string
  search?: string
  page?: number
  limit?: number
}) => {
  const workspaceResult = useWorkspaceContacts(filters)
  const authenticatedFetch = useAuthenticatedFetch()
  const { user } = useUser()
  
  const [legacyContacts, setLegacyContacts] = useState<any[]>([])
  const [legacyLoading, setLegacyLoading] = useState(true)
  const [legacyError, setLegacyError] = useState<string | null>(null)
  const [legacyPagination, setLegacyPagination] = useState<any>({
    page: 1,
    limit: 20,
    hasMore: false
  })

  const fetchLegacyContacts = useCallback(async () => {
    if (!user?.id) {
      setLegacyLoading(false)
      return
    }

    try {
      setLegacyLoading(true)
      setLegacyError(null)
      
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      
      const query = params.toString() ? `?${params.toString()}` : ''
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/contacts${query}`)
      
      setLegacyContacts(response.data || [])
      setLegacyPagination(response.pagination || {
        page: filters?.page || 1,
        limit: filters?.limit || 20,
        hasMore: false
      })
    } catch (err) {
      console.error('Error fetching legacy contacts:', err)
      setLegacyError(err instanceof Error ? err.message : 'Error fetching contacts')
    } finally {
      setLegacyLoading(false)
    }
  }, [user?.id, authenticatedFetch, filters])

  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_WORKSPACE_SYSTEM) {
      fetchLegacyContacts()
    }
  }, [fetchLegacyContacts])

  // Return appropriate data based on feature flag
  if (FEATURE_FLAGS.ENABLE_WORKSPACE_SYSTEM) {
    logMigrationEvent('Using workspace contacts system')
    return {
      ...workspaceResult,
      isWorkspaceSystem: true
    }
  } else {
    logMigrationEvent('Using legacy contacts system')
    return {
      contacts: legacyContacts,
      loading: legacyLoading,
      error: legacyError,
      pagination: legacyPagination,
      refetch: fetchLegacyContacts,
      createContact: async () => { throw new Error('Legacy create not implemented') },
      updateContact: async () => { throw new Error('Legacy update not implemented') },
      isWorkspaceSystem: false
    }
  }
}

// Hybrid hook for conversations
export const useHybridConversations = (filters?: {
  status?: string
  assigned_to?: string
  page?: number
  limit?: number
}) => {
  const workspaceResult = useWorkspaceConversations(filters)
  const authenticatedFetch = useAuthenticatedFetch()
  const { user } = useUser()
  
  const [legacyConversations, setLegacyConversations] = useState<any[]>([])
  const [legacyLoading, setLegacyLoading] = useState(true)
  const [legacyError, setLegacyError] = useState<string | null>(null)
  const [legacyPagination, setLegacyPagination] = useState<any>({
    page: 1,
    limit: 20,
    hasMore: false
  })

  const fetchLegacyConversations = useCallback(async () => {
    if (!user?.id) {
      setLegacyLoading(false)
      return
    }

    try {
      setLegacyLoading(true)
      setLegacyError(null)
      
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to)
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      
      const query = params.toString() ? `?${params.toString()}` : ''
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/conversations${query}`)
      
      setLegacyConversations(response.data || [])
      setLegacyPagination(response.pagination || {
        page: filters?.page || 1,
        limit: filters?.limit || 20,
        hasMore: false
      })
    } catch (err) {
      console.error('Error fetching legacy conversations:', err)
      setLegacyError(err instanceof Error ? err.message : 'Error fetching conversations')
    } finally {
      setLegacyLoading(false)
    }
  }, [user?.id, authenticatedFetch, filters])

  const updateLegacyConversationStatus = useCallback(async (conversationId: number, status: string) => {
    try {
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/conversations/${conversationId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      })
      
      setLegacyConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, status } : conv
      ))
      return response
    } catch (err) {
      console.error('Error updating legacy conversation status:', err)
      throw err
    }
  }, [authenticatedFetch])

  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_WORKSPACE_SYSTEM) {
      fetchLegacyConversations()
    }
  }, [fetchLegacyConversations])

  // Return appropriate data based on feature flag
  if (FEATURE_FLAGS.ENABLE_WORKSPACE_SYSTEM) {
    logMigrationEvent('Using workspace conversations system')
    return {
      ...workspaceResult,
      isWorkspaceSystem: true
    }
  } else {
    logMigrationEvent('Using legacy conversations system')
    return {
      conversations: legacyConversations,
      loading: legacyLoading,
      error: legacyError,
      pagination: legacyPagination,
      refetch: fetchLegacyConversations,
      updateConversationStatus: updateLegacyConversationStatus,
      isWorkspaceSystem: false
    }
  }
}

// Hybrid hook for dashboard
export const useHybridDashboard = (filters?: {
  start_date?: string
  end_date?: string
}) => {
  const workspaceResult = useWorkspaceDashboard(filters)
  const authenticatedFetch = useAuthenticatedFetch()
  const { user } = useUser()
  
  const [legacyStats, setLegacyStats] = useState<any>(null)
  const [legacyLoading, setLegacyLoading] = useState(true)
  const [legacyError, setLegacyError] = useState<string | null>(null)

  const fetchLegacyDashboard = useCallback(async () => {
    if (!user?.id) {
      setLegacyLoading(false)
      return
    }

    try {
      setLegacyLoading(true)
      setLegacyError(null)
      
      const params = new URLSearchParams()
      if (filters?.start_date) params.append('start_date', filters.start_date)
      if (filters?.end_date) params.append('end_date', filters.end_date)
      
      const query = params.toString() ? `?${params.toString()}` : ''
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/analytics${query}`)
      
      setLegacyStats(response.data || null)
    } catch (err) {
      console.error('Error fetching legacy dashboard:', err)
      setLegacyError(err instanceof Error ? err.message : 'Error fetching dashboard')
    } finally {
      setLegacyLoading(false)
    }
  }, [user?.id, authenticatedFetch, filters])

  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_WORKSPACE_SYSTEM) {
      fetchLegacyDashboard()
    }
  }, [fetchLegacyDashboard])

  // Return appropriate data based on feature flag
  if (FEATURE_FLAGS.ENABLE_WORKSPACE_SYSTEM) {
    logMigrationEvent('Using workspace dashboard system')
    return {
      ...workspaceResult,
      isWorkspaceSystem: true
    }
  } else {
    logMigrationEvent('Using legacy dashboard system')
    return {
      stats: legacyStats,
      conversationsEvolution: [],
      contactsEvolution: [],
      loading: legacyLoading,
      error: legacyError,
      refetch: fetchLegacyDashboard,
      fetchEvolutionData: async () => {},
      isWorkspaceSystem: false
    }
  }
}