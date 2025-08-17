"use client"

import { useEffect, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Phone, User, Clock, Calendar, Settings } from 'lucide-react'

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-semibold">{campaign.name || 'Untitled Campaign'}</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
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
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{campaign.total_recipients}</div>
                  <div className="text-xs text-gray-500">Total Recipients</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{campaign.processed_recipients}</div>
                  <div className="text-xs text-gray-500">Contacts Called</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{progressPercentage}%</div>
                  <div className="text-xs text-gray-500">Completion</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
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
                  <div className="font-medium">
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
                          <span className="ml-2 font-medium">{metadata.timeWindow.timezone}</span>
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

          {/* Campaign ID */}
          {campaign.campaign_id && (
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm">
                  <span className="text-gray-600">Campaign ID:</span>
                  <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {campaign.campaign_id}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
