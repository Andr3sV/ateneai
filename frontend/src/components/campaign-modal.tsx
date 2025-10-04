"use client"

import { useEffect, useState, useRef } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Phone, User, Clock, Calendar, XCircle, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { CallManagerBatchResponse } from '@/services/call-manager'

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

interface CampaignModalProps {
  campaign: CampaignDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CampaignModal({ campaign, open, onOpenChange }: CampaignModalProps) {
  const authenticatedFetch = useAuthenticatedFetch()
  const [loading, setLoading] = useState(false)
  const [callManagerData, setCallManagerData] = useState<CallManagerBatchResponse | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [cancelError, setCancelError] = useState<string>("")
  const [metadata, setMetadata] = useState<any>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Parse metadata from file_url
  useEffect(() => {
    if (!campaign?.file_url) {
      setMetadata(null)
      return
    }

    if (campaign.file_url.includes('metadata:')) {
      try {
        const metadataStr = campaign.file_url.split('metadata:')[1]
        if (metadataStr) {
          const parsed = JSON.parse(metadataStr)
          setMetadata(parsed)
        }
      } catch (e) {
        console.warn('Failed to parse campaign metadata:', e)
        setMetadata(null)
      }
    }
  }, [campaign])

  // Fetch call-manager status
  useEffect(() => {
    // Only fetch if it's a call-manager campaign
    if (!open || !campaign || !metadata?.external_batch_id) {
      setCallManagerData(null)
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    async function fetchCallManagerStatus() {
      if (!campaign || !metadata?.external_batch_id) return
      
      try {
        setLoading(true)
        const res = await authenticatedFetch(`/api/call-manager/${campaign.id}/status`, { muteErrors: true })
        
        if (res?.success && res.data?.call_manager_response) {
          const newData = res.data.call_manager_response
          setCallManagerData(newData)
          
          // Stop polling if campaign is completed, cancelled, or failed
          if (newData.status === 'completed' || newData.status === 'cancelled' || newData.status === 'failed') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }
          }
        } else if (res?.error && typeof res.error === 'string' && res.error.includes('not created with')) {
          // This is not a call-manager campaign, stop trying
          console.log('Campaign is not from call-manager system')
          setCallManagerData(null)
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
        }
      } catch (error) {
        console.error('Error fetching call-manager status:', error)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchCallManagerStatus()

    // Set up polling every 5 seconds
    pollingRef.current = setInterval(fetchCallManagerStatus, 5000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [open, campaign, metadata?.external_batch_id, authenticatedFetch])

  async function handleCancel() {
    if (!campaign || !metadata?.external_batch_id) return
    
    // Check if campaign can be cancelled
    const currentStatus = callManagerData?.status || campaign.status
    if (currentStatus === 'completed' || currentStatus === 'cancelled' || currentStatus === 'failed') {
      setCancelError(`Cannot cancel: Campaign is already ${currentStatus}`)
      return
    }
    
    // Stop polling immediately to avoid race conditions
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    
    setCanceling(true)
    setCancelError("")
    
    try {
      console.log(`🔴 Canceling campaign ${campaign.id}`)
      
      // Use the internal batch ID from our database
      const res = await authenticatedFetch(`/api/call-manager/${campaign.id}/cancel`, {
        method: 'POST'
      })
      
      console.log('Cancel response:', res)
      
      if (!res?.success) {
        const errorMsg = typeof res?.error === 'object' 
          ? JSON.stringify(res.error) 
          : (res?.error || 'Failed to cancel campaign')
        throw new Error(errorMsg)
      }
      
      // Update local state
      if (res.data?.call_manager_response) {
        setCallManagerData(res.data.call_manager_response)
      }
      
      console.log('✅ Campaign cancelled successfully')
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onOpenChange(false)
      }, 2000)
      
    } catch (error: any) {
      console.error('Cancel error:', error)
      
      // Parse error message
      let errorMsg = error?.message || 'Failed to cancel campaign'
      
      // Check for specific error patterns
      if (errorMsg.includes('already') || errorMsg.includes('cannot be cancelled')) {
        setCancelError(`This campaign cannot be cancelled (it may have already completed or been cancelled)`)
      } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        setCancelError(`Campaign not found in call-manager`)
      } else {
        setCancelError(`Error: ${errorMsg}`)
      }
    } finally {
      setCanceling(false)
    }
  }

  if (!campaign) return null

  const hasCallManagerData = !!callManagerData
  const externalBatchId = metadata?.external_batch_id || null
  const isCallManagerCampaign = !!externalBatchId

  // Use call-manager data if available, otherwise fall back to database
  const status = callManagerData?.status || campaign.status
  const totalScheduled = callManagerData?.total_calls_scheduled || campaign.total_recipients
  const totalDispatched = callManagerData?.total_calls_dispatched || campaign.processed_recipients
  const progressPercentage = totalScheduled > 0 ? Math.round((totalDispatched / totalScheduled) * 100) : 0

  const isCompleted = status === 'completed'
  const isInProgress = status === 'in_progress'
  const isPending = status === 'pending'
  const isCancelled = status === 'cancelled'
  const isFailed = status === 'failed'

  const statusConfig = {
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Completed' },
    in_progress: { color: 'bg-blue-100 text-blue-800', icon: Loader2, label: 'In Progress' },
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
    cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Cancelled' },
    failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Failed' },
  }

  const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = currentStatus.icon

  // Parse scheduled time
  let scheduledTimeDisplay = null
  if (callManagerData?.scheduled_time_unix) {
    const scheduledDate = new Date(callManagerData.scheduled_time_unix * 1000)
    scheduledTimeDisplay = scheduledDate.toLocaleString()
  } else if (metadata?.scheduled_time) {
    const scheduledDate = new Date(metadata.scheduled_time * 1000)
    scheduledTimeDisplay = scheduledDate.toLocaleString()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{campaign.name || 'Campaign Details'}</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${isInProgress ? 'animate-spin' : ''}`} />
            <Badge className={currentStatus.color}>{currentStatus.label}</Badge>
            {isCallManagerCampaign && (
              <Badge variant="outline" className="ml-2">Call Manager</Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Actions */}
          {isCallManagerCampaign && (isInProgress || isPending) && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                {cancelError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{cancelError}</AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleCancel}
                  disabled={canceling || isFailed}
                >
                  {canceling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Campaign
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  This will stop all pending calls in this campaign
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Info for completed/cancelled campaigns */}
          {isCallManagerCampaign && (isCompleted || isCancelled) && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                This campaign is {status} and cannot be cancelled.
              </AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Calls Dispatched</span>
                  <span className="font-medium">{totalDispatched} / {totalScheduled}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{progressPercentage}% Complete</span>
                  {isInProgress && <span className="text-blue-600 animate-pulse">● Live</span>}
                </div>
              </div>

              {/* Recipients breakdown if available */}
              {callManagerData?.recipients && callManagerData.recipients.length > 0 && (
                <div className="pt-4 border-t space-y-2">
                  <div className="text-sm font-medium">Recipients Status</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <span>Pending</span>
                      <span className="font-medium">
                        {callManagerData.recipients.filter(r => r.status === 'pending').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span>In Progress</span>
                      <span className="font-medium">
                        {callManagerData.recipients.filter(r => r.status === 'in_progress').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span>Completed</span>
                      <span className="font-medium">
                        {callManagerData.recipients.filter(r => r.status === 'completed').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span>Failed</span>
                      <span className="font-medium">
                        {callManagerData.recipients.filter(r => r.status === 'failed').length}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Phone Provider</div>
                  <div className="text-muted-foreground">
                    {callManagerData?.phone_provider || metadata?.phone_provider || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Agent</div>
                  <div className="text-muted-foreground">
                    {callManagerData?.agent_name || metadata?.agent_name || campaign.agent_external_id || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Created At</div>
                  <div className="text-muted-foreground">
                    {new Date(campaign.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {scheduledTimeDisplay && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Scheduled For</div>
                    <div className="text-muted-foreground">{scheduledTimeDisplay}</div>
                  </div>
                </div>
              )}

              {externalBatchId && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="font-medium text-xs text-muted-foreground">Batch ID</div>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{externalBatchId}</code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loading state */}
          {loading && !hasCallManagerData && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Not a call-manager campaign */}
          {!isCallManagerCampaign && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This campaign was created with the legacy system. Some features are not available.
              </AlertDescription>
            </Alert>
          )}

          {/* Debug Information - Call Manager Data */}
          {isCallManagerCampaign && callManagerData && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-base text-blue-900">🔍 Debug Info - Call Manager Response</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold">Batch ID:</span>
                      <code className="ml-1 bg-white px-1 rounded">{callManagerData.id}</code>
                    </div>
                    <div>
                      <span className="font-semibold">Status:</span>
                      <code className="ml-1 bg-white px-1 rounded">{callManagerData.status}</code>
                    </div>
                    <div>
                      <span className="font-semibold">Phone Number ID:</span>
                      <code className="ml-1 bg-white px-1 rounded text-[10px]">{callManagerData.phone_number_id}</code>
                    </div>
                    <div>
                      <span className="font-semibold">Agent ID:</span>
                      <code className="ml-1 bg-white px-1 rounded text-[10px]">{callManagerData.agent_id}</code>
                    </div>
                    <div>
                      <span className="font-semibold">Provider:</span>
                      <code className="ml-1 bg-white px-1 rounded">{callManagerData.phone_provider || 'N/A'}</code>
                    </div>
                    <div>
                      <span className="font-semibold">Agent Name:</span>
                      <code className="ml-1 bg-white px-1 rounded">{callManagerData.agent_name || 'N/A'}</code>
                    </div>
                    <div>
                      <span className="font-semibold">Total Scheduled:</span>
                      <code className="ml-1 bg-white px-1 rounded">{callManagerData.total_calls_scheduled}</code>
                    </div>
                    <div>
                      <span className="font-semibold">Total Dispatched:</span>
                      <code className="ml-1 bg-white px-1 rounded">{callManagerData.total_calls_dispatched}</code>
                    </div>
                  </div>

                  {callManagerData.recipients && callManagerData.recipients.length > 0 && (
                    <div className="pt-2 border-t border-blue-200">
                      <div className="font-semibold mb-2">Recipients Details:</div>
                      <div className="space-y-1 max-h-40 overflow-y-auto bg-white p-2 rounded">
                        {callManagerData.recipients.map((recipient, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[10px] border-b border-gray-100 pb-1">
                            <span className="font-mono">{recipient.phone_number}</span>
                            <span className={`px-2 py-0.5 rounded ${
                              recipient.status === 'completed' ? 'bg-green-100 text-green-800' :
                              recipient.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              recipient.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {recipient.status}
                            </span>
                            {recipient.conversation_id && (
                              <code className="text-[9px] text-gray-500">{recipient.conversation_id.substring(0, 8)}...</code>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-blue-200">
                    <details className="cursor-pointer">
                      <summary className="font-semibold text-blue-900">Raw JSON Response</summary>
                      <pre className="mt-2 text-[9px] bg-white p-2 rounded overflow-x-auto">
                        {JSON.stringify(callManagerData, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
