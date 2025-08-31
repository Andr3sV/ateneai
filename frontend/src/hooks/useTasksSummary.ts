import { useEffect, useState, useMemo } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { getApiUrl } from '@/config/features'
import { startOfDay, endOfDay, endOfWeek } from 'date-fns'

interface TaskRow {
  id: number
  title: string
  due_date: string | null
  assignees: { id: number; name: string }[]
  contacts: { id: number; name: string }[]
}

interface TasksSummary {
  today: number
  thisWeek: number
  total: number
}

export function useTasksSummary() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const authenticatedFetch = useAuthenticatedFetch()
  const { userId } = useWorkspaceContext()

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch tasks filtered by current user (assignee_id)
        const params = new URLSearchParams()
        params.append('limit', '1000')
        if (userId) {
          params.append('assignee_id', String(userId))
        }
        
        const response = await authenticatedFetch(getApiUrl(`tasks?${params.toString()}`))
        
        if (response?.success) {
          setTasks(response.data || [])
        } else {
          setError('Failed to fetch tasks')
        }
      } catch (err) {
        console.error('Error fetching tasks:', err)
        setError('Error fetching tasks')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [authenticatedFetch, userId])

  const summary = useMemo((): TasksSummary => {
    if (!tasks.length) return { today: 0, thisWeek: 0, total: 0 }

    const now = new Date()
    const sod = startOfDay(now)
    const eod = endOfDay(now)
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    let todayCount = 0
    let weekCount = 0

    tasks.forEach(task => {
      if (!task.due_date) return
      
      const dueDate = new Date(task.due_date)
      
      // Tasks for today
      if (dueDate >= sod && dueDate <= eod) {
        todayCount++
      }
      
      // Tasks for this week (including today)
      if (dueDate >= sod && dueDate <= weekEnd) {
        weekCount++
      }
    })

    return {
      today: todayCount,
      thisWeek: weekCount,
      total: tasks.length
    }
  }, [tasks])

  return {
    summary,
    loading,
    error,
    tasks
  }
}
