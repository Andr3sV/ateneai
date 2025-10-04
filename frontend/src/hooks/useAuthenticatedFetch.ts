'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback } from 'react'

export const useAuthenticatedFetch = () => {
  const { getToken } = useAuth()

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit & { muteErrors?: boolean; retries?: number; signal?: AbortSignal } = {}) => {
    try {
      const token = await getToken()
      
      if (!token) {
        throw new Error('No authentication token available')
      }

      const { muteErrors, retries = 2, ...fetchOptions } = options as any

      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      }

      const apiUrl = url.startsWith('http')
        ? url
        : `${process.env.NEXT_PUBLIC_API_URL || ''}${url}`

      // Simple in-memory cache key
      const cacheKey = `${apiUrl}::${JSON.stringify({ method: fetchOptions.method || 'GET', body: fetchOptions.body || '' })}`
      const cache = (globalThis as any).__AUTH_FETCH_CACHE__ || ((globalThis as any).__AUTH_FETCH_CACHE__ = new Map())

      // Serve cached GET responses briefly to avoid bursts while refetching
      if ((!fetchOptions.method || fetchOptions.method === 'GET') && cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)
        if (cached && Date.now() - cached.ts < 2000) {
          return cached.data
        }
      }

      let attempt = 0
      // exponential backoff for 429/5xx
      while (true) {
        const response = await fetch(apiUrl, {
          ...fetchOptions,
          headers: authHeaders,
        })

        if (response.ok) {
          const data = await response.json()
          if ((!fetchOptions.method || fetchOptions.method === 'GET')) {
            cache.set(cacheKey, { ts: Date.now(), data })
          }
          return data
        }

        const status = response.status
        const errorData = await response.json().catch(() => ({}))
        const retriable = status === 429 || (status >= 500 && status < 600)
        if (attempt < retries && retriable) {
          const retryAfter = Number(response.headers.get('retry-after'))
          const delayMs = !Number.isNaN(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(2000 * Math.pow(2, attempt), 8000)
          await new Promise(r => setTimeout(r, delayMs))
          attempt += 1
          continue
        }
        if (muteErrors) {
          return { success: false, status, error: errorData.error || response.statusText }
        }
        
        // Format error message properly (handle objects)
        let errorMessage = errorData.error || response.statusText
        if (typeof errorMessage === 'object') {
          errorMessage = JSON.stringify(errorMessage)
        }
        throw new Error(`${errorMessage} (Status: ${status})`)
      }
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