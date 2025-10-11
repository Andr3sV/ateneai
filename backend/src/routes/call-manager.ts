import { Router } from 'express';
import { db } from '../services/supabase-workspace';
import { requireWorkspaceContext } from '../middleware/workspace';
import axios from 'axios';

const router = Router();
const CALL_MANAGER_BASE_URL = 'https://call-manager-production.up.railway.app/api/batch-calling';

// Submit batch to call-manager
router.post('/submit', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }

    const {
      call_name,
      agent_id,
      agent_phone_number_id,
      recipients,
      scheduled_time_unix,
      phone_provider
    } = req.body;

    // Validation
    if (!call_name || !agent_id || !agent_phone_number_id || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: call_name, agent_id, agent_phone_number_id, recipients'
      });
      return;
    }

    // Build payload for call-manager (don't send null values)
    const callManagerPayload: any = {
      call_name,
      agent_id,
      agent_phone_number_id,
      recipients
    };

    // Only add optional fields if they have values
    if (scheduled_time_unix) {
      callManagerPayload.scheduled_time_unix = scheduled_time_unix;
    }
    if (phone_provider) {
      callManagerPayload.phone_provider = phone_provider;
    }

    console.log('📤 Sending to Call Manager:', {
      url: `${CALL_MANAGER_BASE_URL}/submit`,
      payload: {
        ...callManagerPayload,
        recipients: `[${callManagerPayload.recipients.length} recipients]`
      }
    });

    // Forward request to call-manager
    const callManagerResponse = await axios.post(`${CALL_MANAGER_BASE_URL}/submit`, callManagerPayload);

    console.log('📥 Call Manager Response:', {
      success: callManagerResponse.data?.success,
      status: callManagerResponse.status,
      batchId: callManagerResponse.data?.data?.id,
      batchStatus: callManagerResponse.data?.data?.status,
      totalScheduled: callManagerResponse.data?.data?.total_calls_scheduled,
      totalDispatched: callManagerResponse.data?.data?.total_calls_dispatched
    });

    if (!callManagerResponse.data?.success) {
      res.status(500).json({
        success: false,
        error: callManagerResponse.data?.error || 'Call-manager returned an error'
      });
      return;
    }

    const batchData = callManagerResponse.data.data;

    // Save to database
    const batchRecord = await db.createBatchCall(req.workspaceContext.workspaceId, {
      name: call_name,
      phone_external_id: agent_phone_number_id,
      agent_external_id: agent_id,
      status: batchData.status || 'pending',
      total_recipients: batchData.total_calls_scheduled || recipients.length,
      processed_recipients: batchData.total_calls_dispatched || 0,
      campaign_id: null, // Not using campaign_id anymore
      metadata: {
        external_batch_id: batchData.id,
        phone_provider: batchData.phone_provider,
        scheduled_time: batchData.scheduled_time_unix,
        agent_name: batchData.agent_name
      }
    });

    console.log(`✅ Batch created: ${batchData.id} (DB ID: ${batchRecord.id})`);

    res.json({
      success: true,
      data: {
        batch_id: batchRecord.id,
        external_batch_id: batchData.id,
        call_manager_response: batchData
      }
    });

  } catch (error: any) {
    console.error('❌ Error in POST /call-manager/submit:', error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      res.status(status).json({
        success: false,
        error: errorData?.error || errorData?.errors?.[0]?.msg || 'Call-manager API error',
        details: errorData
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
});

// Cancel batch
router.post('/:batchId/cancel', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }

    const batchId = parseInt(req.params.batchId);
    if (!Number.isFinite(batchId)) {
      res.status(400).json({ success: false, error: 'Invalid batch ID' });
      return;
    }

    // Get batch from database
    const batch = await db.getBatchCallById(req.workspaceContext.workspaceId, batchId);
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' });
      return;
    }

    // Extract external_batch_id from metadata
    let externalBatchId: string | null = null;
    if (batch.file_url && batch.file_url.includes('metadata:')) {
      try {
        const metadataStr = batch.file_url.split('metadata:')[1];
        const metadata = JSON.parse(metadataStr);
        externalBatchId = metadata.external_batch_id;
      } catch (e) {
        console.warn('Failed to parse metadata:', e);
      }
    }

    if (!externalBatchId) {
      res.status(400).json({
        success: false,
        error: 'Batch does not have external_batch_id (not created with call-manager)'
      });
      return;
    }

    console.log(`📤 Canceling batch in Call Manager: ${externalBatchId}`);

    // Cancel in call-manager
    const callManagerResponse = await axios.post(`${CALL_MANAGER_BASE_URL}/${externalBatchId}/cancel`);

    console.log('📥 Cancel response:', {
      success: callManagerResponse.data?.success,
      status: callManagerResponse.status
    });

    if (!callManagerResponse.data?.success) {
      res.status(400).json({
        success: false,
        error: callManagerResponse.data?.error || 'Failed to cancel batch'
      });
      return;
    }

    const updatedBatchData = callManagerResponse.data.data;

    // Update database
    await db.updateBatchCall(req.workspaceContext.workspaceId, batchId, {
      status: updatedBatchData?.status || 'cancelled',
      processed_recipients: updatedBatchData?.total_calls_dispatched || batch.processed_recipients
    });

    console.log(`✅ Batch cancelled: ${externalBatchId}`);

    res.json({
      success: true,
      data: {
        batch_id: batchId,
        external_batch_id: externalBatchId,
        call_manager_response: updatedBatchData
      }
    });

  } catch (error: any) {
    console.error('❌ Error in POST /call-manager/:batchId/cancel:', error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      console.error('Axios error details:', {
        status,
        data: errorData,
        message: error.message
      });
      
      // Extract error message, handling [object Object] issue
      let errorMessage = 'Call-manager API error';
      if (errorData?.error) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (typeof errorData.error === 'object') {
          errorMessage = JSON.stringify(errorData.error);
        }
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
      
      res.status(status).json({
        success: false,
        error: errorMessage,
        details: errorData
      });
    } else {
      console.error('Non-axios error:', {
        message: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
});

// Get batch status
router.get('/:batchId/status', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }

    const batchId = parseInt(req.params.batchId);
    if (!Number.isFinite(batchId)) {
      res.status(400).json({ success: false, error: 'Invalid batch ID' });
      return;
    }

    // Get batch from database
    const batch = await db.getBatchCallById(req.workspaceContext.workspaceId, batchId);
    if (!batch) {
      res.status(404).json({ success: false, error: 'Batch not found' });
      return;
    }

    console.log(`🔍 Getting status for batch ${batchId}, file_url:`, batch.file_url);

    // Extract external_batch_id from metadata
    let externalBatchId: string | null = null;
    if (batch.file_url && batch.file_url.includes('metadata:')) {
      try {
        const metadataStr = batch.file_url.split('metadata:')[1];
        const metadata = JSON.parse(metadataStr);
        externalBatchId = metadata.external_batch_id;
        console.log(`✅ Found external_batch_id: ${externalBatchId}`);
      } catch (e) {
        console.warn('⚠️ Failed to parse metadata:', e);
      }
    }

    if (!externalBatchId) {
      console.log(`❌ No external_batch_id found for batch ${batchId}. This batch was not created with call-manager.`);
      res.status(400).json({
        success: false,
        error: 'This campaign was not created with the new call-manager system and cannot be managed through this interface.'
      });
      return;
    }

    // Get status from call-manager
    const callManagerResponse = await axios.get(`${CALL_MANAGER_BASE_URL}/${externalBatchId}`);

    if (!callManagerResponse.data?.success) {
      res.status(500).json({
        success: false,
        error: callManagerResponse.data?.error || 'Call-manager returned an error'
      });
      return;
    }

    const batchData = callManagerResponse.data.data;

    // Update database with latest info
    await db.updateBatchCall(req.workspaceContext.workspaceId, batchId, {
      status: batchData.status,
      processed_recipients: batchData.total_calls_dispatched || 0,
      total_recipients: batchData.total_calls_scheduled || batch.total_recipients
    });

    res.json({
      success: true,
      data: {
        batch_id: batchId,
        external_batch_id: externalBatchId,
        call_manager_response: batchData,
        database_record: batch
      }
    });

  } catch (error: any) {
    console.error('❌ Error in GET /call-manager/:batchId/status:', error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      res.status(status).json({
        success: false,
        error: errorData?.error || 'Call-manager API error',
        details: errorData
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
});

// Get aggregated campaign recipients statistics
router.get('/dashboard/recipients-stats', requireWorkspaceContext, async (req, res): Promise<void> => {
  try {
    if (!req.workspaceContext) {
      res.status(401).json({ success: false, error: 'No workspace context available' });
      return;
    }

    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };

    // Get all batch calls from the workspace within the date range
    const batches = await db.listBatchCalls(req.workspaceContext.workspaceId, { limit: 1000 });
    
    // Filter by date range if provided
    let filteredBatches = batches;
    if (start_date && end_date) {
      const startDateTime = new Date(start_date).getTime();
      const endDateTime = new Date(end_date).getTime();
      filteredBatches = batches.filter(b => {
        const createdAt = new Date(b.created_at).getTime();
        return createdAt >= startDateTime && createdAt <= endDateTime;
      });
    }

    // Only process Call-Manager campaigns (those with external_batch_id)
    const callManagerBatches = filteredBatches.filter(batch => {
      if (!batch.file_url || !batch.file_url.includes('metadata:')) return false;
      try {
        const metadataStr = batch.file_url.split('metadata:')[1];
        const metadata = JSON.parse(metadataStr);
        return !!metadata.external_batch_id;
      } catch {
        return false;
      }
    });

    console.log(`📊 Processing ${callManagerBatches.length} Call-Manager campaigns for recipient stats`);

    // Aggregate statistics from all campaigns
    let totalCompleted = 0;
    let totalFailed = 0;
    let totalPending = 0;
    let totalInProgress = 0;
    let totalVoicemail = 0;
    let totalRecipients = 0;

    // Fetch detailed status from Call-Manager for each batch
    for (const batch of callManagerBatches) {
      try {
        const metadataStr = batch.file_url!.split('metadata:')[1];
        const metadata = JSON.parse(metadataStr);
        const externalBatchId = metadata.external_batch_id;

        if (!externalBatchId) continue;

        // Get batch details from Call-Manager
        const callManagerResponse = await axios.get(`${CALL_MANAGER_BASE_URL}/${externalBatchId}`);
        
        if (callManagerResponse.data?.success && callManagerResponse.data?.data?.recipients) {
          const recipients = callManagerResponse.data.data.recipients;
          totalRecipients += recipients.length;

          // Count by status
          for (const recipient of recipients) {
            switch (recipient.status) {
              case 'completed':
                totalCompleted++;
                break;
              case 'failed':
                totalFailed++;
                break;
              case 'pending':
                totalPending++;
                break;
              case 'in_progress':
                totalInProgress++;
                break;
              case 'voicemail':
                totalVoicemail++;
                break;
            }
          }
        }
      } catch (error: any) {
        console.warn(`⚠️ Could not fetch recipients for batch ${batch.id}:`, error.message);
        // Continue with other batches
      }
    }

    const stats = {
      total_recipients: totalRecipients,
      completed: totalCompleted,
      failed: totalFailed,
      pending: totalPending,
      in_progress: totalInProgress,
      voicemail: totalVoicemail,
      success_rate: totalRecipients > 0 ? Math.round((totalCompleted / totalRecipients) * 100) : 0,
      failure_rate: totalRecipients > 0 ? Math.round((totalFailed / totalRecipients) * 100) : 0
    };

    console.log(`✅ Campaign recipients stats:`, stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('❌ Error in GET /call-manager/dashboard/recipients-stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

export default router;

