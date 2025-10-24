"use client"

import { useEffect, useState, useRef } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Phone, User, Clock, Calendar, XCircle, CheckCircle2, Loader2, AlertCircle, Download, RefreshCw } from 'lucide-react'
import { CallManagerBatchResponse } from '@/services/call-manager'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [callManagerData, setCallManagerData] = useState<CallManagerBatchResponse | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [cancelError, setCancelError] = useState<string>("")
  const [metadata, setMetadata] = useState<any>(null)
  const [retrying, setRetrying] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Function to download recipients as CSV
  const downloadRecipientsCSV = () => {
    if (!callManagerData?.recipients || callManagerData.recipients.length === 0) {
      return
    }

    // Prepare CSV content
    const headers = ['#', 'Phone Number', 'Status', 'Conversation ID']
    const rows = callManagerData.recipients.map((recipient, index) => [
      String(index + 1),
      recipient.phone_number || '',
      recipient.status || '',
      recipient.conversation_id || ''
    ])

    // Build CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    const campaignNameSafe = (campaign?.name || 'recipients').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    link.setAttribute('download', `campaign_${campaignNameSafe}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  // Helper function to format status for display
  const formatStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      'initiated': 'No Answer',
      'voicemail': 'Voicemail',
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'failed': 'Failed',
      'cancelled': 'Cancelled'
    }
    return statusMap[status] || status
  }

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

  async function handleRetry() {
    if (!campaign || !callManagerData?.recipients) return
    
    setRetrying(true)
    
    try {
      // Filter out completed recipients
      const failedOrPendingRecipients = callManagerData.recipients.filter(
        r => r.status !== 'completed'
      )
      
      if (failedOrPendingRecipients.length === 0) {
        alert('All recipients were completed successfully. Nothing to retry.')
        setRetrying(false)
        return
      }
      
      // Get original recipients with dynamic_variables from metadata
      const originalRecipients = metadata?.original_recipients || []
      
      // Create a map of phone_number -> original recipient data
      const originalRecipientsMap = new Map(
        originalRecipients.map((r: any) => [r.phone_number, r])
      )
      
      // Combine failed/pending recipients with their original dynamic_variables
      const recipientsWithVariables = failedOrPendingRecipients.map(r => {
        const original: any = originalRecipientsMap.get(r.phone_number)
        
        return {
          phone_number: r.phone_number,
          conversation_initiation_client_data: original?.conversation_initiation_client_data || {
            dynamic_variables: {}
          }
        }
      })
      
      // Build retry data object to pass to create campaign page
      const retryData = {
        campaignName: `${campaign.name} (Retry)`,
        agentId: callManagerData.agent_id || metadata?.agent_id,
        phoneNumberId: callManagerData.phone_number_id || metadata?.agent_phone_number_id,
        phoneProvider: callManagerData.phone_provider || metadata?.phone_provider,
        recipients: recipientsWithVariables,
        scheduledTime: null, // Immediate by default
      }
      
      console.log('🔄 Retry data prepared:', {
        total: recipientsWithVariables.length,
        withVariables: recipientsWithVariables.filter(r => 
          Object.keys(r.conversation_initiation_client_data?.dynamic_variables || {}).length > 0
        ).length
      })
      
      // Store in sessionStorage to pass to create page
      sessionStorage.setItem('retryCampaignData', JSON.stringify(retryData))
      
      // Close modal and navigate to create page
      onOpenChange(false)
      router.push('/calls/campaigns/create?retry=true')
      
    } catch (error) {
      console.error('Error preparing retry:', error)
      alert('Failed to prepare retry campaign. Please try again.')
    } finally {
      setRetrying(false)
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
    cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
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
        <SheetHeader className="px-6">
          <SheetTitle className="text-xl">{campaign.name || 'Campaign Details'}</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${isInProgress ? 'animate-spin' : ''}`} />
            <Badge className={currentStatus.color}>{currentStatus.label}</Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-1 px-6 space-y-6">
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
                    <div className="flex items-center justify-between p-2 bg-cyan-50 rounded">
                      <span>No Answer</span>
                      <span className="font-medium">
                        {callManagerData.recipients.filter(r => r.status === 'initiated').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <span>Voicemail</span>
                      <span className="font-medium">
                        {callManagerData.recipients.filter(r => r.status === 'voicemail').length}
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

          {/* Call Recipients Status */}
          {isCallManagerCampaign && callManagerData?.recipients && callManagerData.recipients.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-base flex-1">
                    <div className="flex items-center justify-between">
                      <span>Call Recipients ({callManagerData.recipients.length})</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadRecipientsCSV}
                        className="ml-4"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </Button>
                    </div>
                    <div className="flex gap-2 text-xs mt-3 flex-wrap">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        ✓ {callManagerData.recipients.filter(r => r.status === 'completed').length} Completed
                      </Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        ✗ {callManagerData.recipients.filter(r => r.status === 'failed').length} Failed
                      </Badge>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        ⏳ {callManagerData.recipients.filter(r => r.status === 'pending').length} Pending
                      </Badge>
                      <Badge variant="outline" className="bg-cyan-50 text-cyan-700">
                        📵 {callManagerData.recipients.filter(r => r.status === 'initiated').length} No Answer
                      </Badge>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        📞 {callManagerData.recipients.filter(r => r.status === 'voicemail').length} Voicemail
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        ↻ {callManagerData.recipients.filter(r => r.status === 'in_progress').length} In Progress
                      </Badge>
                    </div>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0 border-b">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">#</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Phone Number</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Status</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Conversation ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {callManagerData.recipients.map((recipient, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono text-sm">{recipient.phone_number}</td>
                            <td className="py-2 px-3">
                              <Badge className={`
                                ${recipient.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                  recipient.status === 'in_progress' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                  recipient.status === 'initiated' ? 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200' :
                                  recipient.status === 'voicemail' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' :
                                  recipient.status === 'failed' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                                  'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                }
                              `}>
                                {formatStatusLabel(recipient.status)}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              {recipient.conversation_id ? (
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                  {recipient.conversation_id.substring(0, 12)}...
                                </code>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {callManagerData.recipients.length > 50 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Showing {callManagerData.recipients.length} recipients. Scroll to see all.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions - Cancel Button */}
          {isCallManagerCampaign && (isInProgress || isPending) && (
            <Card className="border-red-200">
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
          
          {/* Info and Retry button for completed/cancelled campaigns */}
          {isCallManagerCampaign && (isCompleted || isCancelled) && callManagerData?.recipients && (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  This campaign is {status} and cannot be cancelled.
                </AlertDescription>
              </Alert>
              
              {/* Retry button - only show if there are non-completed recipients */}
              {callManagerData.recipients.filter(r => r.status !== 'completed').length > 0 && (
                <Card className="border-blue-200">
                  <CardContent className="pt-6 space-y-3">
                    <div className="text-sm text-muted-foreground text-center mb-2">
                      <strong>{callManagerData.recipients.filter(r => r.status !== 'completed').length}</strong> recipient(s) 
                      were not completed successfully. You can retry calling them.
                    </div>
                    
                    <Button 
                      variant="default" 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleRetry}
                      disabled={retrying}
                    >
                      {retrying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Preparing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry Failed/Pending Calls
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      This will create a new campaign excluding completed calls
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
        
        {/* Bottom padding for better scroll experience */}
        <div className="h-6" />
      </SheetContent>
    </Sheet>
  )
}
