'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard')
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Bienvenido a</span>
              <span className="block text-blue-600">AteneAI</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Plataforma SaaS de chatbots inteligentes para automatizar atención al cliente y generar más leads.
            </p>
            
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link
                  href="/sign-in"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 transition-colors"
                >
                  Iniciar Sesión
                </Link>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Link
                  href="/sign-up"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10 transition-colors"
                >
                  Registrarse
                </Link>
              </div>
            </div>

            <div className="mt-16">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl">🤖</span>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">IA Avanzada</h3>
                  <p className="mt-2 text-gray-500">Chatbots inteligentes que responden como humanos</p>
                </div>
                
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xl">📊</span>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Analytics</h3>
                  <p className="mt-2 text-gray-500">Métricas detalladas de conversaciones y escalaciones</p>
                </div>
                
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-xl">⚡</span>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Automatización</h3>
                  <p className="mt-2 text-gray-500">Integración con n8n y workflows personalizados</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
