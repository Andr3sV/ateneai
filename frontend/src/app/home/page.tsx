"use client"

import { useUser } from "@clerk/nextjs"
import { usePageTitle } from "@/hooks/usePageTitle"
import { QuoteOfTheDay } from "@/components/quote-of-the-day"
import { TasksSummary } from "@/components/tasks-summary"

export default function HomePage() {
  const { user } = useUser()
  
  // Set page title in header
  usePageTitle('Home')

  if (!user) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">Cargando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Welcome Section - Alineado a la izquierda */}
      <div className="text-left">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ¡Hola de nuevo, {user.firstName || 'Vendedor'}! 👋
        </h1>
        <p className="text-gray-600">
          ¿Preparado para un gran día de ventas?
        </p>
      </div>

      {/* Quote of the Day */}
      <QuoteOfTheDay />

      {/* Tasks Summary */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Resumen de Tareas
        </h2>
        <TasksSummary />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a 
            href="/calls" 
            className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer block text-decoration-none"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📞</div>
              <div className="font-medium text-gray-900">Llamadas con la AI</div>
              <div className="text-sm text-gray-500">Gestionar leads</div>
            </div>
          </a>
          
          <a 
            href="/contacts/list" 
            className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer block text-decoration-none"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-medium text-gray-900">Ver Contactos</div>
              <div className="text-sm text-gray-500">Haz seguimiento</div>
            </div>
          </a>
          
          <a 
            href="/tasks" 
            className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer block text-decoration-none"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📋</div>
              <div className="font-medium text-gray-900">Ver Tareas</div>
              <div className="text-sm text-gray-500">Organizar trabajo</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}