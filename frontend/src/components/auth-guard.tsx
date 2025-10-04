'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * AuthGuard: Componente que detecta cuando un usuario pierde su sesión
 * y lo redirige automáticamente a la página principal de Simbiosia.
 * 
 * Esto previene que los usuarios vean la app vacía después de un deslogueo.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const hasRedirected = useRef(false)

  useEffect(() => {
    // Solo ejecutar cuando Clerk ha terminado de cargar
    if (!isLoaded) return

    // Si el usuario NO está autenticado y no hemos redirigido aún
    if (!isSignedIn && !hasRedirected.current) {
      console.log('🔒 Usuario no autenticado detectado - Redirigiendo a simbiosia.com')
      hasRedirected.current = true
      
      // Redirigir a la página principal de Simbiosia
      window.location.href = 'https://simbiosia.com'
    }
  }, [isLoaded, isSignedIn, router])

  // Mostrar loading mientras Clerk carga
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, mostrar loading mientras redirige
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirigiendo a Simbiosia...</p>
        </div>
      </div>
    )
  }

  // Usuario autenticado - renderizar la app normalmente
  return <>{children}</>
}

