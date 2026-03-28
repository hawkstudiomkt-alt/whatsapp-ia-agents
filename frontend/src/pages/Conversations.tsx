import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { MessageSquare, Clock, CheckCircle } from 'lucide-react';

interface Conversation {
  id: string;
  phone: string;
  status: 'ACTIVE' | 'CLOSED' | 'TRANSFERRED';
  agent: { id: string; name: string };
  lead?: { name?: string; status: string; score?: number };
  _count?: { messages: number };
  updatedAt: string;
}

export default function Conversations() {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', 'ACTIVE'],
    queryFn: () => api.get<Conversation[]>('/conversations?status=ACTIVE').then(r => r.data),
  });

  const getStatusBadge = (status: string) => {
    const config = {
      ACTIVE: { color: 'bg-green-500', label: 'Ativa' },
      CLOSED: { color: 'bg-gray-500', label: 'Fechada' },
      TRANSFERRED: { color: 'bg-yellow-500', label: 'Transferida' },
    };
    const configStatus = config[status as keyof typeof config];
    return (
      <span className={`px-2 py-1 rounded-full text-xs text-white ${configStatus.color}`}>
        {configStatus.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Conversas</h1>
        <div className="flex items-center gap-2 text-gray-400">
          <MessageSquare className="w-5 h-5" />
          <span>{conversations?.length || 0} ativas</span>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-gray-400">Carregando...</p>
        ) : conversations?.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Nenhuma conversa ativa no momento</p>
          </div>
        ) : (
          conversations?.map((conversation) => (
            <div
              key={conversation.id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <span className="text-green-500 font-semibold">
                      {conversation.lead?.name?.[0]?.toUpperCase() || conversation.phone.slice(-2)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {conversation.lead?.name || conversation.phone}
                    </h3>
                    <p className="text-gray-400 text-sm">{conversation.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(conversation.status)}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Agente</p>
                  <p className="text-white">{conversation.agent.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Mensagens</p>
                  <p className="text-white">{conversation._count?.messages || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Lead Score</p>
                  <p className="text-white">{conversation.lead?.score || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Atualizado</p>
                  <div className="flex items-center gap-1 text-white">
                    <Clock className="w-4 h-4" />
                    {new Date(conversation.updatedAt).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>

              {conversation.lead && (
                <div className="mt-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-400">
                    Status do lead: {conversation.lead.status}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
