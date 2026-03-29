import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Instance {
  id: string;
  name: string;
  phoneNumber: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'PENDING';
  apiKey: string;
  adminPhone?: string;
  createdAt: string;
  agents?: { id: string; name: string; status: string }[];
  _count?: { conversations: number; messages: number };
}

export interface Agent {
  id: string;
  name: string;
  instructions: string;
  systemPrompt: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  tone: string;
  language: string;
  aiModel: string;
  guardrails?: string;
  instanceId: string;
  transcriptionEnabled: boolean;
  transcriptionModel: string;
  instance?: { id: string; name: string; status: string };
  _count?: { conversations: number };
}

export interface Lead {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  status: 'NEW' | 'QUALIFIED' | 'DISQUALIFIED' | 'CONVERTED';
  score?: number;
  notes?: string;
  conversation?: {
    id: string;
    phone: string;
    instanceId: string;
    agent?: { name: string }
  };
  instance?: { name: string };
  agent?: { name: string };
}

export interface Integration {
  id: string;
  instanceId: string;
  type: 'GOOGLE_CALENDAR' | 'NOTION' | 'OTHER_CRM';
  config: any;
  isActive: boolean;
}

export interface FollowUp {
  id: string;
  leadId: string;
  type: 'REMINDER' | 'NO_RESPONSE' | 'CUSTOM';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  scheduledFor: string;
  notes?: string;
  lead?: Lead;
}

export interface Conversation {
  id: string;
  phone: string;
  status: 'ACTIVE' | 'CLOSED' | 'TRANSFERRED';
  agent: { id: string; name: string };
  lead?: { name?: string; status: string; score?: number };
  _count?: { messages: number };
  updatedAt: string;
}

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

// API Calls
export const instancesApi = {
  findAll: () => api.get<Instance[]>('/instances').then(r => r.data),
  findById: (id: string) => api.get<Instance>(`/instances/${id}`).then(r => r.data),
  create: (data: { name: string; phoneNumber: string }) =>
    api.post<Instance>('/instances', data).then(r => r.data),
  update: (id: string, data: Partial<Instance>) =>
    api.put<Instance>(`/instances/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/instances/${id}`),
  generateQR: (id: string) => api.post<{ base64: string; countDown: number; message: string }>(`/instances/${id}/qr`).then(r => r.data),
};

export const agentsApi = {
  findAll: () => api.get<Agent[]>('/agents').then(r => r.data),
  findById: (id: string) => api.get<Agent>(`/agents/${id}`).then(r => r.data),
  create: (data: {
    name: string;
    instructions: string;
    systemPrompt: string;
    instanceId: string;
    aiModel?: string;
    guardrails?: string;
  }) =>
    api.post<Agent>('/agents', data).then(r => r.data),
  update: (id: string, data: Partial<Agent>) =>
    api.put<Agent>(`/agents/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/agents/${id}`),
};

export const leadsApi = {
  findAll: (status?: string) =>
    api.get<Lead[]>('/leads' + (status ? `?status=${status}` : '')).then(r => r.data),
  findById: (id: string) => api.get<Lead>(`/leads/${id}`).then(r => r.data),
  create: (data: {
    phone: string;
    name?: string;
    email?: string;
    instanceId?: string;
    agentId?: string;
  }) =>
    api.post<Lead>('/leads', data).then(r => r.data),
  update: (id: string, data: Partial<Lead>) =>
    api.put<Lead>(`/leads/${id}`, data).then(r => r.data),
};

export const integrationsApi = {
  findByInstance: (instanceId: string) =>
    api.get<Integration[]>(`/instances/${instanceId}/integrations`).then(r => r.data),
  upsert: (data: { instanceId: string; type: string; config: any; isActive?: boolean }) =>
    api.post<Integration>('/integrations', data).then(r => r.data),
  delete: (instanceId: string, type: string) =>
    api.delete(`/instances/${instanceId}/integrations/${type}`),
};

export const analyticsApi = {
  getSummary: (instanceId?: string) =>
    api.get<AnalyticsSummary>('/analytics/summary' + (instanceId ? `?instanceId=${instanceId}` : '')).then(r => r.data),
  getDaily: (instanceId?: string, days?: number) =>
    api.get<DailyAnalytics[]>(`/analytics/daily?instanceId=${instanceId || ''}&days=${days || 7}`).then(r => r.data),
  getDashboard: () => api.get('/analytics/dashboard').then(r => r.data),
};

export const followupsApi = {
  findAll: () => api.get<FollowUp[]>('/followups').then(r => r.data),
  create: (data: { leadId: string; type: string; scheduledFor: string; notes?: string }) =>
    api.post<FollowUp>('/followups', data).then(r => r.data),
  delete: (id: string) => api.delete(`/followups/${id}`),
};
