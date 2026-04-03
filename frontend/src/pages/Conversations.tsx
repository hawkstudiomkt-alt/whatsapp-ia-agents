import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { MessageSquare, Clock, Bot, User, Activity, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, Badge, LoadingSpinner } from '../components/ui';

interface Conversation {
  id: string;
  phone: string;
  status: 'ACTIVE' | 'CLOSED' | 'TRANSFERRED';
  isHumanHandling?: boolean;
  agent: { id: string; name: string };
  lead?: { name?: string; status: string; score?: number };
  _count?: { messages: number };
  updatedAt: string;
}

const STATUS_CONFIG = {
  ACTIVE:      { label: 'Ativa',        variant: 'success' as const },
  CLOSED:      { label: 'Encerrada',    variant: 'neutral' as const },
  TRANSFERRED: { label: 'Transferida',  variant: 'warning' as const },
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW:           '#7D53FF',
  QUALIFIED:     '#B6FF00',
  DISQUALIFIED:  '#ef4444',
  CONVERTED:     '#22d3ee',
};

function ScoreBar({ score }: { score?: number }) {
  if (score == null) return <span style={{ color: '#444', fontSize: '12px' }}>—</span>;
  const color = score >= 70 ? '#B6FF00' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, background: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
      <span className="text-xs font-mono-rattix" style={{ color }}>{score}</span>
    </div>
  );
}

export default function Conversations() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<Conversation[]>('/conversations').then(r => r.data),
    refetchInterval: 15000,
  });

  const filtered = conversations?.filter(c => {
    const matchSearch = !search || (c.lead?.name || c.phone).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  const active = conversations?.filter(c => c.status === 'ACTIVE').length || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: '#f0f0f0', fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Conversas
          </h1>
          <p className="text-sm mt-1 font-mono-rattix" style={{ color: '#555' }}>
            {active} ativas agora • atualiza a cada 15s
          </p>
        </div>

        {/* Live indicator */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ background: 'rgba(182,255,0,0.06)', border: '1px solid rgba(182,255,0,0.15)' }}
        >
          <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#B6FF00', boxShadow: '0 0 6px #B6FF00' }} />
          <span className="text-xs font-mono-rattix" style={{ color: '#B6FF00' }}>LIVE</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 flex-1 max-w-xs px-3 py-2.5 rounded-xl"
          style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: '#555' }} />
          <input
            placeholder="Buscar lead ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#f0f0f0' }}
          />
        </div>

        {(['ALL', 'ACTIVE', 'CLOSED', 'TRANSFERRED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-4 py-2 rounded-xl text-xs font-mono-rattix transition-all"
            style={
              statusFilter === s
                ? { background: 'rgba(182,255,0,0.1)', border: '1px solid rgba(182,255,0,0.25)', color: '#B6FF00' }
                : { background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)', color: '#555' }
            }
          >
            {s === 'ALL' ? 'Todas' : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-16 flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(182,255,0,0.06)', border: '1px solid rgba(182,255,0,0.1)' }}
          >
            <MessageSquare className="w-7 h-7" style={{ color: '#B6FF00' }} />
          </div>
          <p className="text-sm font-mono-rattix" style={{ color: '#444' }}>
            Nenhuma conversa encontrada
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((conv, i) => {
            const statusConf = STATUS_CONFIG[conv.status] || { label: conv.status, variant: 'neutral' as const };
            const initials = conv.lead?.name?.[0]?.toUpperCase() || conv.phone.slice(-2);
            const dotColor = LEAD_STATUS_COLORS[conv.lead?.status || ''] || '#555';
            const isHuman = conv.isHumanHandling;

            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card
                  className="p-5"
                  style={{
                    borderLeft: conv.status === 'ACTIVE' ? '2px solid #B6FF00' : '2px solid rgba(255,255,255,0.06)',
                  } as any}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                      style={{
                        background: 'rgba(182,255,0,0.08)',
                        border: '1px solid rgba(182,255,0,0.15)',
                        color: '#B6FF00',
                      }}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: '#f0f0f0' }}>
                          {conv.lead?.name || conv.phone}
                        </span>
                        <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                        {/* Atendimento badge */}
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold border font-mono-rattix"
                          style={
                            isHuman
                              ? { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' }
                              : { background: 'rgba(125,83,255,0.1)', color: '#7D53FF', borderColor: 'rgba(125,83,255,0.25)' }
                          }
                        >
                          {isHuman ? '👤 Humano' : '🤖 Agente'}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 font-mono-rattix" style={{ color: '#555' }}>
                        {conv.phone}
                      </p>
                    </div>

                    {/* Stats grid */}
                    <div className="hidden md:grid grid-cols-3 gap-6 shrink-0">
                      <div>
                        <p className="text-[10px] font-mono-rattix mb-1" style={{ color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>Agente</p>
                        <div className="flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5" style={{ color: '#7D53FF' }} />
                          <span className="text-xs" style={{ color: '#f0f0f0' }}>{conv.agent.name}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono-rattix mb-1" style={{ color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>Msgs</p>
                        <span className="text-xs font-bold" style={{ color: '#f0f0f0' }}>{conv._count?.messages || 0}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono-rattix mb-2" style={{ color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>Score</p>
                        <ScoreBar score={conv.lead?.score} />
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1 shrink-0" style={{ color: '#444' }}>
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-mono-rattix">
                        {new Date(conv.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Lead status bar */}
                  {conv.lead && (
                    <div
                      className="mt-3 flex items-center gap-2"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: dotColor, boxShadow: `0 0 5px ${dotColor}` }}
                      />
                      <span className="text-xs font-mono-rattix" style={{ color: '#555' }}>
                        Lead: {conv.lead.status}
                      </span>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
