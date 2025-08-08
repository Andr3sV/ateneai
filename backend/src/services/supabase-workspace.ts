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
  AGENTS: 'agents',
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
  
  async getUserByClerkId(clerkUserId: string) {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    if (error) throw error;
    return data;
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
    let query = supabase
      .from(TABLES.CONTACTS)
      .select('*')
      .eq('workspace_id', workspaceId);
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.search) {
      query = query.ilike('phone', `%${filters.search}%`);
    }
    
    // Fix: Use either range() OR limit(), not both
    if (filters.offset && filters.limit) {
      query = query.range(filters.offset, filters.offset + filters.limit - 1);
    } else if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
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

  async getAgents(workspaceId: number) {
    const { data, error } = await supabase
      .from(TABLES.AGENTS)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
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