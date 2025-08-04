export interface Client {
  id: string;
  name: string;
  email: string;
  clerk_user_id?: string;
  google_workspace_domain?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  client_id: string;
  email?: string;
  phone?: string;
  name?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Conversation {
  id: string;
  client_id: string;
  contact_id: string;
  status: 'active' | 'closed' | 'escalated';
  need_human: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  metadata: Record<string, any>;
  created_at: string;
}

export interface Analytics {
  id: string;
  client_id: string;
  date: string;
  total_conversations: number;
  escalated_conversations: number;
  total_messages: number;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  clerk_user_id: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  contact_info?: {
    email?: string;
    name?: string;
    phone?: string;
  };
}

export interface ChatResponse {
  message: string;
  conversation_id: string;
  need_human: boolean;
  metadata?: Record<string, any>;
}

export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  period?: 'day' | 'week' | 'month';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
} 