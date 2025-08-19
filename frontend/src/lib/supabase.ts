import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Be tolerant during build/prerender when env might be absent
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);

// Database tables
export const TABLES = {
  CLIENTS: 'clients',
  CONTACTS: 'contacts',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  // Workspace-based schema (v2)
  CONVERSATIONS_NEW: 'conversations_new',
  MESSAGES_NEW: 'messages_new',
  ANALYTICS: 'analytics',
} as const;

// Helper functions for common operations
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

  async updateClient(id: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from(TABLES.CLIENTS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Conversation operations
  async getConversations(clientId: string) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select(`
        *,
        contact:contacts(*),
        messages:messages(*)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createConversation(conversationData: Partial<any>) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .insert(conversationData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getConversation(id: string) {
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

  // Message operations
  async createMessage(messageData: Partial<any>) {
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .insert(messageData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getConversationMessages(conversationId: string) {
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Analytics operations
  async getAnalytics(clientId: string, filters: any = {}) {
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

  // Contact operations
  async createContact(contactData: Partial<any>) {
    const { data, error } = await supabase
      .from(TABLES.CONTACTS)
      .insert(contactData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getContactByEmail(clientId: string, email: string) {
    const { data, error } = await supabase
      .from(TABLES.CONTACTS)
      .select('*')
      .eq('client_id', clientId)
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },
};

// Real-time subscriptions
export const subscribeToConversation = (conversationId: string, callback: (payload: any) => void) => {
  if (!supabase) return { unsubscribe: () => {} } as any
  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      callback
    )
    .subscribe();
};

export const subscribeToClientConversations = (clientId: string, callback: (payload: any) => void) => {
  if (!supabase) return { unsubscribe: () => {} } as any
  return supabase
    .channel(`client:${clientId}:conversations`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `client_id=eq.${clientId}`,
      },
      callback
    )
    .subscribe();
};

// Workspace-based realtime helpers (v2)
export const subscribeToWorkspaceConversations = (workspaceId: number, callback: (payload: any) => void) => {
  if (!supabase) return { unsubscribe: () => {} } as any
  return supabase
    .channel(`workspace:${workspaceId}:conversations_new`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLES.CONVERSATIONS_NEW,
        filter: `workspace_id=eq.${workspaceId}`,
      },
      callback
    )
    .subscribe();
};

export const subscribeToWorkspaceMessages = (workspaceId: number, callback: (payload: any) => void) => {
  if (!supabase) return { unsubscribe: () => {} } as any
  return supabase
    .channel(`workspace:${workspaceId}:messages_new`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: TABLES.MESSAGES_NEW,
        filter: `workspace_id=eq.${workspaceId}`,
      },
      callback
    )
    .subscribe();
};

export default supabase; 