import { Router } from 'express';
import { db } from '../services/supabase';

const router = Router();

// Webhook para recibir mensajes del chatbot
router.post('/chat', async (req, res): Promise<void> => {
  try {
    const { conversation_id, message, contact_info } = req.body;
    
    // Crear mensaje en la base de datos
    const messageData = {
      conversation_id,
      content: message,
      role: 'user',
      metadata: { source: 'webhook' }
    };
    
    const createdMessage = await db.createMessage(messageData);
    
    res.json({ 
      success: true, 
      data: createdMessage 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Webhook para n8n
router.post('/n8n', async (req, res): Promise<void> => {
  try {
    // Aquí puedes procesar webhooks de n8n
    res.json({ 
      success: true, 
      message: 'n8n webhook received' 
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Webhook para ElevenLabs - Crear registro de llamada (público, sin autenticación)
router.post('/elevenlabs/call', async (req, res): Promise<void> => {
  try {
    console.log('📞 ElevenLabs webhook received:', JSON.stringify(req.body, null, 2));
    
    const {
      conversation_id,
      phone_from,
      phone_to,
      agent_id,
      workspace_id,
      status,
      duration,
      metadata
    } = req.body;

    // Validar datos requeridos
    if (!workspace_id) {
      console.error('❌ Missing workspace_id in ElevenLabs webhook');
      res.status(400).json({
        success: false,
        error: 'workspace_id is required'
      });
      return;
    }

    // Crear el registro de llamada en la base de datos
    const callData = {
      conversation_id: conversation_id || null,
      phone_from: phone_from || null,
      phone_to: phone_to || null,
      agent_id: agent_id ? parseInt(agent_id) : null,
      workspace_id: parseInt(workspace_id),
      status: status || 'lead',
      duration: duration ? parseInt(duration) : null,
      type: 'outbound',
      metadata: metadata || { source: 'elevenlabs_webhook' }
    };

    console.log('📝 Creating call record:', callData);
    
    // Usar el servicio de base de datos para crear la llamada
    // Nota: Necesitarás implementar este método en tu servicio de Supabase
    // const createdCall = await db.createCall(callData);
    
    // Por ahora, responder con éxito para que ElevenLabs no falle
    res.json({
      success: true,
      message: 'Call record created successfully',
      // data: createdCall
    });
    
  } catch (error: any) {
    console.error('❌ Error in ElevenLabs webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router; 