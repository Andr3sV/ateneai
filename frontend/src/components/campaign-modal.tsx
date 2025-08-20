"use client"

import { useEffect, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, User, Clock, Calendar, Settings } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type CampaignDetail = {
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

type Agent = {
  id: number
  name: string
  external_id: string
}

type PhoneNumber = {
  id: number
  phone: string
  external_id: string
}

interface CampaignModalProps {
  campaign: CampaignDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CampaignModal({ campaign, open, onOpenChange }: CampaignModalProps) {
  const authenticatedFetch = useAuthenticatedFetch()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(false)
  const [metadata, setMetadata] = useState<any>(null)
  const [canceling, setCanceling] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Voice Orchestrator per-campaign metrics
  const [voCreatedTotal, setVoCreatedTotal] = useState<number>(0)
  const [voBreakdown, setVoBreakdown] = useState<Record<string, number>>({})
  const [voProgressPct, setVoProgressPct] = useState<number | null>(null)

  useEffect(() => {
    async function fetchDetails() {
      if (!open || !campaign) return
      
      try {
        setLoading(true)
        
        // Fetch agent details
        if (campaign.agent_external_id) {
          const agentRes = await authenticatedFetch(`/api/v2/agents?type=call&external_id=${campaign.agent_external_id}`)
          if (agentRes?.success && Array.isArray(agentRes.data) && agentRes.data.length > 0) {
            setAgent(agentRes.data[0])
          }
        }
        
        // Parse metadata from file_url if available
        if (campaign.file_url && campaign.file_url.includes('metadata:')) {
          try {
            const metadataStr = campaign.file_url.split('metadata:')[1]
            if (metadataStr) {
              const parsed = JSON.parse(metadataStr)
              setMetadata(parsed)
            }
          } catch (e) {
            console.warn('Failed to parse campaign metadata:', e)
          }
        }
        
        // Fetch Voice Orchestrator per-campaign report
        try {
          const campaignIdentifier = campaign.campaign_id
          if (campaignIdentifier) {
            const fromDate = new Date(campaign.created_at)
            fromDate.setUTCHours(0, 0, 0, 0)
            const toDate = new Date()
            toDate.setUTCHours(23, 59, 59, 999)
            const params = new URLSearchParams({
              from: fromDate.toISOString(),
              to: toDate.toISOString(),
              groupBy: 'campaign',
              campaignId: String(campaignIdentifier)
            })
            const voRes = await authenticatedFetch(`/api/calls/vo/report?${params.toString()}`, { muteErrors: true })
            if (voRes?.success) {
              // Find this campaign's group
              const groups: Array<any> = Array.isArray(voRes.data?.groups) ? voRes.data.groups : []
              const group = groups.find(g => g.key === campaignIdentifier) || groups[0]
              if (group) {
                const tally: Record<string, number> = {}
                let total = 0
                for (const key of Object.keys(group)) {
                  if (key === 'key') continue
                  const v = group[key]
                  if (typeof v === 'number') {
                    total += v
                    tally[key] = (tally[key] || 0) + v
                  }
                }
                setVoCreatedTotal(total)
                setVoBreakdown(tally)
                const queued = tally['queued'] || 0
                const processed = Math.max(total - queued, 0)
                const pct = total > 0 ? Math.round((processed / total) * 100) : 0
                setVoProgressPct(pct)
              } else {
                setVoCreatedTotal(0)
                setVoBreakdown({})
                setVoProgressPct(null)
              }
            }
          }
        } catch (err) {
          // ignore VO errors to avoid breaking modal
        }

      } finally {
        setLoading(false)
      }
    }
    
    fetchDetails()
  }, [open, campaign, authenticatedFetch])

  if (!campaign) return null

  const progressPercentage = campaign.total_recipients > 0 
    ? Math.round((campaign.processed_recipients / campaign.total_recipients) * 100) 
    : 0

  const isCompleted = progressPercentage >= 100
  const isInProgress = progressPercentage > 0 && progressPercentage < 100
  const isPending = progressPercentage === 0

  const getStatusColor = () => {
    if (isCompleted) return 'bg-emerald-100 text-emerald-800'
    if (isInProgress) return 'bg-amber-100 text-amber-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusText = () => {
    if (isCompleted) return 'Completed'
    if (isInProgress) return 'In Progress'
    return 'Pending'
  }

  async function cancelCampaign() {
    if (!campaign?.campaign_id) return
    try {
      setCanceling(true)
      // Backend proxy: reuse our existing /calls/vo/report auth header pattern
      const res = await authenticatedFetch(`/api/calls/vo/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: String(campaign.campaign_id) })
      })
      if (!res?.success) {
        throw new Error(res?.error || 'Cancel failed')
      }
      onOpenChange(false)
    } catch (e) {
      console.error('Cancel campaign error:', e)
      alert('Could not cancel campaign. Please try again.')
    } finally {
      setCanceling(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[900px] sm:w-[1050px] overflow-y-auto p-6">
        <SheetHeader className="pb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-semibold">{campaign.name || 'Untitled Campaign'}</SheetTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
            <span className="text-sm text-gray-500">
              Started {new Date(campaign.created_at).toLocaleString()}
            </span>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Progress Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Campaign Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{campaign.total_recipients}</div>
                  <div className="text-xs text-gray-500">Total Recipients</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{voCreatedTotal}</div>
                  <div className="text-xs text-gray-500">Total Calls (VO)</div>
                </div>
              </div>

              {/* Progress bar using VO when available */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{voProgressPct ?? progressPercentage}%</span>
                </div>
                <Progress value={voProgressPct ?? progressPercentage} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Configuration Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Campaign Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>Agent</span>
                  </div>
                  <div className="font-medium">
                    {agent ? agent.name : campaign.agent_external_id || 'Not specified'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>Phone Number</span>
                  </div>
                  <div className="font-medium break-all">
                    {campaign.phone_external_id || 'Not specified'}
                  </div>
                </div>
              </div>

              {/* Metadata Configuration */}
              {metadata && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Advanced Configuration</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {metadata.callType && (
                      <div>
                        <span className="text-gray-600">Call Type:</span>
                        <span className="ml-2 font-medium capitalize">{metadata.callType}</span>
                      </div>
                    )}
                    {metadata.concurrency && (
                      <div>
                        <span className="text-gray-600">Concurrency:</span>
                        <span className="ml-2 font-medium">{metadata.concurrency}</span>
                      </div>
                    )}
                    {metadata.enableMachineDetection !== undefined && (
                      <div>
                        <span className="text-gray-600">AMD:</span>
                        <span className="ml-2 font-medium">{metadata.enableMachineDetection ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    )}
                    {metadata.machineDetectionTimeout && (
                      <div>
                        <span className="text-gray-600">AMD Timeout:</span>
                        <span className="ml-2 font-medium">{metadata.machineDetectionTimeout}s</span>
                      </div>
                    )}
                  </div>

                  {/* Time Window Configuration */}
                  {metadata.timeWindow && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Time Window
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Time Range:</span>
                          <span className="ml-2 font-medium">
                            {metadata.timeWindow.startTime} - {metadata.timeWindow.endTime}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Timezone:</span>
                          <span className="ml-2 font-medium break-all">{metadata.timeWindow.timezone}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Days:</span>
                          <span className="ml-2 font-medium">
                            {metadata.timeWindow.daysOfWeek?.map((day: number) => {
                              const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                              return dayNames[day - 1]
                            }).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* VO Breakdown by status */}
          {Object.keys(voBreakdown).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Desglose por estado (VO)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {['queued','in_progress','completed','failed'].map((k) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-600 capitalize">{k.replace('_',' ')}:</span>
                    <span className="font-semibold">{voBreakdown[k] || 0}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Campaign ID + Cancel button */}
          {campaign.campaign_id && !isCompleted && (
            <Card>
              <CardContent className="pt-4 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <span className="text-gray-600">Campaign ID:</span>
                  <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {campaign.campaign_id}
                  </span>
                </div>
                <Button variant="destructive" onClick={() => setConfirmOpen(true)} disabled={canceling}>
                  {canceling ? 'Cancelling…' : 'Cancel Campaign'}
                </Button>
              </CardContent>
            </Card>
          )}
          {/* Confirm cancel dialog */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel this campaign?</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-gray-600">
                This will cancel all queued calls in this campaign. In-progress calls may continue.
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={canceling}>No, keep campaign</Button>
                <Button variant="destructive" onClick={async () => { setConfirmOpen(false); await cancelCampaign(); }} disabled={canceling}>
                  {canceling ? 'Cancelling…' : 'Yes, cancel campaign'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SheetContent>
    </Sheet>
  )
}
