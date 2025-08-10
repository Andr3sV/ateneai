"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"
import { getApiUrl } from "@/config/features"
import { StatCard } from "@/components/stat-card"
import { MessageSquare, AlertCircle, TrendingUp } from "lucide-react"

type DashboardStats = {
  totalConversations: number
  escalatedConversations: number
  escalationRate: number
}

export default function MessagesDashboardPage() {
  const { user } = useUser()
  const authenticatedFetch = useAuthenticatedFetch()
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    const run = async () => {
      const data = await authenticatedFetch(getApiUrl("analytics/dashboard-stats"))
      if (data?.success) setStats(data.data)
    }
    if (user) run()
  }, [user, authenticatedFetch])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Messages Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de actividad de conversaciones</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Conversations"
          value={stats?.totalConversations ?? 0}
          description="Conversaciones creadas"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <StatCard
          title="Escaladas a Humano"
          value={stats?.escalatedConversations ?? 0}
          description="Derivadas a equipo"
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <StatCard
          title="Tasa de Escalación"
          value={`${stats?.escalationRate ?? 0}%`}
          description="Porcentaje del total"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>
    </div>
  )
}


