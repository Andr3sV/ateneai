'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback } from 'react'

export const useAuthenticatedFetch = () => {
  const { getToken } = useAuth()

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      const token = await getToken()
      
      if (!token) {
        throw new Error('No authentication token available')
      }

      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      }

      const response = await fetch(url, {
        ...options,
        headers: authHeaders,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error('Authenticated fetch error:', error)
      throw error
    }
  }, [getToken])

  return authenticatedFetch
}