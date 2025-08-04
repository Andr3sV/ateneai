import express from 'express';
import crypto from 'crypto';
import { supabase } from '../services/supabase';
import { socialConnectionsService } from '../services/social-connections';

const router = express.Router();

/**
 * Verificar signature de webhook de Meta
 */
function verifyWebhookSignature(payload: string, signature: string, appSecret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Crear o actualizar contacto basado en datos de webhook
 */
async function createOrUpdateContact(
  workspaceId: number, 
  senderId: string, 
  platform: 'facebook' | 'instagram',
  senderData?: any
): Promise<number> {
  try {
    // Buscar contacto existente
    const { data: existingContact } = await supabase
      .from('contacts_new')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('phone', senderId) // Usando phone como identificador único por ahora
      .single();

    if (existingContact) {
      return existingContact.id;
    }

    // Crear nuevo contacto
    const contactData = {
      workspace_id: workspaceId,
      name: senderData?.name || `${platform.charAt(0).toUpperCase() + platform.slice(1)} User`,
      phone: senderId,
      email: senderData?.email || null,
      status: 'Lead',
      country: senderData?.locale ? senderData.locale.split('_')[1] : null,
      instagram_url: platform === 'instagram' ? `https://instagram.com/${senderId}` : null,
      metadata: {
        platform,
        platform_user_id: senderId,
        platform_data: senderData || {},
        created_via: 'webhook'
      }
    };

    const { data: newContact, error } = await supabase
      .from('contacts_new')
      .insert(contactData)
      .select('id')
      .single();

    if (error) throw error;

    console.log(`✅ Created new contact ${newContact.id} for ${platform} user ${senderId}`);
    return newContact.id;
  } catch (error) {
    console.error('Error creating/updating contact:', error);
    throw error;
  }
}

/**
 * Crear o actualizar conversación
 */
async function createOrUpdateConversation(
  workspaceId: number,
  contactId: number,
  platform: 'facebook' | 'instagram'
): Promise<number> {
  try {
    // Buscar conversación activa existente
    const { data: existingConversation } = await supabase
      .from('conversations_new')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', contactId)
      .eq('status', 'open')
      .single();

    if (existingConversation) {
      return existingConversation.id;
    }

    // Crear nueva conversación
    const conversationData = {
      workspace_id: workspaceId,
      contact_id: contactId,
      status: 'open',
      assigned_to: 'agent_1', // IA por defecto
      metadata: {
        platform,
        created_via: 'webhook',
        auto_created: true
      }
    };

    const { data: newConversation, error } = await supabase
      .from('conversations_new')
      .insert(conversationData)
      .select('id')
      .single();

    if (error) throw error;

    console.log(`✅ Created new conversation ${newConversation.id} for contact ${contactId}`);
    return newConversation.id;
  } catch (error) {
    console.error('Error creating/updating conversation:', error);
    throw error;
  }
}

/**
 * Insertar mensaje en la base de datos
 */
async function insertMessage(
  workspaceId: number,
  conversationId: number,
  contactId: number,
  messageData: {
    content: string;
    sender_type: 'contact' | 'ai' | 'human';
    role: 'user' | 'assistant';
    platform_message_id?: string;
    metadata?: any;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages_new')
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        contact_id: contactId,
        content: messageData.content,
        role: messageData.role,
        sender_type: messageData.sender_type,
        metadata: {
          platform_message_id: messageData.platform_message_id,
          received_via: 'webhook',
          ...messageData.metadata
        }
      });

    if (error) throw error;

    console.log(`✅ Inserted message for conversation ${conversationId}`);
  } catch (error) {
    console.error('Error inserting message:', error);
    throw error;
  }
}

/**
 * GET /webhooks/facebook - Verificación del webhook de Facebook
 */
router.get('/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verificar token de verificación
  const expectedToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
  
  if (mode === 'subscribe' && token === expectedToken) {
    console.log('✅ Facebook webhook verified');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Facebook webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

/**
 * POST /webhooks/facebook - Recibir webhooks de Facebook Messenger
 */
router.post('/facebook', express.raw({ type: 'application/json' }), async (req, res): Promise<void> => {
  try {
    const signature = req.get('X-Hub-Signature-256');
    const payload = req.body.toString();

    // Verificar signature
    if (!signature || !verifyWebhookSignature(payload, signature, process.env.FACEBOOK_APP_SECRET!)) {
      console.error('❌ Invalid Facebook webhook signature');
      res.status(403).send('Forbidden');
    }

    const body = JSON.parse(payload);
    
    // Procesar cada entrada del webhook
    if (body.object === 'page') {
      for (const entry of body.entry) {
        const pageId = entry.id;
        
        // Buscar conexión asociada a esta página
        const { data: connection } = await supabase
          .from('social_connections')
          .select('workspace_id')
          .eq('platform', 'facebook')
          .eq('platform_page_id', pageId)
          .eq('is_active', true)
          .single();

        if (!connection) {
          console.warn(`⚠️ No active Facebook connection found for page ${pageId}`);
          continue;
        }

        // Procesar mensajes
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            await processFacebookMessage(messagingEvent, connection.workspace_id);
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('❌ Error processing Facebook webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Procesar mensaje de Facebook Messenger
 */
async function processFacebookMessage(messagingEvent: any, workspaceId: number) {
  try {
    const senderId = messagingEvent.sender.id;
    const recipientId = messagingEvent.recipient.id;
    const message = messagingEvent.message;

    if (!message || !message.text) {
      console.log('⚠️ Skipping non-text Facebook message');
      return;
    }

    // Crear o actualizar contacto
    const contactId = await createOrUpdateContact(
      workspaceId,
      senderId,
      'facebook',
      { 
        platform_user_id: senderId,
        page_id: recipientId 
      }
    );

    // Crear o actualizar conversación
    const conversationId = await createOrUpdateConversation(
      workspaceId,
      contactId,
      'facebook'
    );

    // Insertar mensaje
    await insertMessage(
      workspaceId,
      conversationId,
      contactId,
      {
        content: message.text,
        sender_type: 'contact',
        role: 'user',
        platform_message_id: message.mid,
        metadata: {
          platform: 'facebook',
          sender_id: senderId,
          recipient_id: recipientId,
          timestamp: messagingEvent.timestamp
        }
      }
    );

    console.log(`📱 Processed Facebook message from ${senderId} in workspace ${workspaceId}`);
  } catch (error) {
    console.error('❌ Error processing Facebook message:', error);
  }
}

/**
 * GET /webhooks/instagram - Verificación del webhook de Instagram
 */
router.get('/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verificar token de verificación
  const expectedToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
  
  if (mode === 'subscribe' && token === expectedToken) {
    console.log('✅ Instagram webhook verified');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Instagram webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

/**
 * POST /webhooks/instagram - Recibir webhooks de Instagram
 */
router.post('/instagram', express.raw({ type: 'application/json' }), async (req, res): Promise<void> => {
  try {
    const signature = req.get('X-Hub-Signature-256');
    const payload = req.body.toString();

    // Verificar signature
    if (!signature || !verifyWebhookSignature(payload, signature, process.env.FACEBOOK_APP_SECRET!)) {
      console.error('❌ Invalid Instagram webhook signature');
      res.status(403).send('Forbidden');
    }

    const body = JSON.parse(payload);
    
    // Procesar cada entrada del webhook
    if (body.object === 'instagram') {
      for (const entry of body.entry) {
        const instagramAccountId = entry.id;
        
        // Buscar conexión asociada a esta cuenta de Instagram
        const { data: connection } = await supabase
          .from('social_connections')
          .select('workspace_id')
          .eq('platform', 'instagram')
          .eq('platform_page_id', instagramAccountId)
          .eq('is_active', true)
          .single();

        if (!connection) {
          console.warn(`⚠️ No active Instagram connection found for account ${instagramAccountId}`);
          continue;
        }

        // Procesar mensajes
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            await processInstagramMessage(messagingEvent, connection.workspace_id);
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('❌ Error processing Instagram webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Procesar mensaje de Instagram Direct
 */
async function processInstagramMessage(messagingEvent: any, workspaceId: number) {
  try {
    const senderId = messagingEvent.sender.id;
    const recipientId = messagingEvent.recipient.id;
    const message = messagingEvent.message;

    if (!message || !message.text) {
      console.log('⚠️ Skipping non-text Instagram message');
      return;
    }

    // Crear o actualizar contacto
    const contactId = await createOrUpdateContact(
      workspaceId,
      senderId,
      'instagram',
      { 
        platform_user_id: senderId,
        instagram_account_id: recipientId 
      }
    );

    // Crear o actualizar conversación
    const conversationId = await createOrUpdateConversation(
      workspaceId,
      contactId,
      'instagram'
    );

    // Insertar mensaje
    await insertMessage(
      workspaceId,
      conversationId,
      contactId,
      {
        content: message.text,
        sender_type: 'contact',
        role: 'user',
        platform_message_id: message.mid,
        metadata: {
          platform: 'instagram',
          sender_id: senderId,
          recipient_id: recipientId,
          timestamp: messagingEvent.timestamp
        }
      }
    );

    console.log(`📷 Processed Instagram message from ${senderId} in workspace ${workspaceId}`);
  } catch (error) {
    console.error('❌ Error processing Instagram message:', error);
  }
}

export default router;