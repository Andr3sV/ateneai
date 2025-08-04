import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Database tables (esquema existente)
export const TABLES = {
  CLIENTS: 'clients',
  CONTACTS: 'contacts',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  ANALYTICS: 'analytics',
} as const;

// Helper functions que respetan tu lógica existente
export const db = {
  // Client operations
  async getClientByClerkId(clerkUserId: string) {
    const { data, error } = await supabase
      .from(TABLES.CLIENTS)
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createClient(clientData: Partial<any>) {
    const { data, error } = await supabase
      .from(TABLES.CLIENTS)
      .insert(clientData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateClient(id: number, updates: Partial<any>) {
    const { data, error } = await supabase
      .from(TABLES.CLIENTS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Conversation operations (respeta tu lógica de assigned_to)
  async createConversation(conversationData: Partial<any>) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .insert(conversationData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getConversation(id: number) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select(`
        *,
        contact:contacts(*),
        messages:messages(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateConversation(id: number, updates: Partial<any>) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Message operations (respeta tu lógica de sender)
  async createMessage(messageData: Partial<any>) {
    // Mapear desde la app a tu esquema existente
    const mappedData = {
      conversation_id: messageData.conversation_id,
      sender: messageData.role === 'assistant' ? 'bot' : 'contact', // Tu lógica
      body: messageData.content,
      timestamp: messageData.created_at || new Date().toISOString(),
      contact_id: messageData.contact_id,
      total_tokens: messageData.metadata?.tokens_used,
      metadata: messageData.metadata,
    };

    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .insert(mappedData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getConversationMessages(conversationId: number) {
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    
    // Mapear al formato de la aplicación respetando tu lógica
    return data.map(message => ({
      id: message.id,
      conversation_id: message.conversation_id,
      content: message.body,
      role: message.sender === 'bot' ? 'assistant' : 'user', // Tu lógica
      metadata: message.metadata || {},
      created_at: message.timestamp,
    }));
  },

  // Analytics operations
  async getAnalytics(clientId: number, filters: any = {}) {
    let query = supabase
      .from(TABLES.ANALYTICS)
      .select('*')
      .eq('client_id', clientId);

    if (filters.start_date) {
      query = query.gte('date', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('date', filters.end_date);
    }

    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async updateAnalytics(analyticsData: Partial<any>) {
    const { data, error } = await supabase
      .from(TABLES.ANALYTICS)
      .upsert(analyticsData, { onConflict: 'client_id,date' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Contact operations (preserva campos de Instagram)
  async createContact(contactData: Partial<any>) {
    const { data, error } = await supabase
      .from(TABLES.CONTACTS)
      .insert(contactData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getContactByEmail(clientId: number, email: string) {
    const { data, error } = await supabase
      .from(TABLES.CONTACTS)
      .select('*')
      .eq('client_id', clientId)
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Métodos específicos que respetan tu lógica
  async getContactsByClient(clientId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONTACTS)
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getConversationsByClient(clientId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Método para obtener conversaciones con mensajes
  async getConversationWithMessages(conversationId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select(`
        *,
        contact:contacts(*),
        messages:messages(*)
      `)
      .eq('id', conversationId)
      .single();
    
    if (error) throw error;
    
    // Mapear mensajes respetando tu lógica
    if (data.messages) {
      data.messages = data.messages.map((message: any) => ({
        id: message.id,
        conversation_id: message.conversation_id,
        content: message.body,
        role: message.sender === 'bot' ? 'assistant' : 'user', // Tu lógica
        metadata: message.metadata || {},
        created_at: message.timestamp,
      }));
    }
    
    return data;
  },

  // Métodos específicos para tu lógica de escalación
  async getEscalatedConversations(clientId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq('client_id', clientId)
      .eq('assigned_to', 'human') // Tu lógica de escalación
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getConversationsByAssignment(clientId: number, assignedTo: 'agent_1' | 'human') {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq('client_id', clientId)
      .eq('assigned_to', assignedTo)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Método para escalar conversación
  async escalateConversation(conversationId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .update({ assigned_to: 'human' }) // Tu lógica
      .eq('id', conversationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Método para desescalar conversación
  async deescalateConversation(conversationId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .update({ assigned_to: 'agent_1' }) // Tu lógica
      .eq('id', conversationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Métodos para Instagram (preserva tu lógica existente)
  async getContactsByInstagramId(instagramId: string) {
    const { data, error } = await supabase
      .from(TABLES.CONTACTS)
      .select('*')
      .eq('instagram_id', instagramId);
    
    if (error) throw error;
    return data;
  },

  async updateContactInstagramData(contactId: number, instagramData: {
    instagram_url?: string;
    instagram_id?: string;
    instagram_followers?: string;
  }) {
    const { data, error } = await supabase
      .from(TABLES.CONTACTS)
      .update(instagramData)
      .eq('id', contactId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

export default supabase; 