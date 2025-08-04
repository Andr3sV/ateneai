import { useState, useEffect, useCallback } from 'react';
import { supabase, db } from '@/lib/supabase';
import type { Client, Conversation, Message, Contact, Analytics } from '@/types';

// Hook para manejar el estado del cliente
export const useClient = (clerkUserId?: string) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = useCallback(async () => {
    if (!clerkUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const clientData = await db.getClientByClerkId(clerkUserId);
      setClient(clientData);
    } catch (err) {
      console.error('Error fetching client:', err);
      setError(err instanceof Error ? err.message : 'Error fetching client');
    } finally {
      setLoading(false);
    }
  }, [clerkUserId]);

  const createClient = useCallback(async (clientData: Partial<Client>) => {
    try {
      setLoading(true);
      setError(null);
      const newClient = await db.createClient(clientData);
      setClient(newClient);
      return newClient;
    } catch (err) {
      console.error('Error creating client:', err);
      setError(err instanceof Error ? err.message : 'Error creating client');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateClient = useCallback(async (updates: Partial<Client>) => {
    if (!client?.id) return;

    try {
      setLoading(true);
      setError(null);
      const updatedClient = await db.updateClient(client.id, updates);
      setClient(updatedClient);
      return updatedClient;
    } catch (err) {
      console.error('Error updating client:', err);
      setError(err instanceof Error ? err.message : 'Error updating client');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  return {
    client,
    loading,
    error,
    refetch: fetchClient,
    createClient,
    updateClient,
  };
};

// Hook para manejar conversaciones
export const useConversations = (clientId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const conversationsData = await db.getConversations(clientId);
      setConversations(conversationsData);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Error fetching conversations');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const createConversation = useCallback(async (conversationData: Partial<Conversation>) => {
    try {
      setLoading(true);
      setError(null);
      const newConversation = await db.createConversation(conversationData);
      setConversations(prev => [newConversation, ...prev]);
      return newConversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(err instanceof Error ? err.message : 'Error creating conversation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
    createConversation,
  };
};

// Hook para manejar una conversación específica
export const useConversation = (conversationId?: string) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversation = useCallback(async () => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const conversationData = await db.getConversation(conversationId);
      setConversation(conversationData);
    } catch (err) {
      console.error('Error fetching conversation:', err);
      setError(err instanceof Error ? err.message : 'Error fetching conversation');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string, role: 'user' | 'assistant' = 'user') => {
    if (!conversation?.id) return;

    try {
      const messageData = {
        conversation_id: conversation.id,
        content,
        role,
        metadata: {},
      };

      const newMessage = await db.createMessage(messageData);
      
      // Actualizar la conversación localmente
      setConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...(prev.messages || []), newMessage],
        };
      });

      return newMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [conversation?.id]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  return {
    conversation,
    loading,
    error,
    refetch: fetchConversation,
    sendMessage,
  };
};

// Hook para manejar analytics
export const useAnalytics = (clientId?: string, filters?: any) => {
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const analyticsData = await db.getAnalytics(clientId, filters);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Error fetching analytics');
    } finally {
      setLoading(false);
    }
  }, [clientId, filters]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  };
};

// Hook para manejar contactos
export const useContacts = (clientId?: string) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createContact = useCallback(async (contactData: Partial<Contact>) => {
    try {
      setLoading(true);
      setError(null);
      const newContact = await db.createContact(contactData);
      setContacts(prev => [...prev, newContact]);
      return newContact;
    } catch (err) {
      console.error('Error creating contact:', err);
      setError(err instanceof Error ? err.message : 'Error creating contact');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getContactByEmail = useCallback(async (email: string) => {
    if (!clientId) return null;

    try {
      const contact = await db.getContactByEmail(clientId, email);
      return contact;
    } catch (err) {
      console.error('Error getting contact by email:', err);
      return null;
    }
  }, [clientId]);

  return {
    contacts,
    loading,
    error,
    createContact,
    getContactByEmail,
  };
}; 