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

export default router; 