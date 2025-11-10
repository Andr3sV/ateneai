import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Database tables (NEW workspace-based schema)
export const TABLES = {
  WORKSPACES: 'workspaces',
  USERS: 'users_new',
  WORKSPACE_USERS: 'workspace_users',
  CONTACTS: 'contacts_new',
  CONVERSATIONS: 'conversations_new',
  MESSAGES: 'messages_new',
  CALLS: 'calls',
  AGENTS: 'agents',
  PHONE_NUMBERS: 'phone_numbers',
  BATCH_CALLS: 'batch_calls',
  BATCH_CALL_RECIPIENTS: 'batch_call_recipients',
  // Keep old tables for gradual migration
  CLIENTS: 'clients',
  CONTACTS_OLD: 'contacts',
  CONVERSATIONS_OLD: 'conversations',
  MESSAGES_OLD: 'messages',
  ANALYTICS: 'analytics',
} as const;

// Workspace Context Helper
export class WorkspaceContext {
  constructor(public workspaceId: number, public userId?: number) {}
  
  static async fromClerkUserId(clerkUserId: string): Promise<WorkspaceContext> {
    // 1. Get user by Clerk ID
    const { data: user, error: userError } = await supabase
      .from(TABLES.USERS)
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    if (userError) throw new Error(`User not found for Clerk ID: ${clerkUserId}`);
    
    // 2. Get user's primary workspace
    const { data: workspaceUser, error: workspaceError } = await supabase
      .from(TABLES.WORKSPACE_USERS)
      .select('workspace_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('joined_at', { ascending: true })
      .limit(1)
      .single();
    
    if (workspaceError) throw new Error(`No workspace found for user: ${user.id}`);
    
    return new WorkspaceContext(workspaceUser.workspace_id, user.id);
  }
}

// Database operations (workspace-scoped)
export const db = {
  // ================================================
  // WORKSPACE & USER OPERATIONS
  // ================================================
  
  async getWorkspace(workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.WORKSPACES)
      .select('*')
      .eq('id', workspaceId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getWorkspaceVoiceApiKey(workspaceId: number): Promise<string | null> {
    const { data, error } = await supabase
      .from(TABLES.WORKSPACES)
      .select('voice_api_key')
      .eq('id', workspaceId)
      .single();
    if (error) throw error;
    return (data?.voice_api_key as string | null) || null;
  },

  // ================================================
  // PHONE NUMBERS (catalog)
  // ================================================
  async listPhoneNumbers(workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.PHONE_NUMBERS)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  
  async getUserByClerkId(clerkUserId: string) {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserRole(workspaceId: number, userId: number): Promise<'owner' | 'admin' | 'member' | 'viewer' | null> {
    const { data, error } = await supabase
      .from(TABLES.WORKSPACE_USERS)
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return (data?.role as any) || null;
  },
  
  async createUser(userData: Partial<any>) {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .insert(userData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  // ================================================
  // CONTACT OPERATIONS (workspace-scoped)
  // ================================================
  
  async getContacts(workspaceId: number, filters: any = {}) {
    // Fetch base contacts
    let query = supabase
      .from(TABLES.CONTACTS)
      .select('*')
      .eq('workspace_id', workspaceId);
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.search) {
      // Search by name OR phone (case-insensitive)
      const s = String(filters.search)
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%`);
    }
    
    // Fix: Use either range() OR limit(), not both
    if (filters.offset && filters.limit) {
      query = query.range(filters.offset, filters.offset + filters.limit - 1);
    } else if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;

    // Enrich with last_interaction combining latest conversation or call date
    const contactIds = (data || []).map(c => c.id);
    if (contactIds.length === 0) return data;

    // Fetch latest conversation per contact
    const { data: convs, error: convErr } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select('contact_id, created_at')
      .eq('workspace_id', workspaceId)
      .in('contact_id', contactIds);
    if (convErr) throw convErr;

    // Fetch latest call per contact
    const { data: calls, error: callsErr } = await supabase
      .from(TABLES.CALLS)
      .select('contact_id, created_at')
      .eq('workspace_id', workspaceId)
      .in('contact_id', contactIds);
    if (callsErr) throw callsErr;

    const latestByContact: Record<number, string> = {};
    (convs || []).forEach(row => {
      if (!row.contact_id || !row.created_at) return;
      const prev = latestByContact[row.contact_id];
      if (!prev || new Date(row.created_at) > new Date(prev)) latestByContact[row.contact_id] = row.created_at as unknown as string;
    });
    (calls || []).forEach(row => {
      if (!row.contact_id || !row.created_at) return;
      const prev = latestByContact[row.contact_id];
      if (!prev || new Date(row.created_at) > new Date(prev)) latestByContact[row.contact_id] = row.created_at as unknown as string;
    });

    return (data || []).map(c => ({ ...c, last_interaction: latestByContact[c.id] || c.last_interaction || null }));
  },
  
  async getContact(contactId: number, workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONTACTS)
      .select('*')
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async createContact(contactData: Partial<any>, workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONTACTS)
      .insert({ ...contactData, workspace_id: workspaceId })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateContact(contactId: number, updates: Partial<any>, workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONTACTS)
      .update(updates)
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async getContactMetrics(workspaceId: number) {
    // Get contact counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from(TABLES.CONTACTS)
      .select('status')
      .eq('workspace_id', workspaceId);
    
    if (statusError) throw statusError;
    
    // Get contacts with phone numbers
    const { data: phoneContacts, error: phoneError } = await supabase
      .from(TABLES.CONTACTS)
      .select('phone')
      .eq('workspace_id', workspaceId)
      .not('phone', 'is', null)
      .neq('phone', '');
    
    if (phoneError) throw phoneError;
    
    // Get contacts with email
    const { data: emailContacts, error: emailError } = await supabase
      .from(TABLES.CONTACTS)
      .select('email')
      .eq('workspace_id', workspaceId)
      .not('email', 'is', null)
      .neq('email', '');
    
    if (emailError) throw emailError;
    
    // Get contacts with Instagram
    const { data: igContacts, error: igError } = await supabase
      .from(TABLES.CONTACTS)
      .select('instagram_url')
      .eq('workspace_id', workspaceId)
      .not('instagram_url', 'is', null)
      .neq('instagram_url', '');
    
    if (igError) throw igError;
    
    // Process status counts (including MQL)
    const statusBreakdown = statusCounts.reduce((acc: any, contact: any) => {
      const status = contact.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalContacts: statusCounts.length,
      totalLeads: statusBreakdown['Lead'] || 0,
      totalMQLs: statusBreakdown['MQL'] || 0,
      totalClients: statusBreakdown['Client'] || 0,
      contactsWithPhone: phoneContacts.length,
      contactsWithEmail: emailContacts.length,
      contactsWithInstagram: igContacts.length,
      statusBreakdown
    };
  },
  
  // ================================================
  // CONVERSATION OPERATIONS (workspace-scoped)
  // ================================================
  
  async getConversations(workspaceId: number, filters: any = {}) {
    // First get the total count
    let countQuery = supabase
      .from(TABLES.CONVERSATIONS)
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);
    
    if (filters.status) {
      countQuery = countQuery.eq('status', filters.status);
    }
    
    if (filters.assigned_to) {
      countQuery = countQuery.eq('assigned_to', filters.assigned_to);
    }

    if (filters.contact_id) {
      countQuery = countQuery.eq('contact_id', filters.contact_id);
    }
    if (typeof filters.assigned_user_id === 'number') {
      countQuery = countQuery.eq('assigned_user_id', filters.assigned_user_id)
    }

    if (filters.search) {
      // For count query, we need to search by contact name or phone using a subquery approach
      const { data: contactIds, error: contactError } = await supabase
        .from(TABLES.CONTACTS)
        .select('id')
        .eq('workspace_id', workspaceId)
        .or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);

      if (contactError) throw contactError;

      if (contactIds && contactIds.length > 0) {
        const ids = contactIds.map(c => c.id);
        countQuery = countQuery.in('contact_id', ids);
      } else {
        // If no contacts found, return empty result
        countQuery = countQuery.eq('id', -1); // This will return no results
      }
    }
    
    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    // Then get the actual data with pagination
    let query = supabase
      .from(TABLES.CONVERSATIONS)
      .select(`
        *,
        contact:contacts_new(*),
        assigned_user:users_new(id, first_name, last_name, email),
        last_message:messages_new!messages_new_conversation_id_fkey(
          content,
          sender_type,
          created_at
        )
      `)
      .eq('workspace_id', workspaceId);
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    if (filters.contact_id) {
      query = query.eq('contact_id', filters.contact_id);
    }
    if (typeof filters.assigned_user_id === 'number') {
      query = query.eq('assigned_user_id', filters.assigned_user_id)
    }

    if (filters.search) {
      // Search by contact name or phone using a subquery approach
      const { data: contactIds, error: contactError } = await supabase
        .from(TABLES.CONTACTS)
        .select('id')
        .eq('workspace_id', workspaceId)
        .or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);

      if (contactError) throw contactError;

      if (contactIds && contactIds.length > 0) {
        const ids = contactIds.map(c => c.id);
        query = query.in('contact_id', ids);
      } else {
        // If no contacts found, return empty result
        query = query.eq('id', -1); // This will return no results
      }
    }
    
    // Fix: Use either range() OR limit(), not both
    if (filters.offset && filters.limit) {
      query = query.range(filters.offset, filters.offset + filters.limit - 1);
    } else if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Process to get only the latest message for each conversation
    const processedData = data?.map(conversation => {
      if (conversation.last_message && Array.isArray(conversation.last_message)) {
        // Get the most recent message
        const sortedMessages = conversation.last_message.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        conversation.last_message = sortedMessages[0] || null;
      }
      return conversation;
    });
    
    return {
      data: processedData,
      total: count || 0
    };
  },
  
  async getConversation(conversationId: number, workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select(`
        *,
        contact:contacts_new(*),
        assigned_user:users_new(id, first_name, last_name, email),
        messages:messages_new(*)
      `)
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async createConversation(conversationData: Partial<any>, workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .insert({ ...conversationData, workspace_id: workspaceId })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateConversation(conversationId: number, updates: Partial<any>, workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .update(updates)
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateConversationAssignee(conversationId: number, assignedUserId: number | null, workspaceId: number) {
    const updates: Record<string, any> = { assigned_user_id: assignedUserId };
    // If assigning to a human user, also reflect that in assigned_to flag when applicable
    if (assignedUserId && assignedUserId > 0) {
      updates.assigned_to = 'human';
    }
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .update(updates)
      .eq('id', conversationId)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
  
  // ================================================
  // MESSAGE OPERATIONS (workspace-scoped)
  // ================================================
  
  async getConversationMessages(conversationId: number, workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Transform for frontend compatibility
    return data.map(message => ({
      id: message.id,
      conversation_id: message.conversation_id,
      body: message.content || '',
      // sender mapping:
      // ai -> 'bot', human -> 'bot' (treated as agent-side bubble), contact -> 'contact'
      sender: message.sender_type === 'contact' ? 'contact' : 'bot',
      role: message.role,
      sender_type: message.sender_type,
      metadata: message.metadata || {},
      created_at: message.created_at,
    }));
  },
  
  async createMessage(messageData: Partial<any>, conversationId: number, workspaceId: number) {
    // Respect explicit sender_type; fallback only if not provided
    const resolvedSenderType = messageData.sender_type
      ? messageData.sender_type
      : (messageData.sender === 'bot' ? 'ai' : 'contact');

    const resolvedRole = messageData.role
      ? messageData.role
      : (resolvedSenderType === 'ai' || messageData.sender === 'bot' ? 'assistant' : 'user');

    const messagePayload = {
      workspace_id: workspaceId,
      conversation_id: conversationId,
      content: messageData.content ?? messageData.body ?? '',
      role: resolvedRole,
      sender_type: resolvedSenderType,
      sent_by: messageData.sent_by ?? null,
      metadata: messageData.metadata || {},
    } as Record<string, any>;
    
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .insert(messagePayload)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  // ================================================
  // DASHBOARD & ANALYTICS (workspace-scoped)
  // ================================================
  
  async getDashboardStats(workspaceId: number, startDate?: string, endDate?: string) {
    // Conversations stats
    let conversationsQuery = supabase
      .from(TABLES.CONVERSATIONS)
      .select('id, status, assigned_to, created_at')
      .eq('workspace_id', workspaceId);
    
    if (startDate && endDate) {
      conversationsQuery = conversationsQuery.gte('created_at', startDate).lte('created_at', endDate);
    }
    
    const { data: conversations, error: conversationsError } = await conversationsQuery;
    if (conversationsError) throw conversationsError;
    
    const totalConversations = conversations.length;
    const escalatedConversations = conversations.filter(c => c.assigned_to === 'human').length;
    const escalationRate = totalConversations > 0 ? Math.round((escalatedConversations / totalConversations) * 100) : 0;
    
    // Contacts stats
    let contactsQuery = supabase
      .from(TABLES.CONTACTS)
      .select('id, status, phone, instagram_url, email, country, created_at')
      .eq('workspace_id', workspaceId);
    
    if (startDate && endDate) {
      contactsQuery = contactsQuery.gte('created_at', startDate).lte('created_at', endDate);
    }
    
    const { data: contacts, error: contactsError } = await contactsQuery;
    if (contactsError) throw contactsError;
    
    const totalContacts = contacts.length;
    const leads = contacts.filter(c => c.status?.toLowerCase() === 'lead').length;
    const clients = contacts.filter(c => c.status?.toLowerCase() === 'client').length;
    const conversionRate = leads > 0 ? Math.round((clients / leads) * 100) : 0;
    
    // Contact field metrics
    const phonesCount = contacts.filter(c => c.phone && c.phone.trim() !== '').length;
    const instagramsCount = contacts.filter(c => c.instagram_url && c.instagram_url.trim() !== '').length;
    const emailsCount = contacts.filter(c => c.email && c.email.trim() !== '').length;
    
    // Top countries
    const countryCounts: { [key: string]: number } = {};
    contacts.forEach(contact => {
      if (contact.country) {
        countryCounts[contact.country] = (countryCounts[contact.country] || 0) + 1;
      }
    });
    
    const topCountries = Object.entries(countryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4)
      .map(([country, count]) => ({ country, count }));
    
    return {
      // Conversation metrics
      totalConversations,
      escalatedConversations,
      escalationRate,
      statusBreakdown: {
        open: conversations.filter(c => c.status?.toLowerCase() === 'open').length,
        closed: conversations.filter(c => 
          c.status?.toLowerCase() === 'closed' || 
          c.status?.toLowerCase() === 'closed_timeout'
        ).length,
        other: conversations.filter(c => 
          c.status?.toLowerCase() !== 'open' && 
          c.status?.toLowerCase() !== 'closed' && 
          c.status?.toLowerCase() !== 'closed_timeout'
        ).length
      },
      // Contact metrics
      contacts: {
        totalContacts,
        leads,
        clients,
        conversionRate,
        fields: {
          phones: phonesCount,
          instagrams: instagramsCount,
          emails: emailsCount
        },
        topCountries
      }
    };
  },

  // ================================================
  // AGENTS (workspace-scoped)
  // ================================================

  async getAgents(workspaceId: number, options?: { type?: string; externalId?: string }) {
    let query = supabase
      .from(TABLES.AGENTS)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    if (options?.externalId) {
      query = query.eq('external_id', options.externalId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getAgent(agentId: number, workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.AGENTS)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', agentId)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // not found is okay
    return data || null;
  },

  async getAgentByKey(key: string, workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.AGENTS)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('key', key)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // not found is okay
    return data || null;
  },

  // ================================================
  // CALLS (workspace-scoped)
  // ================================================

  async getCalls(
    workspaceId: number,
    filters: {
      from?: string
      to?: string
      status?: 'lead' | 'mql' | 'client'
      interest?: 'energy' | 'alarm' | 'telco'
      type?: 'outbound' | 'inbound'
      contact_id?: number
      start_date?: string
      end_date?: string
      assigned_user_id?: number
      unassigned?: boolean
      agent_id?: number
      limit?: number
      offset?: number
    } = {}
  ) {
    // Combined query: get data AND count in a single request for better performance
    // Supabase returns count in response headers when count: 'exact' is set
    let query = supabase
      .from(TABLES.CALLS)
      .select(
        `
        *,
        contact:contacts_new(id, name, phone),
        agent:agents(id, name),
        assigned_user:users_new(id, first_name, last_name, email)
        `,
        { count: 'exact' } // This enables count in the same query
      )
      .eq('workspace_id', workspaceId);

    // Apply all filters once (instead of duplicating for count and data)
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.interest) query = query.eq('interest', filters.interest);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.contact_id) query = query.eq('contact_id', filters.contact_id);
    if (filters.from) query = query.ilike('phone_from', `%${filters.from}%`);
    if (filters.to) query = query.ilike('phone_to', `%${filters.to}%`);
    if (typeof filters.assigned_user_id === 'number') query = query.eq('assigned_user_id', filters.assigned_user_id);
    if (filters.unassigned) query = query.is('assigned_user_id', null);
    if (typeof filters.agent_id === 'number') query = query.eq('agent_id', filters.agent_id);
    if (filters.start_date && filters.end_date) {
      query = query.gte('created_at', filters.start_date).lte('created_at', filters.end_date);
    }

    // Pagination
    if (filters.offset !== undefined && filters.limit) {
      query = query.range(filters.offset, filters.offset + filters.limit - 1);
    } else if (filters.limit) {
      query = query.limit(filters.limit);
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    // Execute the single combined query
    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data,
      total: count || 0,
    };
  },

  async updateCallStatus(workspaceId: number, callId: number, status: 'mql' | 'client' | 'lead' | 'agendado') {
    const { data, error } = await supabase
      .from(TABLES.CALLS)
      .update({ status })
      .eq('workspace_id', workspaceId)
      .eq('id', callId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async updateCallServicesCount(workspaceId: number, callId: number, servicesCount: number) {
    const { data, error } = await supabase
      .from(TABLES.CALLS)
      .update({ services_count: servicesCount } as any)
      .eq('workspace_id', workspaceId)
      .eq('id', callId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async updateCallInterest(workspaceId: number, callId: number, interest: 'energy' | 'alarm' | 'telco' | 'insurance' | 'investment' | null) {
    const { data, error } = await supabase
      .from(TABLES.CALLS)
      .update({ interest })
      .eq('workspace_id', workspaceId)
      .eq('id', callId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  // ================================================
  // BATCH CALLS (workspace-scoped)
  // ================================================

  async createBatchCall(
    workspaceId: number,
    payload: {
      name: string
      phone_external_id?: string | null
      agent_external_id?: string | null
      status?: 'pending' | 'processing' | 'completed' | 'failed'
      total_recipients?: number
      processed_recipients?: number
      // Store campaign_id directly in its dedicated column
      campaign_id?: string | null
      // Optional campaign metadata (we will store it in file_url for backward-compat)
      metadata?: Record<string, any>
    }
  ) {
    // Compose legacy-compatible file_url while also storing campaign_id
    let fileUrl: string | null = null;
    if (payload.metadata) {
      const metadataStr = JSON.stringify(payload.metadata);
      if (payload.campaign_id) {
        fileUrl = `cid:${payload.campaign_id}|metadata:${metadataStr}`;
      } else {
        fileUrl = `metadata:${metadataStr}`;
      }
    } else if (payload.campaign_id) {
      fileUrl = `cid:${payload.campaign_id}`;
    }

    const insertPayload: any = {
      workspace_id: workspaceId,
      name: payload.name,
      phone_external_id: payload.phone_external_id ?? null,
      agent_external_id: payload.agent_external_id ?? null,
      status: payload.status ?? 'processing',
      total_recipients: payload.total_recipients ?? 0,
      processed_recipients: payload.processed_recipients ?? 0,
      campaign_id: payload.campaign_id ?? null,
      file_url: fileUrl,
    };

    const { data, error } = await supabase
      .from(TABLES.BATCH_CALLS)
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listBatchCalls(workspaceId: number, options?: { limit?: number }) {
    const { data, error } = await supabase
      .from(TABLES.BATCH_CALLS)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 50);
    if (error) throw error;
    return data || [];
  },

  async updateBatchCallByCampaignId(
    workspaceId: number,
    campaignId: string,
    updates: Partial<{ status: string; total_recipients: number; processed_recipients: number; metadata: Record<string, any> }>
  ) {
    const { data, error } = await supabase
      .from(TABLES.BATCH_CALLS)
      .update(updates as any)
      .eq('workspace_id', workspaceId)
      .eq('campaign_id', campaignId)
      .select('*');
    if (error) throw error;
    return data;
  },

  async getBatchCallById(workspaceId: number, batchId: number) {
    const { data, error } = await supabase
      .from(TABLES.BATCH_CALLS)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', batchId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateBatchCall(
    workspaceId: number,
    batchId: number,
    updates: Partial<{ status: string; total_recipients: number; processed_recipients: number }>
  ) {
    const { data, error } = await supabase
      .from(TABLES.BATCH_CALLS)
      .update(updates as any)
      .eq('workspace_id', workspaceId)
      .eq('id', batchId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async getBatchCallsTotalRecipients(
    workspaceId: number,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    let query = supabase
      .from(TABLES.BATCH_CALLS)
      .select('total_recipients, created_at')
      .eq('workspace_id', workspaceId);

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    const total = (data || []).reduce((sum: number, row: any) => sum + (Number(row.total_recipients) || 0), 0);
    return total;
  },

  async getBatchCallsEvolution(
    workspaceId: number,
    period: 'daily' | 'monthly' | 'yearly',
    startDate?: string,
    endDate?: string
  ) {
    let query = supabase
      .from(TABLES.BATCH_CALLS)
      .select('created_at, total_recipients')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const evolutionMap: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      if (!row.created_at) return;
      const date = new Date(row.created_at);
      let key: string;
      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = date.getFullYear().toString();
      }
      const count = Number(row.total_recipients) || 0;
      evolutionMap[key] = (evolutionMap[key] || 0) + count;
    });

    return Object.entries(evolutionMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async getCallById(workspaceId: number, callId: number) {
    const { data, error } = await supabase
      .from(TABLES.CALLS)
      .select(
        `
        *,
        contact:contacts_new(id, name, phone),
        agent:agents(id, name),
        assigned_user:users_new(id, first_name, last_name, email)
        `
      )
      .eq('workspace_id', workspaceId)
      .eq('id', callId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateCallAssignee(workspaceId: number, callId: number, assignedUserId: number | null) {
    // Note: This assumes the calls table has an assigned_user_id column
    const { data, error } = await supabase
      .from(TABLES.CALLS)
      .update({ assigned_user_id: assignedUserId })
      .eq('workspace_id', workspaceId)
      .eq('id', callId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async getCallsStats(
    workspaceId: number,
    startDate?: string,
    endDate?: string
  ) {
    let query = supabase
      .from(TABLES.CALLS)
      .select('status, interest, type, created_at, services_count')
      .eq('workspace_id', workspaceId);

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const total = data.length;
    const outbound = data.filter(c => c.type === 'outbound').length;
    const inbound = data.filter(c => c.type === 'inbound').length;

    const statusBreakdown = data.reduce<Record<string, number>>((acc, row) => {
      const key = (row.status || 'unknown').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const interestBreakdown = data.reduce<Record<string, number>>((acc, row) => {
      const key = (row.interest || 'unknown').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // New: total services sold = sum of services_count for client status
    const servicesSold = (data || []).reduce((sum: number, row: any) => {
      const st = (row.status || '').toLowerCase();
      const count = Number(row.services_count) || 0;
      return sum + (st === 'client' ? count : 0);
    }, 0);

    // New: counts for conversion metrics to services
    const servicesCalls = (data || []).reduce((acc: number, row: any) => acc + ((Number(row.services_count) || 0) > 0 ? 1 : 0), 0);
    const mqlServices = (data || []).reduce((acc: number, row: any) => {
      const st = (row.status || '').toLowerCase();
      const has = (Number(row.services_count) || 0) > 0;
      return acc + (st === 'mql' && has ? 1 : 0);
    }, 0);

    return {
      total,
      outbound,
      inbound,
      statusBreakdown,
      interestBreakdown,
      servicesSold,
      servicesCalls,
      mqlServices,
    };
  },

  async getCallsEvolution(
    workspaceId: number,
    period: 'daily' | 'monthly' | 'yearly',
    startDate?: string,
    endDate?: string,
    statusFilter?: 'lead' | 'mql' | 'client'
  ) {
    let query = supabase
      .from(TABLES.CALLS)
      .select('created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const evolutionMap: { [key: string]: number } = {};
    data.forEach(call => {
      if (!call.created_at) return;
      const date = new Date(call.created_at);
      let key: string;
      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = date.getFullYear().toString();
      }
      evolutionMap[key] = (evolutionMap[key] || 0) + 1;
    });

    return Object.entries(evolutionMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async getServicesEvolution(
    workspaceId: number,
    period: 'daily' | 'monthly' | 'yearly',
    startDate?: string,
    endDate?: string
  ) {
    let query = supabase
      .from(TABLES.CALLS)
      .select('created_at, status, services_count')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const evolutionMap: { [key: string]: number } = {};
    (data || []).forEach((row: any) => {
      if (!row.created_at) return;
      const s = (row.status || '').toLowerCase();
      const count = Number(row.services_count) || 0;
      if (s !== 'client' || count <= 0) return;

      const date = new Date(row.created_at);
      let key: string;
      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = date.getFullYear().toString();
      }
      evolutionMap[key] = (evolutionMap[key] || 0) + count;
    });

    return Object.entries(evolutionMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  // ================================================
  // CALLS DASHBOARD: Agent leaderboard, MQLs by city, Contact repetition
  // ================================================

  async getAgentLeaderboard(
    workspaceId: number,
    startDate?: string,
    endDate?: string,
    limit: number = 5
  ) {
    let query = supabase
      .from(TABLES.CALLS)
      .select(
        `id, status, created_at, agent_id, agent:agents(id, name, type, channel_type)`
      )
      .eq('workspace_id', workspaceId);

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    type Agg = { agentId: number; agentName: string; total: number; mql: number; client: number };
    const byAgent = new Map<number, Agg>();
    (data || []).forEach(row => {
      const agentId = row.agent_id as number | null;
      if (!agentId) return;
      const agent = (row as any).agent || {};
      const agentType: string | undefined = (agent.type || agent.channel_type || '').toString().toLowerCase();
      // Only consider agents for Calls
      if (agentType && agentType !== 'call') return;
      const name = agent.name || 'Unknown';
      const entry = byAgent.get(agentId) || { agentId, agentName: name, total: 0, mql: 0, client: 0 };
      entry.total += 1;
      const st = (row.status || '').toString().toLowerCase();
      if (st === 'mql') entry.mql += 1;
      if (st === 'client') entry.client += 1;
      byAgent.set(agentId, entry);
    });

    const leaderboard = Array.from(byAgent.values())
      .sort((a, b) => b.mql - a.mql)
      .slice(0, Math.max(0, limit))
      .map(a => ({
        agent_id: a.agentId,
        agent_name: a.agentName,
        total_calls: a.total,
        mqls: a.mql,
        clients: a.client,
        win_rate: a.total > 0 ? Math.round((a.client / a.total) * 100) : 0,
      }));

    return leaderboard;
  },

  async getMqlsByCity(
    workspaceId: number,
    startDate?: string,
    endDate?: string
  ) {
    let query = supabase
      .from(TABLES.CALLS)
      .select('id, city, status, created_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'mql');

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const cityCounts: Record<string, number> = {};
    (data || []).forEach(row => {
      const city = (row.city || 'Unknown').toString();
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });

    return Object.entries(cityCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
  },

  async getTopCampaignsByMql(
    workspaceId: number,
    startDate?: string,
    endDate?: string,
    limit: number = 5
  ) {
    // Derivar por ahora desde batch_calls: usamos processed_recipients como proxy de resultados,
    // ya que la tabla calls no tiene campaign_id. Más adelante podremos cruzar con recipients.
    let query = supabase
      .from(TABLES.BATCH_CALLS)
      .select('campaign_id, name, created_at, processed_recipients')
      .eq('workspace_id', workspaceId)
      .not('campaign_id', 'is', null);

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const list = (data || []).map((row: any) => ({
      campaign_id: row.campaign_id as string,
      campaign_name: (row.name as string) || (row.campaign_id as string),
      // Proxy: usamos processed_recipients para ranking (MQLs aprox. hasta integrar mapping exacto)
      mqls: Number(row.processed_recipients) || 0,
    }));

    return list
      .sort((a, b) => b.mqls - a.mqls)
      .slice(0, Math.max(0, limit));
  },

  async getContactRepetition(
    workspaceId: number,
    startDate?: string,
    endDate?: string,
    topLimit: number = 10
  ) {
    let query = supabase
      .from(TABLES.CALLS)
      .select(`id, contact_id, status, created_at, contact:contacts_new(id, name)`)
      .eq('workspace_id', workspaceId);

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    type CallRow = { id: number; contact_id: number | null; status: string | null; created_at: string; contact?: { id: number; name: string | null } };
    const byContact = new Map<number, CallRow[]>();

    (data || []).forEach((row: any) => {
      const contactId = row.contact_id as number | null;
      if (!contactId) return;
      const arr = byContact.get(contactId) || [];
      arr.push(row as CallRow);
      byContact.set(contactId, arr);
    });

    let totalToMql = 0;
    let mqlContacts = 0;
    let totalToClient = 0;
    let clientContacts = 0;

    const topContacts: { contact_id: number; contact_name: string; calls: number; reached_mql: boolean; reached_client: boolean }[] = [];

    byContact.forEach((rows, contactId) => {
      rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const calls = rows.length;
      const name = (rows[0] as any).contact?.name || `Contact ${contactId}`;
      let idxMql: number | null = null;
      let idxClient: number | null = null;
      rows.forEach((r, idx) => {
        const st = (r.status || '').toLowerCase();
        if (st === 'mql' && idxMql === null) idxMql = idx + 1; // 1-based count
        if (st === 'client' && idxClient === null) idxClient = idx + 1;
      });
      const reachedMql = idxMql !== null;
      const reachedClient = idxClient !== null;
      if (idxMql) { totalToMql += idxMql; mqlContacts += 1; }
      if (idxClient) { totalToClient += idxClient; clientContacts += 1; }
      topContacts.push({ contact_id: contactId, contact_name: name, calls, reached_mql: reachedMql, reached_client: reachedClient });
    });

    topContacts.sort((a, b) => b.calls - a.calls);
    const top = topContacts.slice(0, Math.max(0, topLimit));

    const avgCallsToMql = mqlContacts > 0 ? parseFloat((totalToMql / mqlContacts).toFixed(2)) : 0;
    const avgCallsToClient = clientContacts > 0 ? parseFloat((totalToClient / clientContacts).toFixed(2)) : 0;

    return {
      avgCallsToMql,
      avgCallsToClient,
      topContacts: top,
    };
  },

  async createAgent(agentData: Partial<any>, workspaceId: number) {
    const payload = { ...agentData, workspace_id: workspaceId };
    const { data, error } = await supabase
      .from(TABLES.AGENTS)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAgent(agentId: number, updates: Partial<any>, workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.AGENTS)
      .update(updates)
      .eq('id', agentId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  
  async getConversationsEvolution(workspaceId: number, period: 'daily' | 'monthly' | 'yearly', startDate?: string, endDate?: string) {
    let query = supabase
      .from(TABLES.CONVERSATIONS)
      .select('created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });
    
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Process data by period
    const evolutionMap: { [key: string]: number } = {};
    
    data.forEach(conversation => {
      if (!conversation.created_at) return;
      
      const date = new Date(conversation.created_at);
      let key: string;
      
      if (period === 'daily') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      } else { // yearly
        key = date.getFullYear().toString(); // YYYY
      }
      
      evolutionMap[key] = (evolutionMap[key] || 0) + 1;
    });
    
    return Object.entries(evolutionMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
  
  async getContactsEvolution(workspaceId: number, period: 'daily' | 'monthly' | 'yearly', startDate?: string, endDate?: string) {
    let query = supabase
      .from(TABLES.CONTACTS)
      .select('created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });
    
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Process data by period
    const evolutionMap: { [key: string]: number } = {};
    
    data.forEach(contact => {
      if (!contact.created_at) return;
      
      const date = new Date(contact.created_at);
      let key: string;
      
      if (period === 'daily') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      } else { // yearly
        key = date.getFullYear().toString(); // YYYY
      }
      
      evolutionMap[key] = (evolutionMap[key] || 0) + 1;
    });
    
    return Object.entries(evolutionMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
  
  // ================================================
  // COMPATIBILITY METHODS (for gradual migration)
  // ================================================
  
  async getClientByClerkId(clerkUserId: string) {
    // This method bridges old client logic with new workspace logic
    const context = await WorkspaceContext.fromClerkUserId(clerkUserId);
    const workspace = await this.getWorkspace(context.workspaceId);
    
    // Return workspace data in client format for compatibility
    return {
      id: workspace.id,
      name: workspace.name,
      email: workspace.domain,
      clerk_user_id: clerkUserId,
      workspace_id: workspace.id
    };
  },
  
  // Legacy methods that redirect to workspace-scoped versions
  async getConversationsByClientPaginated(
    workspaceId: number, 
    limit: number, 
    offset: number, 
    statusFilter?: string, 
    assignedToFilter?: string
  ) {
    return this.getConversations(workspaceId, {
      limit,
      offset,
      status: statusFilter,
      assigned_to: assignedToFilter
    });
  },
  
  async updateConversationStatus(conversationId: number, status: string, workspaceId: number) {
    return this.updateConversation(conversationId, { status }, workspaceId);
  }
};

export default db;