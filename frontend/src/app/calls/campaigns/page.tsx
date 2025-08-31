"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useCallback } from "react"
import { usePageTitle } from "@/hooks/usePageTitle"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"
import { CampaignModal } from "@/components/campaign-modal"

// Skeleton Component for loading state
const CampaignCardSkeleton = () => (
  <Card className="p-4 flex flex-col gap-3 border-gray-200 shadow-sm animate-pulse">
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
        <div className="h-3 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-16"></div>
    </div>
    
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-200 rounded w-16"></div>
        <div className="h-3 bg-gray-200 rounded w-12"></div>
      </div>
      <div className="h-1.5 bg-gray-200 rounded"></div>
    </div>
    
    <div className="flex items-center justify-between">
      <div className="h-3 bg-gray-200 rounded w-20"></div>
      <div className="h-3 bg-gray-200 rounded w-24"></div>
    </div>
  </Card>
)

type BatchRow = {
  id: number
  name: string
  status: string
  total_recipients: number
  processed_recipients: number
  phone_external_id?: string | null
  agent_external_id?: string | null
  created_at: string
  campaign_id?: string | null
  file_url?: string | null
}

export default function CampaignsPage() {
  usePageTitle("Campaigns")
  const authenticatedFetch = useAuthenticatedFetch()

  const [items, setItems] = useState<BatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [agentsMap, setAgentsMap] = useState<Record<string, string>>({})
  const [selectedCampaign, setSelectedCampaign] = useState<BatchRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  // VO stats grouped by campaignId
  const [voByCampaign, setVoByCampaign] = useState<Record<string, { total: number; queued: number; progressPct: number }>>({})

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await authenticatedFetch('/api/calls/bulk/list', { muteErrors: true })
      if (res?.success && Array.isArray(res.data)) {
        setItems(res.data)
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    }
  }, [authenticatedFetch])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    
    const load = async () => {
      await fetchCampaigns()
      if (loading) setLoading(false)
    }
    
    load()
    
    // Auto refresh every 10 seconds to update progress
    timer = setInterval(fetchCampaigns, 10000)
    
    return () => { 
      if (timer) clearInterval(timer) 
    }
  }, [authenticatedFetch, fetchCampaigns, loading])

  // Fetch VO report per campaign (avoids heavy grouped query that may 500)
  useEffect(() => {
    let aborted = false
    setVoByCampaign((prev) => prev) // keep existing while updating
    const run = async () => {
      for (const b of items) {
        if (aborted) return
        if (!b.campaign_id) continue
        try {
          const from = new Date(b.created_at)
          from.setUTCHours(0,0,0,0)
          const to = new Date()
          to.setUTCHours(23,59,59,999)
          const params = new URLSearchParams({
            from: from.toISOString(),
            to: to.toISOString(),
            groupBy: 'campaign',
            campaignId: String(b.campaign_id)
          })
          const report = await authenticatedFetch(`/api/calls/vo/report?${params.toString()}`, { muteErrors: true })
          const groups: Array<any> = Array.isArray(report?.data?.groups) ? report.data.groups : []
          const g = groups.find((x: any) => String(x.key) === String(b.campaign_id)) || groups[0]
          if (!g) continue
          const queued = Number(g.queued || 0)
          const in_progress = Number(g.in_progress || 0)
          const completed = Number(g.completed || 0)
          const failed = Number(g.failed || 0)
          const total = queued + in_progress + completed + failed
          const processed = Math.max(total - queued, 0)
          const pct = total > 0 ? Math.round((processed / total) * 100) : 0
          if (aborted) return
          setVoByCampaign(prev => ({ ...prev, [b.campaign_id as string]: { total, queued, progressPct: pct } }))
        } catch (e) {
          // ignore this campaign
        }
      }
    }
    run()
    return () => { aborted = true }
  }, [items, authenticatedFetch])

  // Load agents map to resolve external_id -> name
  useEffect(() => {
    authenticatedFetch('/api/v2/agents?type=call', { muteErrors: true }).then((res) => {
      const map: Record<string, string> = {}
      if (res?.success && Array.isArray(res.data)) {
        res.data.forEach((a: { external_id?: string; name?: string }) => {
          if (a?.external_id) map[a.external_id] = a.name || a.external_id
        })
      }
      setAgentsMap(map)
    }).catch(() => {})
  }, [authenticatedFetch])

  const handleCampaignClick = (campaign: BatchRow) => {
    setSelectedCampaign(campaign)
    setModalOpen(true)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(b => (b.name || '').toLowerCase().includes(q))
  }, [items, search])

  const cards = useMemo(() => {
    return filtered.map((b) => {
      const vo = b.campaign_id ? voByCampaign[b.campaign_id] : undefined
      const progressPercentage = vo ? vo.progressPct : (b.total_recipients > 0 
        ? Math.round((b.processed_recipients / b.total_recipients) * 100) 
        : 0)
      
      const isCompleted = progressPercentage >= 100
      const isInProgress = progressPercentage > 0 && progressPercentage < 100
      
      const agentName = b.agent_external_id ? (agentsMap[b.agent_external_id] || b.agent_external_id) : ''
      
      return (
        <Card 
          key={b.id} 
          className="p-4 flex flex-col gap-3 border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleCampaignClick(b)}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-[15px] font-semibold text-gray-900">{b.name || 'Untitled Batch'}</div>
              <div className="text-xs text-gray-500">
                {b.total_recipients || 0} {(b.total_recipients || 0) === 1 ? 'recipient' : 'recipients'}
                {agentName ? <> · {agentName}</> : null}
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              isCompleted ? 'bg-emerald-100 text-emerald-800' : 
              isInProgress ? 'bg-amber-100 text-amber-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {isCompleted ? 'Completed' : isInProgress ? 'In progress' : 'Pending'}
            </span>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Progress</span>
              <span className="font-medium text-gray-800">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />
          </div>
          
          {/* VO totals */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Total calls (VO): <span className="font-medium text-blue-600">{vo?.total ?? 0}</span>
            </span>
            <span className="text-gray-500">Started {new Date(b.created_at).toLocaleString()}</span>
          </div>
        </Card>
      )
    })
  }, [filtered, agentsMap, voByCampaign])

  return (
    <div className="flex flex-1 flex-col p-6 gap-6">
      {/* Search + primary action */}
      <div className="flex items-center justify-between gap-3">
        {loading ? (
          <>
            <div className="h-10 bg-gray-200 rounded w-72 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
          </>
        ) : (
          <>
            <div className="w-72">
              <Input placeholder="Search Batch Calls…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button asChild>
              <Link href="/calls/campaigns/create">Create a batch call</Link>
            </Button>
          </>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <CampaignCardSkeleton />
          <CampaignCardSkeleton />
          <CampaignCardSkeleton />
          <CampaignCardSkeleton />
          <CampaignCardSkeleton />
          <CampaignCardSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-gray-600">No campaigns yet.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards}
        </div>
      )}

      {/* Campaign Modal */}
      <CampaignModal
        campaign={selectedCampaign}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}


