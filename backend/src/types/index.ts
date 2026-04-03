// Tipos para requisições da Evolution API
export interface EvolutionWebhook {
  event: string;
  instance: string;
  data: {
    state: any;
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
    pushName?: string;
    messageType: string;
  };
  date: string;
}

export interface SendMessageRequest {
  number: string;
  textMessage: {
    text: string;
  };
}

// Tipos para agentes de IA
export interface AgentContext {
  agentId: string;
  agentName: string;
  instructions: string;
  systemPrompt: string;
  conversationHistory: MessageContext[];
  lead?: LeadContext;
}

export interface MessageContext {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface LeadContext {
  phone?: string;
  name?: string;
  email?: string;
  status: string;
  score?: number;
  notes?: string;
}

// Tipos para analytics
export interface AnalyticsSummary {
  totalMessages: number;
  messagesSent: number;
  messagesReceived: number;
  activeConversations: number;
  totalConversations: number;
  leadsQualified: number;
  leadsConverted: number;
  conversionRate: number;
}

export interface DailyAnalytics {
  date: string;
  messagesSent: number;
  messagesReceived: number;
  conversationsStarted: number;
  conversationsClosed: number;
  leadsQualified: number;
  leadsConverted: number;
}
