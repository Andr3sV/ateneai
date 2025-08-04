'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useCallback, useState, useEffect, createContext, useContext } from 'react'

// Types for workspace context
export interface WorkspaceUser {
  id: number
  email: string
  clerk_user_id: string
  first_name?: string
  last_name?: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface Workspace {
  id: number
  name: string
  domain: string
  slug: string
  created_at: string
  updated_at: string
  settings: Record<string, any>
  is_active: boolean
}

export interface WorkspaceContextData {
  user: WorkspaceUser | null
  workspace: Workspace | null
  workspaceId: number | null
  userId: number | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Context for workspace data
const WorkspaceContext = createContext<WorkspaceContextData | undefined>(undefined)

// Hook to use workspace context
export const useWorkspaceContext = (): WorkspaceContextData => {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider')
  }
  return context
}

// Hook for authenticated API calls to workspace endpoints
export const useWorkspaceApi = () => {
  const { getToken } = useAuth()

  const workspaceApiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      const token = await getToken()
      
      if (!token) {
        throw new Error('No authentication token available')
      }

      // Use v2 API endpoints for workspace-based calls
      const apiUrl = url.startsWith('/api/') 
        ? `${process.env.NEXT_PUBLIC_API_URL}${url.replace('/api/', '/api/v2/')}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v2${url}`

      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      }

      console.log(`🏢 Workspace API call: ${apiUrl}`)

      const response = await fetch(apiUrl, {
        ...options,
        headers: authHeaders,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(`❌ Workspace API error:`, errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`✅ Workspace API success:`, result.success !== false)
      return result
    } catch (error) {
      console.error('Workspace API fetch error:', error)
      throw error
    }
  }, [getToken])

  return workspaceApiFetch
}

// Provider component for workspace context
export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth()
  const { user: clerkUser } = useUser()
  const workspaceApi = useWorkspaceApi()
  
  const [user, setUser] = useState<WorkspaceUser | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkspaceContext = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !clerkUser) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      console.log('🏢 Fetching workspace context for user:', clerkUser.id)
      
      // Get user and workspace info
      const response = await workspaceApi('/auth/user')
      
      if (response.success) {
        setUser(response.data.user)
        setWorkspace(response.data.workspace)
        console.log('✅ Workspace context loaded:', {
          workspaceId: response.data.workspace.id,
          userId: response.data.user.id
        })
      } else {
        throw new Error(response.error || 'Failed to load workspace context')
      }
    } catch (err) {
      console.error('❌ Error fetching workspace context:', err)
      setError(err instanceof Error ? err.message : 'Error loading workspace context')
    } finally {
      setLoading(false)
    }
  }, [isLoaded, isSignedIn, clerkUser, workspaceApi])

  useEffect(() => {
    fetchWorkspaceContext()
  }, [fetchWorkspaceContext])

  const contextValue: WorkspaceContextData = {
    user,
    workspace,
    workspaceId: workspace?.id || null,
    userId: user?.id || null,
    loading,
    error,
    refetch: fetchWorkspaceContext,
  }

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  )
}

// Convenience hook for getting workspace ID
export const useWorkspaceId = (): number | null => {
  const { workspaceId } = useWorkspaceContext()
  return workspaceId
}

// Convenience hook for getting user ID
export const useWorkspaceUserId = (): number | null => {
  const { userId } = useWorkspaceContext()
  return userId
}