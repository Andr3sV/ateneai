"use client"

import { useTasksSummary } from '@/hooks/useTasksSummary'
import { Clock, Calendar, TrendingUp } from 'lucide-react'

export function TasksSummary() {
  const { summary, loading, error } = useTasksSummary()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-40"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 text-sm">Error loading tasks summary</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Tasks del Día */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-gray-700">Tasks del Día</div>
          <Clock className="h-5 w-5 text-gray-400" />
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {summary?.today || 0}
        </div>
        <div className="text-sm text-gray-500">
          Pendientes para hoy
        </div>
      </div>

      {/* Tasks de la Semana */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-gray-700">Tasks de la Semana</div>
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {summary?.thisWeek || 0}
        </div>
        <div className="text-sm text-gray-500">
          Pendientes esta semana
        </div>
      </div>

      {/* Total de Tasks */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-gray-700">Total Tasks</div>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {summary?.total || 0}
        </div>
        <div className="text-sm text-gray-500">
          En el sistema
        </div>
      </div>
    </div>
  )
}
