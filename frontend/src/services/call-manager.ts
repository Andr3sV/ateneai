/**
 * Call Manager Service
 * Integration with call-manager API for batch calling
 * https://call-manager-production.up.railway.app
 */

const CALL_MANAGER_BASE_URL = 'https://call-manager-production.up.railway.app/api/batch-calling'

export type CallManagerRecipient = {
  phone_number: string
  conversation_initiation_client_data?: {
    dynamic_variables?: Record<string, string>
  }
}

export type CallManagerSubmitRequest = {
  call_name: string
  agent_id: string
  agent_phone_number_id: string
  recipients: CallManagerRecipient[]
  scheduled_time_unix?: number | null
  phone_provider?: 'twilio' | 'sip_trunk' | null
}

export type CallManagerBatchStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'

export type CallManagerRecipientStatus = {
  id: string
  phone_number: string
  status: 'pending' | 'initiated' | 'voicemail' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  conversation_id?: string
}

export type CallManagerBatchResponse = {
  id: string
  phone_number_id: string
  phone_provider: string
  name: string
  agent_id: string
  created_at_unix: number
  scheduled_time_unix?: number
  total_calls_dispatched: number
  total_calls_scheduled: number
  last_updated_at_unix: number
  status: CallManagerBatchStatus
  agent_name?: string
  recipients?: CallManagerRecipientStatus[]
}

export type CallManagerApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  errors?: Array<{
    type: string
    msg: string
    path: string
    location: string
  }>
}

/**
 * Submit a new batch of calls to call-manager
 */
export async function submitBatchCalls(
  request: CallManagerSubmitRequest
): Promise<CallManagerApiResponse<CallManagerBatchResponse>> {
  try {
    const response = await fetch(`${CALL_MANAGER_BASE_URL}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.errors?.[0]?.msg || 'Failed to submit batch',
        errors: data.errors,
      }
    }

    return data
  } catch (error) {
    console.error('Error submitting batch calls:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Cancel a batch of calls
 */
export async function cancelBatchCalls(
  batchId: string
): Promise<CallManagerApiResponse<CallManagerBatchResponse>> {
  try {
    const response = await fetch(`${CALL_MANAGER_BASE_URL}/${batchId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to cancel batch',
      }
    }

    return data
  } catch (error) {
    console.error('Error canceling batch calls:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Get status of a batch
 */
export async function getBatchStatus(
  batchId: string
): Promise<CallManagerApiResponse<CallManagerBatchResponse>> {
  try {
    const response = await fetch(`${CALL_MANAGER_BASE_URL}/${batchId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to get batch status',
      }
    }

    return data
  } catch (error) {
    console.error('Error getting batch status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Check if call-manager service is healthy
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch('https://call-manager-production.up.railway.app/health')
    return response.ok
  } catch (error) {
    console.error('Call-manager health check failed:', error)
    return false
  }
}

