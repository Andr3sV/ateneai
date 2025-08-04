// Tipos que respetan la lógica existente del usuario

export interface Client {
  id: number;
  name: string;
  alias?: string;
  // Campos agregados por migración
  email?: string;
  clerk_user_id?: string;
  google_workspace_domain?: string;
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Contact {
  id: number;
  client_id: number;
  name?: string;
  phone?: string;
  // Campos específicos de Instagram (EXISTENTES)
  instagram_url?: string;
  instagram_id?: string;
  instagram_followers?: string;
  country?: string;
  status?: string;
  // Campos agregados por migración
  email?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface Conversation {
  id: number;
  contact_id: number;
  status: string; // 'open' por defecto
  created_at: string;
  // LÓGICA EXISTENTE - NO CAMBIAR
  assigned_to?: 'agent_1' | 'human'; // ✅ Tu lógica de escalación
  // Campos agregados por migración
  client_id?: number;
  metadata?: Record<string, any>;
  updated_at?: string;
  // Relaciones
  contact?: Contact;
  messages?: Message[];
}

export interface Message {
  id: number;
  conversation_id: number;
  // LÓGICA EXISTENTE - NO CAMBIAR
  sender: 'contact' | 'bot'; // ✅ Tu lógica de roles
  body?: string;
  timestamp: string;
  contact_id?: number;
  total_tokens?: number;
  // Campo agregado por migración
  metadata?: Record<string, any>;
}

export interface Analytics {
  id: number;
  client_id: number;
  date: string;
  total_conversations: number;
  escalated_conversations: number;
  total_messages: number;
  average_response_time: number;
  satisfaction_score: number;
  created_at: string;
}

// Tipos para la aplicación (mapeo desde tu esquema)
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant'; // Mapeado desde sender
  timestamp: string;
  metadata?: Record<string, any>;
}

// Función de mapeo que respeta tu lógica
export const mapMessageToApp = (message: Message): ChatMessage => {
  return {
    id: message.id.toString(),
    content: message.body || '',
    role: message.sender === 'bot' ? 'assistant' : 'user',
    timestamp: message.timestamp,
    metadata: message.metadata || {},
  };
};

export const mapMessageFromApp = (message: Partial<ChatMessage>): Partial<Message> => {
  return {
    conversation_id: parseInt(message.id || '0'),
    sender: message.role === 'assistant' ? 'bot' : 'contact',
    body: message.content,
    timestamp: message.timestamp || new Date().toISOString(),
    metadata: message.metadata,
  };
};

// Función para detectar escalación basada en tu lógica
export const isEscalated = (conversation: Conversation): boolean => {
  return conversation.assigned_to === 'human';
};

// Función para obtener estadísticas de escalación
export const getEscalationStats = (conversations: Conversation[]) => {
  const total = conversations.length;
  const escalated = conversations.filter(c => c.assigned_to === 'human').length;
  
  return {
    total,
    escalated,
    escalationRate: total > 0 ? (escalated / total) * 100 : 0
  };
};

// Tipos para requests/responses
export interface ChatRequest {
  message: string;
  conversation_id?: number;
  contact_info?: {
    email?: string;
    name?: string;
    phone?: string;
  };
}

export interface ChatResponse {
  message: string;
  conversation_id: number;
  need_human: boolean; // Mapeado desde assigned_to
  metadata?: Record<string, any>;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  clerk_user_id: string;
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

// Enums que respetan tu lógica existente
export enum ConversationStatus {
  OPEN = 'open',
  CLOSED = 'closed'
}

export enum MessageSender {
  CONTACT = 'contact',
  BOT = 'bot'
}

export enum AssignmentType {
  AGENT_1 = 'agent_1',
  HUMAN = 'human'
}

export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year'
}

// Utility types
export type WithTimestamps<T> = T & {
  created_at?: string;
  updated_at?: string;
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Tipos específicos para tu lógica de Instagram
export interface InstagramContact extends Contact {
  instagram_url: string;
  instagram_id: string;
  instagram_followers: string;
}

// Tipos para configuración del chatbot
export interface ChatbotSettings {
  chatbot_name?: string;
  welcome_message?: string;
  escalation_threshold?: number;
  max_tokens_per_message?: number;
  instagram_integration?: {
    enabled: boolean;
    auto_reply: boolean;
  };
} 