import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ensure .env.local is loaded in dev before reading envs
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

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

  async getConversationsByClientPaginated(clientId: number, limit: number, offset: number, statusFilter?: string, assignedToFilter?: string) {
    let query = supabase
      .from(TABLES.CONVERSATIONS)
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq('client_id', clientId);

    // Aplicar filtros si están presentes
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (assignedToFilter) {
      query = query.eq('assigned_to', assignedToFilter);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
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
        body: message.body,
        sender: message.sender, // 'bot' o 'contact'
        metadata: message.metadata || {},
        created_at: message.created_at || message.timestamp,
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

  // Obtener estadísticas del dashboard
  async getDashboardStats(clientId: number, startDate?: string, endDate?: string) {
    let query = supabase
      .from(TABLES.CONVERSATIONS)
      .select('id, assigned_to, status, created_at')
      .eq('client_id', clientId);

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;
    
    if (error) throw error;

    const totalCount = data.length;
    const escalatedCount = data.filter(c => c.assigned_to === 'human').length;
    const escalationRate = totalCount > 0 ? Math.round((escalatedCount / totalCount) * 100) : 0;

    // Obtener métricas de contactos
    let contactsQuery = supabase
      .from(TABLES.CONTACTS)
      .select('id, status, phone, instagram_url, email, country, created_at')
      .eq('client_id', clientId);

    if (startDate && endDate) {
      console.log(`📅 Aplicando filtros de fecha a contactos: ${startDate} - ${endDate}`);
      contactsQuery = contactsQuery.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data: contactsData, error: contactsError } = await contactsQuery;
    
    if (contactsError) throw contactsError;

    const totalContacts = contactsData.length;
    const leads = contactsData.filter(c => c.status?.toLowerCase() === 'lead').length;
    const clients = contactsData.filter(c => c.status?.toLowerCase() === 'client').length;
    const conversionRate = leads > 0 ? Math.round((clients / leads) * 100) : 0;

    // Métricas de campos de contacto
    const phonesCount = contactsData.filter(c => c.phone && c.phone.trim() !== '').length;
    const instagramsCount = contactsData.filter(c => c.instagram_url && c.instagram_url.trim() !== '').length;
    const emailsCount = contactsData.filter(c => c.email && c.email.trim() !== '').length;

    // Top 4 países
    const countryCounts: { [key: string]: number } = {};
    contactsData.forEach(contact => {
      if (contact.country) {
        countryCounts[contact.country] = (countryCounts[contact.country] || 0) + 1;
      }
    });

    const topCountries = Object.entries(countryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4)
      .map(([country, count]) => ({ country, count }));

    return {
      // Métricas de conversaciones
      totalConversations: totalCount,
      escalatedConversations: escalatedCount,
      escalationRate: escalationRate,
      statusBreakdown: {
        open: data.filter(c => c.status?.toLowerCase() === 'open').length,
        closed: data.filter(c => c.status?.toLowerCase() === 'closed' || c.status?.toLowerCase() === 'closed_timeout').length,
        other: data.filter(c => 
          c.status?.toLowerCase() !== 'open' && 
          c.status?.toLowerCase() !== 'closed' && 
          c.status?.toLowerCase() !== 'closed_timeout'
        ).length
      },
      // Métricas de contactos
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

  // Obtener datos para gráfico evolutivo
  async getConversationsEvolution(clientId: number, period: 'daily' | 'monthly' | 'yearly', startDate?: string, endDate?: string) {
    let query = supabase
      .from(TABLES.CONVERSATIONS)
      .select('created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;
    
    if (error) throw error;

    // Agrupar por período
    const groupedData = data.reduce((acc: any, conversation) => {
      const date = new Date(conversation.created_at);
      let key: string;

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
          break;
        case 'yearly':
          key = date.getFullYear().toString(); // YYYY
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Convertir a array ordenado
    return Object.entries(groupedData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
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



  // Método para obtener estadísticas generales
  async getGeneralStats() {
    const { data: totalConversations, error: errorTotal } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select('id', { count: 'exact' });
    
    const { data: escalatedConversations, error: errorEscalated } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select('id', { count: 'exact' })
      .eq('assigned_to', 'human');
    
    if (errorTotal || errorEscalated) {
      throw errorTotal || errorEscalated;
    }
    
    return {
      totalConversations: totalConversations?.length || 0,
      escalatedConversations: escalatedConversations?.length || 0,
    };
  },

  // Contact operations
  async getContactsPaginated(clientId: number, page: number = 1, limit: number = 20, phoneFilter?: string) {
    let query = supabase
      .from(TABLES.CONTACTS)
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('id', { ascending: false });
    
    if (phoneFilter) {
      query = query.ilike('phone', `%${phoneFilter}%`);
    }
    
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      data: data || [],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  },

  async getContactById(clientId: number, contactId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONTACTS)
      .select('*')
      .eq('client_id', clientId)
      .eq('id', contactId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getContactsMetrics(clientId: number) {
    // Total contacts
    const { data: totalData, error: totalError } = await supabase
      .from(TABLES.CONTACTS)
      .select('id', { count: 'exact' })
      .eq('client_id', clientId);
    
    if (totalError) throw totalError;

    // Contacts by status
    const { data: leadsData, error: leadsError } = await supabase
      .from(TABLES.CONTACTS)
      .select('id', { count: 'exact' })
      .eq('client_id', clientId)
      .eq('status', 'Lead');
    
    if (leadsError) throw leadsError;

    const { data: clientsData, error: clientsError } = await supabase
      .from(TABLES.CONTACTS)
      .select('id', { count: 'exact' })
      .eq('client_id', clientId)
      .eq('status', 'Client');
    
    if (clientsError) throw clientsError;

    // Top countries
    const { data: countriesData, error: countriesError } = await supabase
      .from(TABLES.CONTACTS)
      .select('country')
      .eq('client_id', clientId)
      .not('country', 'is', null);
    
    if (countriesError) throw countriesError;

    // Count countries manually
    const countryCount: Record<string, number> = {};
    countriesData?.forEach(contact => {
      if (contact.country) {
        countryCount[contact.country] = (countryCount[contact.country] || 0) + 1;
      }
    });

    // Get top 5 countries
    const topCountries = Object.entries(countryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }));

    return {
      totalContacts: totalData?.length || 0,
      totalLeads: leadsData?.length || 0,
      totalClients: clientsData?.length || 0,
      topCountries
    };
  },

  async getConversationsByContactId(clientId: number, contactId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Obtener datos para gráfico evolutivo de contactos
  async getContactsEvolution(clientId: number, period: 'daily' | 'monthly' | 'yearly', startDate?: string, endDate?: string) {
    let query = supabase
      .from(TABLES.CONTACTS)
      .select('created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data, error } = await query;
    
    if (error) throw error;

    // Procesar datos según el período
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

    // Convertir a array y ordenar
    return Object.entries(evolutionMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  // Actualizar status de conversación
  async updateConversationStatus(conversationId: number, status: string, clientId: number) {
    const { data, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .update({ status })
      .eq('id', conversationId)
      .eq('client_id', clientId)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },
};

export default supabase; 