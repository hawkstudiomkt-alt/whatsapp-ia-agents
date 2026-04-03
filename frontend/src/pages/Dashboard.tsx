import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { analyticsApi, instancesApi } from '../lib/api';
import {
  TrendingUp, Users, UserCheck, Target, ArrowRight,
  Clock, MessageCircle, BarChart3, Zap, UserPlus, XCircle,
} from 'lucide-react';
import { Card, LoadingSpinner, PageTransition } from '../components/ui';

// ─── Design tokens ────────────────────────────────────────────────────────────
const LIME   = '#B6FF00';
const PURPLE = '#7D53FF';

export default function Dashboard() {
  const [selectedInstanceId, setSelectedInstanceId] = useState('');

  const { data: instances } = useQuery({ queryKey: ['instances'], queryFn: instancesApi.findAll });

  const { data: summary, isLoading: l1 } = useQuery({
    queryKey: ['analytics-summary', selectedInstanceId],
    queryFn: () => analyticsApi.getSummary(selectedInstanceId || undefined),
    refetchInterval: 30_000,
  });
  const { data: breakdown, isLoading: l2 } = useQuery({
    queryKey: ['analytics-breakdown', selectedInstanceId],
    queryFn: () => analyticsApi.getLeadBreakdown(selectedInstanceId || undefined),
    refetchInterval: 30_000,
  });
  const { data: funnel, isLoading: l3 } = useQuery({
    queryKey: ['analytics-funnel', selectedInstanceId],
    queryFn: () => analyticsApi.getFunnel(selectedInstanceId || undefined),
    refetchInterval: 30_000,
  });
  const { data: daily, isLoading: l4 } = useQuery({
    queryKey: ['analytics-daily', selectedInstanceId],
    queryFn: () => analyticsApi.getDaily(selectedInstanceId || undefined, 7),
    refetchInterval: 60_000,
  });

  if (l1 || l2 || l3 || l4) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  const funnelRows = (funnel && funnel.length > 0) ? funnel : [
    { step: 'Total de Leads',        count: summary?.totalLeads || 0,    percentage: 100 },
    { step: 'Leads Qualificados',    count: summary?.leadsQualified || 0, percentage: summary?.totalLeads ? Math.round((summary.leadsQualified / summary.totalLeads) * 100) : 0 },
    { step: 'Vendas / Conversões',   count: summary?.leadsConverted || 0, percentage: summary?.leadsQualified ? Math.round((summary.leadsConverted / summary.leadsQualified) * 100) : 0 },
  ];

  const funnelColors = [LIME, PURPLE, '#00d4ff'];
  const funnelIcons  = [Users, Target, UserCheck];

  return (
    <PageTransition>
      <div className="space-y-7 pb-20">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Dashboard
              <span className="ml-3 text-sm font-normal" style={{ color: LIME, fontFamily: 'Space Mono, monospace', opacity: 0.7 }}>
                // visão geral
              </span>
            </h1>
            <p className="text-sm mt-1" style={{ color: '#555' }}>
              Monitoramento em tempo real · atualiza a cada 30s
            </p>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <BarChart3 className="w-4 h-4" style={{ color: '#555' }} />
            <select
              value={selectedInstanceId}
              onChange={e => setSelectedInstanceId(e.target.value)}
              className="bg-transparent text-sm text-white outline-none min-w-[180px]"
            >
              <option value="">Todas as Instâncias</option>
              {instances?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Mensagens"         value={summary?.totalMessages || 0}                    icon={MessageCircle} accentTop={LIME}   />
          <KPICard title="Conversas Ativas"  value={summary?.activeConversations || 0}              icon={TrendingUp}    accentTop={PURPLE} />
          <KPICard title="Leads Hoje"        value={summary?.leadsToday || 0}                       icon={UserPlus}      accentTop="#00d4ff" />
          <KPICard title="Taxa de Conversão" value={`${(summary?.conversionRate || 0).toFixed(1)}%`} icon={UserCheck}   accentTop={LIME}   />
        </div>

        {/* ── Funnel + Breakdown ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Funnel */}
          <Card className="lg:col-span-2 p-7">
            <h3 className="font-bold text-white flex items-center gap-2 mb-6">
              <Target className="w-5 h-5" style={{ color: PURPLE }} />
              Funil de Vendas Automático
            </h3>

            <div className="space-y-5">
              {funnelRows.map((item, index) => {
                const FunnelIcon = funnelIcons[index] || Target;
                const maxCount = funnelRows[0]?.count || 1;
                const width = Math.max(4, (item.count / maxCount) * 100);
                const color = funnelColors[index];

                return (
                  <div key={item.step}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FunnelIcon className="w-4 h-4" style={{ color: '#555' }} />
                        <span className="text-sm text-gray-300">{item.step}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: '#555', fontFamily: 'Space Mono, monospace' }}>{item.percentage}%</span>
                        <span className="text-lg font-bold text-white">{item.count}</span>
                      </div>
                    </div>
                    <div
                      className="h-2.5 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.9, delay: index * 0.15 }}
                        className="h-full rounded-full"
                        style={{ background: color, boxShadow: `0 0 10px ${color}55` }}
                      />
                    </div>
                    {index < funnelRows.length - 1 && (
                      <div className="flex justify-center mt-1 mb-1">
                        <ArrowRight className="w-3 h-3 rotate-90" style={{ color: '#333' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom mini stats */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <MiniStat
                label="Tempo Economizado"
                value={`${summary?.timeSavedHours || 0}h`}
                icon={Clock}
                color={LIME}
              />
              <MiniStat
                label="Automação IA"
                value={`${summary?.automationRate || 0}%`}
                icon={Zap}
                color={PURPLE}
              />
            </div>
          </Card>

          {/* Lead breakdown */}
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="font-bold text-white flex items-center gap-2 mb-5">
                <Users className="w-4 h-4" style={{ color: '#555' }} />
                Status dos Leads
              </h3>
              <div className="space-y-2">
                <LeadRow label="Novos"          value={breakdown?.new || 0}          color={LIME}    />
                <LeadRow label="Qualificados"   value={breakdown?.qualified || 0}    color={PURPLE}  />
                <LeadRow label="Convertidos"    value={breakdown?.converted || 0}    color="#00d4ff" />
                <LeadRow label="Desqualificados" value={breakdown?.disqualified || 0} color="#f87171" />
                <div
                  className="flex items-center justify-between pt-3 mt-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="text-xs uppercase tracking-widest" style={{ color: '#555', fontFamily: 'Space Mono, monospace' }}>Total</span>
                  <span className="text-xl font-black text-white">{breakdown?.total || summary?.totalLeads || 0}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6" style={{ border: `1px solid rgba(125,83,255,0.18)`, background: 'rgba(125,83,255,0.05)' }}>
              <h3 className="font-bold text-white mb-1">Automação</h3>
              <p className="text-sm mb-4" style={{ color: '#666' }}>
                IA respondeu{' '}
                <span className="font-bold" style={{ color: PURPLE }}>{summary?.automationRate || 0}%</span>
                {' '}das interações
              </p>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${summary?.automationRate || 0}%` }}
                  transition={{ duration: 1 }}
                  className="h-full rounded-full"
                  style={{ background: PURPLE, boxShadow: `0 0 12px ${PURPLE}66` }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: '#444', fontFamily: 'Space Mono, monospace' }}>
                {(100 - (summary?.automationRate || 0)).toFixed(1)}% atendimento humano
              </p>
            </Card>
          </div>
        </div>

        {/* ── Activity Chart ─────────────────────────────────────── */}
        {daily && daily.length > 0 && (
          <Card className="p-7">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full pulse-dot"
                  style={{ background: LIME, boxShadow: `0 0 6px ${LIME}` }}
                />
                Atividade dos últimos 7 dias
              </h3>
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs" style={{ color: '#555' }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#2a2a2a' }} />
                  Mensagens
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: PURPLE }} />
                  Leads Qualificados
                </span>
              </div>
            </div>

            <div className="flex items-end gap-2" style={{ height: '130px' }}>
              {daily.map((day, idx) => {
                const maxMsgs = Math.max(...daily.map(d => d.messagesSent + d.messagesReceived), 1);
                const maxQual = Math.max(...daily.map(d => d.leadsQualified), 1);
                const total   = day.messagesSent + day.messagesReceived;
                const msgPct  = Math.max(4, (total / maxMsgs) * 100);
                const qualPct = Math.max(0, (day.leadsQualified / maxQual) * 100);
                const label   = new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().slice(0, 3);

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    {/* Count */}
                    <span className="text-[10px] mb-1" style={{ color: '#444', fontFamily: 'Space Mono, monospace' }}>
                      {total > 0 ? total : ''}
                    </span>
                    {/* Bars */}
                    <div className="w-full flex flex-col justify-end gap-1" style={{ height: '100px' }}>
                      {/* Mensagens — gray */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${msgPct}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        className="w-full rounded-t-md"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderBottom: 'none',
                        }}
                      />
                      {/* Leads Qualificados — purple */}
                      {day.leadsQualified > 0 && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${qualPct * 0.3}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.05 + 0.1 }}
                          className="w-full rounded-t-sm"
                          style={{
                            background: PURPLE,
                            boxShadow: `0 -3px 10px ${PURPLE}55`,
                          }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] mt-1" style={{ color: '#444', fontFamily: 'Space Mono, monospace' }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Summary row */}
            <div
              className="flex items-center gap-6 mt-5 pt-4 text-xs"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#555' }}
            >
              <span>
                Total semana:{' '}
                <span className="text-white font-bold">
                  {daily.reduce((s, d) => s + d.messagesSent + d.messagesReceived, 0)}
                </span>
              </span>
              <span>
                Leads qualificados:{' '}
                <span className="font-bold" style={{ color: PURPLE }}>
                  {daily.reduce((s, d) => s + d.leadsQualified, 0)}
                </span>
              </span>
              <span>
                Conversões:{' '}
                <span className="font-bold" style={{ color: LIME }}>
                  {daily.reduce((s, d) => s + d.leadsConverted, 0)}
                </span>
              </span>
            </div>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({ title, value, icon: Icon, accentTop }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  accentTop: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden p-5 group hover:scale-[1.01] transition-transform cursor-default"
      style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: accentTop, boxShadow: `0 0 12px ${accentTop}99` }}
      />
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-widest" style={{ color: '#555', fontFamily: 'Space Mono, monospace' }}>
          {title}
        </p>
        <div
          className="p-2 rounded-lg"
          style={{ background: `${accentTop}12`, border: `1px solid ${accentTop}22` }}
        >
          <Icon className="w-4 h-4" style={{ color: accentTop }} />
        </div>
      </div>
      <p className="text-3xl font-black text-white tracking-tight">{value}</p>
    </motion.div>
  );
}

function MiniStat({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string;
}) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <p className="text-[10px] uppercase tracking-wider flex items-center gap-1 mb-2" style={{ color: '#555', fontFamily: 'Space Mono, monospace' }}>
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
    </div>
  );
}

function LeadRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}88` }} />
        <span className="text-sm" style={{ color: '#aaa' }}>{label}</span>
      </div>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}
