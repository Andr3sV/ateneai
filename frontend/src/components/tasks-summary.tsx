"use client"

import { useEffect, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { getApiUrl } from '@/config/features'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckSquare, Calendar, Clock } from 'lucide-react'

interface TasksSummary {
  today: number
  thisWeek: number
}

export function TasksSummary() {
  const [summary, setSummary] = useState<TasksSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const authenticatedFetch = useAuthenticatedFetch()

  useEffect(() => {
    const fetchTasksSummary = async () => {
      try {
        setLoading(true)
        const today = new Date()
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay())
        
        const todayStr = today.toISOString().split('T')[0]
        const startOfWeekStr = startOfWeek.toISOString().split('T')[0]
        
        // Fetch tasks for today and this week
        const [todayResponse, weekResponse] = await Promise.all([
          authenticatedFetch(getApiUrl(`tasks?due_date=${todayStr}&status=pending`)),
          authenticatedFetch(getApiUrl(`tasks?due_date_gte=${startOfWeekStr}&status=pending`))
        ])
        
        if (todayResponse?.success && weekResponse?.success) {
          setSummary({
            today: todayResponse.data?.length || 0,
            thisWeek: weekResponse.data?.length || 0
          })
        }
      } catch (error) {
        console.error('Error fetching tasks summary:', error)
        // Fallback to default values
        setSummary({ today: 0, thisWeek: 0 })
      } finally {
        setLoading(false)
      }
    }

    fetchTasksSummary()
  }, [authenticatedFetch])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasks del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasks de la Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tasks del Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {summary?.today || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pendientes para hoy
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Tasks de la Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {summary?.thisWeek || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pendientes esta semana
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
