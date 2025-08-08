import { Router } from 'express';
import { db } from '../services/supabase-workspace';

const router = Router();

// Public endpoint intended for n8n to fetch a direct link and minimal conversation context
// GET /api/public/conversations/:workspaceId/:conversationId/link
router.get('/:workspaceId/:conversationId/link', async (req, res): Promise<void> => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const conversationId = parseInt(req.params.conversationId);

    if (Number.isNaN(workspaceId) || Number.isNaN(conversationId)) {
      res.status(400).json({ success: false, error: 'Invalid workspaceId or conversationId' });
      return;
    }

    // Fetch conversation scoped to workspace
    const conversation = await db.getConversation(conversationId, workspaceId);
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://app.ateneai.com';
    const directLink = `${baseUrl}/conversations?open=${conversationId}`;

    const contactName = (conversation as any)?.contact?.name || (conversation as any)?.contact_name || 'Cliente';
    const contactPhone = (conversation as any)?.contact?.phone || (conversation as any)?.contact_phone || null;
    const status = (conversation as any)?.status || 'unknown';
    const assignedTo = (conversation as any)?.assigned_to || 'unknown';
    const channelType = (conversation as any)?.channel_type || (conversation as any)?.metadata?.platform || 'unknown';

    res.json({
      success: true,
      data: {
        conversation_id: conversationId,
        workspace_id: workspaceId,
        direct_link: directLink,
        contact: {
          name: contactName,
          phone: contactPhone,
        },
        conversation_status: status,
        assigned_to: assignedTo,
        channel_type: channelType,
      },
    });
  } catch (error: any) {
    console.error('❌ Error generating public conversation link:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

