'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback } from 'react'

export const useAuthenticatedFetch = () => {
  const { getToken } = useAuth()

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit & { muteErrors?: boolean } = {}) => {
    try {
      const token = await getToken()
      
      if (!token) {
        throw new Error('No authentication token available')
      }

      const { muteErrors, ...fetchOptions } = options as any

      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      }

      const apiUrl = url.startsWith('http')
        ? url
        : `${process.env.NEXT_PUBLIC_API_URL || ''}${url}`

      const response = await fetch(apiUrl, {
        ...fetchOptions,
        headers: authHeaders,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (muteErrors) {
          return { success: false, status: response.status, error: errorData.error || response.statusText }
        }
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      const shouldMute = (options as any)?.muteErrors
      if (!shouldMute) {
        console.error('Authenticated fetch error:', error)
      }
      throw error
    }
  }, [getToken])

  return authenticatedFetch
}